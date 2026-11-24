'use client';
import { escolherTema, lerTema, type Tema } from '@/lib/cliente/tema';
import { useState } from 'react';
import { pendentes, sincronizar, useDados } from '@/lib/cliente/dados';
import { supa } from '@/lib/cliente/supabase';
import { Cabecalho, Confirmar } from './Cabecalho';
import { useApp } from './contexto';
import { CamposPerfil } from './Entrar';
import { IcoAdmin, IcoSair } from './Icones';

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
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-8 pt-2">
        <form onSubmit={salvar} className="cartao flex flex-col gap-3">
          <CamposPerfil valor={v} mudar={(m) => setV({ ...v, ...m } as typeof v)} />
          <button type="submit" className="btn btn-pri" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar perfil'}</button>
        </form>

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
