'use client';
import { useCallback, useEffect, useState } from 'react';
import { dividirTrechos, extrairTexto } from '@/lib/acervo';
import { supa } from '@/lib/cliente/supabase';
import { Cabecalho, Carregando, Confirmar } from './Cabecalho';
import { useApp } from './contexto';

type Usuario = { id: string; email: string | null; nome: string; cargo: string; igreja: string; cidade: string; papel: string; bloqueado: boolean; criado_em: string };
type Apostila = { id: string; nome: string; trechos: number; criado_em: string };

/** Área do administrador. Quem garante a restrição são as regras do banco (RLS), não esta tela. */
export function Admin() {
  const { online } = useApp();
  const [aba, setAba] = useState<'apostilas' | 'usuarios'>('apostilas');
  return (
    <>
      <Cabecalho titulo="Administrador" sub="Só você vê esta área" voltar="/perfil" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-8 pt-2 md:max-w-3xl">
        <div className="flex gap-2" role="group" aria-label="Seções do administrador">
          <button type="button" className="chip flex-1" aria-pressed={aba === 'apostilas'} onClick={() => setAba('apostilas')}>Apostilas</button>
          <button type="button" className="chip flex-1" aria-pressed={aba === 'usuarios'} onClick={() => setAba('usuarios')}>Usuários</button>
        </div>
        {!online ? <p className="aviso m-0">Sem internet: a área do administrador precisa de conexão.</p> : aba === 'usuarios' ? <Usuarios /> : <Apostilas />}
      </main>
    </>
  );
}

function Usuarios() {
  const { avisar, perfil } = useApp();
  const [lista, setLista] = useState<Usuario[] | null>(null);
  const [busca, setBusca] = useState('');
  const carregar = useCallback(async () => {
    const { data, error } = await supa().from('perfis').select('id, email, nome, cargo, igreja, cidade, papel, bloqueado, criado_em').order('criado_em', { ascending: false }).limit(2000);
    if (error) avisar('Não foi possível carregar os usuários'); else setLista(data as Usuario[]);
  }, [avisar]);
  useEffect(() => { void carregar(); }, [carregar]);
  if (!lista) return <Carregando />;
  async function alternar(u: Usuario) {
    const { error } = await supa().rpc('admin_bloquear', { alvo: u.id, bloquear: !u.bloqueado });
    if (error) { avisar('Não foi possível alterar o usuário'); return; }
    avisar(u.bloqueado ? 'Usuário liberado' : 'Usuário bloqueado');
    await carregar();
  }
  const q = busca.trim().toLowerCase();
  const filtrada = q ? lista.filter((u) => [u.nome, u.email, u.igreja, u.cidade].join(' ').toLowerCase().includes(q)) : lista;
  return (
    <section className="flex flex-col gap-2">
      <p className="rot m-0">{lista.length} {lista.length === 1 ? 'usuário' : 'usuários'}</p>
      <input className="campo" type="search" placeholder="Buscar por nome, e-mail, igreja…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar usuário" />
      {filtrada.map((u) => (
        <div key={u.id} className="cartao flex flex-wrap items-center gap-3 !p-3.5">
          <span className="flex-1 basis-56">
            <b className="block">{u.nome || '(sem nome)'} {u.papel === 'admin' ? <span className="etiqueta">Admin</span> : null} {u.bloqueado ? <span className="etiqueta" style={{ color: 'var(--red)' }}>Bloqueado</span> : null}</b>
            <span className="block text-[14px] text-mute">{u.email}</span>
            <span className="block text-[14px] text-mute">{[u.cargo, u.igreja, u.cidade].filter(Boolean).join(' · ')}</span>
          </span>
          {u.id !== perfil.id ? <button type="button" className={`btn btn-mini ${u.bloqueado ? '' : 'btn-perigo'}`} onClick={() => alternar(u)}>{u.bloqueado ? 'Liberar' : 'Bloquear'}</button> : null}
        </div>
      ))}
    </section>
  );
}

