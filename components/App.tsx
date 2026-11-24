'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Perfil } from '@/lib/tipos';
import { BASE } from '@/lib/cliente/bibliaDados';
import { iniciarDados, limparDados, novaMensagem, salvarMensagem, sincronizar } from '@/lib/cliente/dados';
import { pref } from '@/lib/cliente/local';
import { semSupabase, supa } from '@/lib/cliente/supabase';
import { AppCtx, ir } from './contexto';
import { Carregando } from './Cabecalho';
import { IcoBiblia, IcoInicio, IcoMais, IcoMensagens, IcoPerfil } from './Icones';
import { CompletarPerfil, Entrar, NovaSenha } from './Entrar';
import { Inicio } from './Inicio';
import { Mensagens } from './Mensagens';
import { DocumentoTela, Documentos } from './Documentos';
import { Mensagem } from './Mensagem';
import { Biblia } from './Biblia';
import { TelaPerfil } from './TelaPerfil';
import { Admin } from './Admin';
import { Privacidade } from './Privacidade';

// Endereços do app começam por "#/". Qualquer outro trecho depois do # (como o aviso de erro
// que o Supabase acrescenta quando um link de e-mail venceu) é ignorado.
const lerRota = () => { const h = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, ''); return h.startsWith('/') ? h : '/'; };

