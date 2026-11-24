'use client';
import { useState } from 'react';
import { LIVROS } from '@/lib/biblia';
import { versaoPorId, VERSOES } from '@/lib/versoes';
import { novaMensagem, pendentes, salvarMensagem, useDados } from '@/lib/cliente/dados';
import { pref } from '@/lib/cliente/local';
import { ir, useApp } from './contexto';
import { Logo } from './Logo';

function saudacao(h: number) { return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

/** Página inicial: a Bíblia em primeiro lugar (com a escolha da versão) e os atalhos. */
export function Inicio() {
  const { perfil } = useApp();
  const dados = useDados();
  const [versao, setVersao] = useState<string>(() => pref.ler('biblia-versao', 'blivre'));
  const [pos] = useState<{ l: number; c: number }>(() => pref.ler('biblia-pos', { l: 42, c: 0 }));
  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const primeiro = perfil.nome.trim().split(/\s+/)[0];
  const minhas = dados.mensagens.filter((m) => m.autor_id === perfil.id);
  const fila = pendentes(dados);
  // rascunhos com algo escrito (as mensagens vazias não contam)
  const temAlgo = (m: (typeof minhas)[number]) => !!(m.titulo.trim() || m.tema.trim() || m.conteudo.texto.trim() || m.conteudo.refs.length || m.conteudo.tracos.length);
  const rascunhos = minhas.filter((m) => m.situacao === 'rascunho' && temAlgo(m));
  const escolher = (id: string) => { setVersao(id); pref.gravar('biblia-versao', id); };
  const nova = () => { const m = novaMensagem(perfil.id); salvarMensagem(m); ir(`/mensagens/${m.id}`); };

  return (
    <>
    <header className="topo px-5 pb-9" style={{ paddingTop: 'max(28px, env(safe-area-inset-top))' }}>
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <p className="m-0"><Logo tamanho={26} /></p>
        <h1 className="mt-5 text-[26px]">{saudacao(agora.getHours())}{primeiro ? `, ${primeiro}` : ''}.</h1>
        <p className="rot m-0 mt-2 first-letter:uppercase">{data}</p>
      </div>
    </header>
    <main className="inicio-grade mx-auto -mt-5 max-w-2xl px-5 pb-8 lg:max-w-5xl">

      {!minhas.some(temAlgo) && dados.pronto ? (
        <section className="destaque-vidro" aria-label="Primeira mensagem">
          <span className="destaque-brilho" aria-hidden="true" />
          <p className="rot m-0 !text-ouro">Comece por aqui</p>
          <h2 className="destaque-tit">Crie sua primeira mensagem</h2>
          <ol className="destaque-passos">
            <li><b>1</b>Dê um título e o tema</li>
            <li><b>2</b>Escolha os textos bíblicos</li>
            <li><b>3</b>Digite ou escreva com a caneta</li>
          </ol>
          <button type="button" className="destaque-btn" onClick={nova}>Criar minha primeira mensagem <span aria-hidden="true">→</span></button>
        </section>
      ) : null}
      {rascunhos.length ? (
        <section className="destaque-vidro destaque-claro" aria-label="Mensagens para concluir">
          <p className="rot m-0">{rascunhos.length === 1 ? 'Falta pouco · mensagem para concluir' : `Falta pouco · ${rascunhos.length} mensagens para concluir`}</p>
          {rascunhos.slice(0, 3).map((m) => (
            <a key={m.id} href={`#/mensagens/${m.id}`} className="destaque-item">
              <span className="flex-1"><b className="block text-[17px] leading-tight">{m.titulo || 'Sem título'}</b><span className="text-[13.5px] text-mute">Rascunho · {new Date(m.atualizado_em).toLocaleDateString('pt-BR')}</span></span>
              <span className="destaque-seta" aria-hidden="true">→</span>
            </a>
          ))}
        </section>
      ) : null}

      <section className="cartao" aria-label="Bíblia">
        <p className="rot m-0">Bíblia</p>
        <h2 className="tit mt-1 !text-[34px]">{LIVROS[pos.l]} {pos.c + 1}</h2>
        <label className="rotulo mt-4" htmlFor="iVersao">Qual Bíblia ler</label>
        <select id="iVersao" className="campo" value={versao} onChange={(e) => escolher(e.target.value)}>{VERSOES.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}</select>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href="#/biblia" className="btn btn-pri no-underline">Continuar</a>
          <a href="#/biblia/0/0" className="btn no-underline">Do início</a>
        </div>
        <p className="ajuda">{versaoPorId(versao).credito}</p>
      </section>

      <section className="cartao" aria-label="Mensagens">
        <p className="rot m-0">Mensagens</p>
        <h2 className="tit mt-1">{(() => { const n = minhas.filter(temAlgo).length; return n ? `${n} ${n === 1 ? 'mensagem' : 'mensagens'}` : 'Nenhuma ainda'; })()}</h2>
        {minhas.filter(temAlgo).slice(0, 3).map((m) => (
          <a key={m.id} href={`#/mensagens/${m.id}`} className="mt-2 block rounded-xl border border-line px-3 py-2 no-underline">
            <b className="block leading-tight">{m.titulo || 'Sem título'}</b>{m.tema ? <span className="text-[14px] italic text-mute">{m.tema}</span> : null}
          </a>
        ))}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-pri" onClick={nova}>Nova mensagem</button>
          <a href="#/mensagens" className="btn no-underline">Ver e buscar</a>
        </div>
      </section>

      {fila ? <p className="aviso m-0">{fila} {fila === 1 ? 'alteração aguardando' : 'alterações aguardando'} internet para sincronizar.</p> : null}
    </main>
    </>
  );
}