function Apostilas() {
  const { avisar } = useApp();
  const [lista, setLista] = useState<Apostila[] | null>(null);
  const [andamento, setAndamento] = useState('');
  const [relatorio, setRelatorio] = useState<string[]>([]);
  const [apagar, setApagar] = useState<Apostila | null>(null);
  const carregar = useCallback(async () => {
    const { data, error } = await supa().from('apostilas').select('id, nome, trechos, criado_em').order('criado_em', { ascending: false });
    if (error) avisar('Não foi possível carregar as apostilas'); else setLista(data as Apostila[]);
  }, [avisar]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(e.target.files || [])];
    e.target.value = '';
    const linhas: string[] = [];
    for (const [i, a] of arquivos.entries()) {
      const nome = a.name.replace(/\.[^.]+$/, '');
      setAndamento(`Lendo ${i + 1} de ${arquivos.length}: ${a.name}`);
      try {
        const trechos = dividirTrechos(await extrairTexto(a));
        if (!trechos.length) throw new Error('não há texto para ler (pode ser um PDF escaneado, só imagem)');
        const { data, error } = await supa().from('apostilas').insert({ nome, trechos: trechos.length }).select('id').single();
        if (error || !data) throw new Error('não foi possível gravar');
        for (let k = 0; k < trechos.length; k += 200) {
          setAndamento(`Gravando ${a.name}: ${Math.min(k + 200, trechos.length)} de ${trechos.length} trechos`);
          const r = await supa().from('apostila_trechos').insert(trechos.slice(k, k + 200).map((t) => ({ apostila_id: data.id, ...t })));
          if (r.error) { await supa().from('apostilas').delete().eq('id', data.id); throw new Error('não foi possível gravar os trechos'); }
        }
        linhas.push(`${nome}: ${trechos.length} trechos, ${trechos.filter((t) => t.refs.length).length} com referência bíblica`);
      } catch (err) { linhas.push(`${nome}: ERRO — ${(err as Error).message}`); }
      setRelatorio([...linhas]);
    }
    setAndamento('');
    await carregar();
  }
  if (!lista) return <Carregando />;
  return (
    <section className="flex flex-col gap-3">
      <div className="cartao flex flex-col gap-2">
        <p className="aviso m-0">As apostilas aparecem para todos os usuários, na Bíblia, ao lado dos capítulos que elas citam (botão “Apostilas”). Envie só material que a igreja pode divulgar — não envie livros comerciais.</p>
        <label className={`btn btn-pri cursor-pointer ${andamento ? 'ocupado' : ''}`}>{andamento ? 'Aguarde…' : 'Enviar apostilas'}<input type="file" accept=".pdf,.docx,.txt" multiple hidden onChange={enviar} disabled={!!andamento} /></label>
        {andamento ? <p className="m-0 text-[14px]" role="status">{andamento}</p> : null}
        {relatorio.length ? <ul className="m-0 list-disc pl-5 text-[14px]">{relatorio.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
        <p className="ajuda m-0">Aceita PDF, DOCX e TXT. A leitura é feita neste aparelho, sem limite de tamanho; arquivos grandes demoram alguns minutos. PDF escaneado (só imagem) não tem texto para ler. Arquivos .doc antigos precisam ser salvos como .docx.</p>
      </div>
      {lista.length ? lista.map((a) => (
        <div key={a.id} className="cartao flex items-center gap-3 !p-3.5">
          <span className="flex-1"><b className="block">{a.nome}</b><span className="text-[13.5px] text-mute">{a.trechos} trechos · {new Date(a.criado_em).toLocaleDateString('pt-BR')}</span></span>
          <button type="button" className="btn btn-mini btn-perigo" onClick={() => setApagar(a)}>Apagar</button>
        </div>
      )) : <p className="m-0 text-center text-mute">Nenhuma apostila no acervo.</p>}
      {apagar ? <Confirmar titulo="Apagar esta apostila?" texto={`“${apagar.nome}” e seus ${apagar.trechos} trechos saem do acervo.`} acao="Apagar" perigo onNao={() => setApagar(null)}
        onSim={async () => { await supa().from('apostilas').delete().eq('id', apagar.id); setApagar(null); await carregar(); }} /> : null}
    </section>
  );
}
