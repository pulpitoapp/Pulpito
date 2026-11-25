'use client';
import { escolherTema, lerTema, type Tema } from '@/lib/cliente/tema';
import { ativarNotificacoes, desativarNotificacoes, inscricaoAtual, precisaInstalarNoIphone, temSuporte } from '@/lib/cliente/notificacoes';
import { useEffect, useState } from 'react';
import { pendentes, sincronizar, useDados } from '@/lib/cliente/dados';
import { supa } from '@/lib/cliente/supabase';
import { Cabecalho, Confirmar } from './Cabecalho';
import { useApp } from './contexto';
import { CamposPerfil } from './Entrar';
import { MiniLeitura } from './Leitura';
import { IcoAdmin, IcoSair } from './Icones';
import { gravarFoto, prepararFoto, useFoto } from '@/lib/cliente/foto';
import { useRef } from 'react';

export function TelaPerfil() {
  const [tema, setTema] = useState<Tema>(() => (typeof window === 'undefined' ? 'claro' : lerTema()));
  const { perfil, atualizarPerfil, avisar, online, sair } = useApp();
  const dados = useDados();
  const [v, setV] = useState({ nome: perfil.nome, cargo: perfil.cargo, igreja: perfil.igreja, cidade: perfil.cidade });
  const [ocupado, setOcupado] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const fila = pendentes(dados);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!online) { avisar('Sem internet: o perfil só pode ser alterado com conexão.'); return; }
    setOcupado(true);
    const mudancas = { ...v, nome: v.nome.trim() };
    const { error } = await supa().from('perfis').update(mudancas).eq('id', perfil.id);
    setOcupado(false);
    if (error) { avisar('Não foi possível salvar.'); return; }
    atualizarPerfil({ ...perfil, ...mudancas });
    avisar('Perfil salvo');
  }

  return (
    <>
      <Cabecalho titulo="Perfil" sub={perfil.email || undefined} />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-8 pt-2 md:max-w-3xl">
        <FotoPerfil />
        <form onSubmit={salvar} className="cartao flex flex-col gap-3">
          <CamposPerfil valor={v} mudar={(m) => setV({ ...v, ...m } as typeof v)} />
          <button type="submit" className="btn btn-pri" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar perfil'}</button>
        </form>

        <MiniLeitura />

        <NotificacaoTextoDoDia />

        <section className="cartao">
          <p className="rotulo">Aparência</p>
          <div className="flex gap-2" role="group" aria-label="Aparência">
            {([['claro', 'Claro'], ['escuro', 'Escuro'], ['auto', 'Automático']] as const).map(([k, n]) => (
              <button key={k} type="button" className="chip chip-justo flex-1" aria-pressed={tema === k} onClick={() => { setTema(k); escolherTema(k); }}>{n}</button>
            ))}
          </div>
          <p className="ajuda">No automático, o app fica escuro quando o celular estiver no modo escuro.</p>
        </section>

        <section className="cartao">
          <p className="rotulo">Instalar no celular</p>
          <p className="m-0 text-[15px]"><b>Android (Chrome):</b> toque nos três pontinhos ⋮ e em “Adicionar à tela inicial”.</p>
          <p className="m-0 mt-1 text-[15px]"><b>iPhone e iPad (Safari):</b> toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p>
          <p className="ajuda">Depois de instalado e aberto uma vez com internet, a Bíblia e as suas mensagens ficam disponíveis sem conexão. As outras versões e as referências cruzadas são guardadas na primeira vez que você as abre.</p>
        </section>

        <section className="cartao">
          <p className="rotulo">Sincronização</p>
          <p className="m-0 text-[15px]">{fila ? `${fila} ${fila === 1 ? 'alteração aguarda' : 'alterações aguardam'} envio.` : 'Tudo sincronizado.'}{dados.ultimoErro ? ` ${dados.ultimoErro}` : ''}</p>
          <button type="button" className="btn btn-mini mt-2" disabled={!online || dados.sincronizando} onClick={() => sincronizar().then(() => avisar('Sincronizado'))}>{dados.sincronizando ? 'Sincronizando…' : 'Sincronizar agora'}</button>
        </section>

        {perfil.papel === 'admin' ? (
          <a href="#/admin" className="cartao flex items-center gap-3 no-underline"><IcoAdmin className="h-6 w-6" /><span><b className="block">Área do administrador</b><span className="text-[14.5px] text-mute">Usuários e apostilas</span></span></a>
        ) : null}

        <p className="m-0 text-center text-[14px] text-mute"><a className="underline" href="#/privacidade">Política de privacidade e créditos</a></p>

        {/* Acesso à conta: fica no fim do menu */}
        <section className="cartao">
          <p className="rotulo">Conta</p>
          <p className="m-0 text-[15px]">Você entrou como <b>{perfil.email || perfil.nome}</b>.</p>
          <p className="ajuda">Ao sair, suas mensagens, notas e marcações continuam guardadas na sua conta e voltam quando você entrar de novo, em qualquer aparelho. A cópia para uso sem internet deste aparelho deixa de ficar acessível até o próximo login.{fila ? ' Atenção: há alterações ainda não enviadas — conecte-se e sincronize antes de sair para não perdê-las.' : ''}</p>
          <button type="button" className="btn btn-perigo mt-3" onClick={() => setConfirmarSaida(true)}><IcoSair className="h-4 w-4" />Sair da conta</button>
        </section>
      </main>
      {confirmarSaida ? (
        <Confirmar titulo="Sair da conta?" acao="Sair" perigo
          texto={fila ? `Há ${fila} alterações não enviadas que podem se perder. Deseja sair mesmo assim?` : 'Você precisará entrar de novo para ver suas mensagens.'}
          onNao={() => setConfirmarSaida(false)} onSim={() => void sair()} />
      ) : null}
    </>
  );
}