export function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [online, setOnline] = useState(true);
  const [rota, setRota] = useState('/');
  const [toast, setToast] = useState('');
  const [novaSenha, setNovaSenha] = useState(false);
  const tempo = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avisar = useCallback((texto: string) => {
    setToast(texto);
    if (tempo.current) clearTimeout(tempo.current);
    tempo.current = setTimeout(() => setToast(''), 3200);
  }, []);

  // rota (endereço depois do #), rede e service worker
  useEffect(() => {
    const aoMudar = () => { setRota(lerRota()); window.scrollTo(0, 0); };
    const rede = () => { setOnline(navigator.onLine); if (navigator.onLine) void sincronizar(); };
    setRota(lerRota());
    setOnline(navigator.onLine);
    window.addEventListener('hashchange', aoMudar);
    window.addEventListener('online', rede);
    window.addEventListener('offline', rede);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register(`${BASE}/sw.js`).then(() => navigator.serviceWorker.ready).then((reg) => {
        // avisa o service worker dos arquivos já carregados, para ele guardar para uso offline
        const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin + BASE + '/'));
        reg.active?.postMessage({ tipo: 'guardar', urls });
      }).catch(() => {});
    }
    return () => { window.removeEventListener('hashchange', aoMudar); window.removeEventListener('online', rede); window.removeEventListener('offline', rede); };
  }, []);

  // sessão de login
  useEffect(() => {
    if (semSupabase) return;
    supa().auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supa().auth.onAuthStateChange((evento, s) => { setSessao(s); if (evento === 'PASSWORD_RECOVERY') setNovaSenha(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  // perfil: busca no servidor; sem internet, usa a cópia do aparelho
  const uid = sessao?.user.id;
  useEffect(() => {
    if (sessao === undefined) return;
    const guardado = pref.ler<Perfil | null>('perfil', null);
    if (!uid) {
      // sem sessão válida: só segue em modo offline se já havia alguém logado neste aparelho
      if (!navigator.onLine && guardado) { setPerfil(guardado); void iniciarDados(guardado.id); } else setPerfil(null);
      return;
    }
    let vivo = true;
    if (guardado?.id === uid) setPerfil(guardado);
    void iniciarDados(uid);
    supa().from('perfis').select('*').eq('id', uid).maybeSingle().then(({ data }) => {
      if (vivo && data) { setPerfil(data as Perfil); pref.gravar('perfil', data); }
    });
    return () => { vivo = false; };
  }, [uid, sessao]);

  const sair = useCallback(async () => {
    await supa().auth.signOut().catch(() => {});
    pref.gravar('perfil', null);
    limparDados();
    setPerfil(null);
    ir('/');
  }, []);
  const atualizarPerfil = useCallback((p: Perfil) => { setPerfil(p); pref.gravar('perfil', p); }, []);

  if (semSupabase) return <SemConfiguracao />;
  if (sessao === undefined) return <Carregando />;
  if (!sessao && !perfil) return rota === '/privacidade' ? <Privacidade publico /> : <Entrar />;
  if (!perfil) return <Carregando texto="Carregando seu perfil…" />;

  const ctx = { perfil, online, avisar, atualizarPerfil, sair };
  let tela: React.ReactNode;
  if (perfil.bloqueado) tela = <Bloqueado />;
  else if (novaSenha) tela = <NovaSenha aoConcluir={() => { setNovaSenha(false); avisar('Pronto'); }} />;
  else if (rota === '/privacidade') tela = <Privacidade />;
  else if (!perfil.aceite_privacidade) tela = <CompletarPerfil />;
  else {
    const partes = rota.split('/').filter(Boolean);
    const [modulo, a] = partes;
    if (modulo === 'mensagens' && a) tela = <Mensagem key={a} id={a} />;
    else if (modulo === 'mensagens') tela = <Mensagens />;
    else if (modulo === 'documentos' && a) tela = <DocumentoTela key={a} id={a} />;
    else if (modulo === 'documentos') tela = <Documentos />;
    else if (modulo === 'biblia') tela = <Biblia alvo={partes.slice(1).map(Number)} />;
    else if (modulo === 'perfil') tela = <TelaPerfil />;
    else if (modulo === 'admin') tela = perfil.papel === 'admin' ? <Admin /> : <Inicio />;
    else tela = <Inicio />;
  }
  const aba = '/' + (rota.split('/')[1] || '');
  const mostrarAbas = !perfil.bloqueado && !novaSenha && !!perfil.aceite_privacidade;

  return (
    <AppCtx.Provider value={ctx}>
      {!online ? (
        <p className="rot sticky top-0 z-40 m-0 bg-escuro px-3 py-2 text-center !text-[#fdf5df] !tracking-[.1em]" role="status">
          Sem internet — a Bíblia e as suas mensagens continuam disponíveis
        </p>
      ) : null}
      <div className="min-h-dvh pb-[88px]">{tela}</div>
      {mostrarAbas ? (
        <nav className="abas" aria-label="Navegação principal">
          <a href="#/" aria-current={aba === '/' ? 'page' : undefined}><IcoInicio />Início</a>
          <a href="#/biblia" aria-current={aba === '/biblia' ? 'page' : undefined}><IcoBiblia />Bíblia</a>
          <a href="#/mensagens" onClick={(e) => { e.preventDefault(); const m = novaMensagem(perfil.id); salvarMensagem(m); ir(`/mensagens/${m.id}`); }} aria-label="Nova mensagem"><span className="fab"><IcoMais /></span>Nova</a>
          <a href="#/mensagens" aria-current={aba === '/mensagens' || aba === '/documentos' ? 'page' : undefined}><IcoMensagens />Mensagens</a>
          <a href="#/perfil" aria-current={aba === '/perfil' || aba === '/admin' ? 'page' : undefined}><IcoPerfil />Perfil</a>
        </nav>
      ) : null}
      {toast ? (
        <div role="status" className="rot fixed bottom-[100px] left-1/2 z-[60] max-w-[92vw] -translate-x-1/2 rounded-full bg-escuro px-5 py-3 text-center !text-[#fdf5df] !tracking-[.1em] shadow-lg">{toast}</div>
      ) : null}
    </AppCtx.Provider>
  );
}

function Bloqueado() {
  return (
    <main className="mx-auto max-w-md p-6 pt-16 text-center">
      <h1 className="text-3xl">Acesso bloqueado</h1>
      <p className="mt-3">O administrador bloqueou o seu acesso ao Púlpito. Se achar que foi um engano, fale com ele.</p>
      <button type="button" className="btn mt-4" onClick={() => supa().auth.signOut().then(() => location.reload())}>Sair</button>
    </main>
  );
}

function SemConfiguracao() {
  return (
    <main className="mx-auto max-w-lg p-6 pt-16">
      <h1 className="text-3xl">Púlpito</h1>
      <p className="mt-3">Falta configurar o Supabase. Crie o arquivo <code>.env.local</code> na pasta do projeto com as variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e reinicie. O passo a passo está no <code>README.md</code>.</p>
    </main>
  );
}