/** Ligar/desligar o texto do dia às 8h. */
function NotificacaoTextoDoDia() {
  const { avisar } = useApp();
  const [ligada, setLigada] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { void inscricaoAtual().then((s) => setLigada(!!s)).catch(() => setLigada(false)); }, []);
  const suporte = typeof window !== 'undefined' && temSuporte();
  const instalar = typeof window !== 'undefined' && precisaInstalarNoIphone();
  return (
    <section className="cartao">
      <p className="rotulo">Texto do dia às 8h</p>
      {instalar ? (
        <p className="m-0 text-[15px]">No iPhone, a notificação só funciona com o Púlpito na Tela de Início: no Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Abra o app pelo ícone e volte aqui.</p>
      ) : !suporte ? (
        <p className="m-0 text-[15px] text-mute">Este navegador não aceita notificações.</p>
      ) : (
        <>
          <p className="m-0 text-[15px]">Receba todo dia às 8h (horário de Brasília) um versículo de encorajamento. Ao tocar, abre o texto e os comentários, quando houver.</p>
          <label className="interruptor mt-3">
            <span>{ocupado ? 'Aguarde…' : ligada ? 'Ligada' : 'Desligada'}</span>
            <input type="checkbox" role="switch" checked={!!ligada} disabled={ocupado || ligada === null} aria-label="Notificação do texto do dia" onChange={async () => {
              setOcupado(true);
              try { if (ligada) { await desativarNotificacoes(); setLigada(false); avisar('Notificação desligada'); } else { await ativarNotificacoes(); setLigada(true); avisar('Pronto! Você vai receber o texto do dia às 8h'); } }
              catch (e) { avisar((e as Error).message); } finally { setOcupado(false); }
            }} />
            <i aria-hidden="true" />
          </label>
        </>
      )}
    </section>
  );
}

function FotoPerfil() {
  const { perfil, avisar } = useApp();
  const foto = useFoto(perfil.id);
  const entrada = useRef<HTMLInputElement>(null);
  const iniciais = (perfil.nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <section className="cartao flex items-center gap-4">
      <button type="button" className="avatar avatar-grande" onClick={() => entrada.current?.click()} aria-label={foto ? 'Trocar a foto do perfil' : 'Colocar uma foto no perfil'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {foto ? <img src={foto} alt="" /> : <span>{iniciais}</span>}
      </button>
      <div className="flex flex-1 flex-col gap-2">
        <b className="text-[17px]">{perfil.nome}</b>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-mini" onClick={() => entrada.current?.click()}>{foto ? 'Trocar foto' : 'Colocar foto'}</button>
          {foto ? <button type="button" className="btn btn-mini" onClick={() => { void gravarFoto(perfil.id, ''); avisar('Foto removida'); }}>Tirar foto</button> : null}
        </div>
      </div>
      <input ref={entrada} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        try { await gravarFoto(perfil.id, await prepararFoto(f)); avisar('Foto do perfil salva'); } catch (er) { avisar((er as Error).message); }
      }} />
    </section>
  );
}
