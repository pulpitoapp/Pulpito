'use client';
import { useMemo, useState } from 'react';
import { limparVerso, LIVROS, norm } from '@/lib/biblia';
import { useBiblia } from '@/lib/cliente/bibliaDados';
import { rotuloChave } from '@/lib/textos';
import { CORES, ROTULO_SITUACAO, SITUACOES, type Mensagem } from '@/lib/tipos';
import { novaMensagem, salvarMensagem, useDados } from '@/lib/cliente/dados';
import { pref } from '@/lib/cliente/local';
import { Cabecalho, Carregando } from './Cabecalho';
import { ir, useApp } from './contexto';
import { AbasMensagens } from './Documentos';
import { IcoCadeado, IcoGlobo } from './Icones';

const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

/** Trecho do texto em volta da palavra buscada. */
function trecho(texto: string, q: string): string {
  const i = norm(texto).indexOf(q);
  if (i < 0 || !q) return '';
  const ini = Math.max(0, i - 50), fim = Math.min(texto.length, i + q.length + 70);
  return (ini > 0 ? '…' : '') + texto.slice(ini, fim).replace(/\s+/g, ' ') + (fim < texto.length ? '…' : '');
}

/** Lista de mensagens: busca por palavra, filtro por série e por situação. */
export function Mensagens() {
  const { perfil } = useApp();
  const dados = useDados();
  const [quais, setQuais] = useState<'minhas' | 'publicas'>(() => pref.ler('lista-quais', 'minhas'));
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');

  const base = useMemo(() => dados.mensagens.filter((m) => (quais === 'minhas' ? m.autor_id === perfil.id : m.autor_id !== perfil.id && m.visibilidade === 'publica')), [dados.mensagens, quais, perfil.id]);
  const q = norm(busca.trim());
  const lista = useMemo(() => base.filter((m) => {
    if (situacao && m.situacao !== situacao) return false;
    if (!q) return true;
    return norm([m.titulo, m.tema, m.autor_linha, m.conteudo.texto, m.conteudo.refs.map((r) => rotuloChave(r.ref)).join(' ')].join(' ')).includes(q);
  }).sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em)), [base, q, situacao]);

  function criar() {
    const m = novaMensagem(perfil.id);
    salvarMensagem(m);
    ir(`/mensagens/${m.id}`);
  }

  return (
    <>
      <Cabecalho titulo="Mensagens" sub={`${lista.length} ${lista.length === 1 ? 'mensagem' : 'mensagens'}`} />
      <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-6 pt-2 lg:max-w-5xl">
        <AbasMensagens atual="mensagens" />
        <input className="campo" type="search" placeholder="Buscar por palavra, título, tema ou texto bíblico" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar mensagens" />
        <div className="flex gap-2" role="group" aria-label="Quais mensagens">
          {(['minhas', 'publicas'] as const).map((k) => (
            <button key={k} type="button" className="chip flex-1" aria-pressed={quais === k} onClick={() => { setQuais(k); pref.gravar('lista-quais', k); }}>{k === 'minhas' ? 'Minhas' : 'Públicas'}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <select className="campo" value={situacao} onChange={(e) => setSituacao(e.target.value)} aria-label="Filtrar por situação">
            <option value="">Todas as situações</option>{SITUACOES.map((s) => <option key={s} value={s}>{ROTULO_SITUACAO[s]}</option>)}
          </select>
        </div>
        {!dados.pronto ? <Carregando /> : !lista.length ? (
          <div className="cartao text-center">
            <p className="m-0 text-mute">{base.length ? 'Nenhuma mensagem com essa busca.' : quais === 'minhas' ? 'Você ainda não tem mensagens.' : 'Ainda não há mensagens públicas de outros pregadores.'}</p>
            {quais === 'minhas' && !base.length ? <button type="button" className="btn btn-pri mt-3" onClick={criar}>Escrever a primeira</button> : null}
          </div>
        ) : (
          <ol className="m-0 grid list-none grid-cols-1 gap-2 p-0 lg:grid-cols-2">
            {lista.map((m) => <Item key={m.id} m={m} minha={m.autor_id === perfil.id} pendente={dados.fila.salvar.includes(m.id)} q={q} />)}
          </ol>
        )}
        <p className="ajuda text-center">A busca encontra o que foi digitado. O que foi escrito à mão não entra na busca.</p>
      </main>
    </>
  );
}

function Item({ m, minha, pendente, q }: { m: Mensagem; minha: boolean; pendente: boolean; q: string }) {
  const achado = q ? trecho(m.conteudo.texto, q) : '';
  return (
    <li>
      <a href={`#/mensagens/${m.id}`} className="cartao block no-underline">
        <b className="block text-[19px] leading-tight">{m.titulo || 'Sem título'}</b>
        {m.tema ? <span className="block text-[14.5px] italic text-mute">{m.tema}</span> : null}
        {achado ? <span className="mt-1 block text-[14px]">{achado}</span> : null}
        {m.conteudo.refs.length ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {m.conteudo.refs.slice(0, 6).map((r) => <span key={r.ref} className="rounded px-1.5 py-0.5 text-[12.5px]" style={{ background: CORES[r.cor] || CORES.am }}>{rotuloChave(r.ref)}</span>)}
          </span>
        ) : null}
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="etiqueta">{ROTULO_SITUACAO[m.situacao]}</span>
          <span className="etiqueta inline-flex items-center gap-1">{m.visibilidade === 'publica' ? <IcoGlobo className="h-3 w-3" /> : <IcoCadeado className="h-3 w-3" />}{m.visibilidade === 'publica' ? 'Pública' : 'Privada'}</span>
          {m.conteudo.tracos.length ? <span className="etiqueta">À mão</span> : null}
          {pendente ? <span className="etiqueta">Aguardando envio</span> : null}
          <span className="rot !tracking-normal">{minha ? dataBR(m.atualizado_em) : m.autor_linha || 'Autor não informado'}</span>
        </span>
      </a>
    </li>
  );
}

/** Textos da Bíblia com marcação (cor) e/ou anotação, um por versículo; toque abre o versículo. */
export function Marcacoes() {
  const dados = useDados();
  const pt = useBiblia('blivre');
  const [filtro, setFiltro] = useState<'todos' | 'marcados' | 'anotados'>('todos');
  const lista = useMemo(() => {
    const refs = new Set([...Object.keys(dados.destaques), ...Object.keys(dados.notas)]);
    return [...refs].map((r) => { const [l, c, v] = r.split('.').map(Number); return { r, l, c, v, cor: dados.destaques[r], nota: dados.notas[r] }; })
      .filter((x) => (filtro === 'marcados' ? x.cor : filtro === 'anotados' ? x.nota : true))
      .sort((a, b) => a.l - b.l || a.c - b.c || a.v - b.v);
  }, [dados.destaques, dados.notas, filtro]);
  return (
    <>
      <Cabecalho titulo="Marcações" sub={`${lista.length} ${lista.length === 1 ? 'texto' : 'textos'}`} />
      <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-6 pt-2 lg:max-w-5xl">
        <AbasMensagens atual="marcacoes" />
        <div className="flex gap-2" role="group" aria-label="Quais textos">
          {([['todos', 'Todos'], ['marcados', 'Marcados'], ['anotados', 'Com anotação']] as const).map(([k, t]) => (
            <button key={k} type="button" className="chip flex-1 !px-2" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>
          ))}
        </div>
        {!lista.length ? <p className="cartao m-0 text-[15px] text-mute">Nenhum texto ainda. Na Bíblia, toque num versículo e use “Marcar” ou “Anotar”.</p> : null}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {lista.map((x) => {
            const t = Array.isArray(pt) ? limparVerso(pt[x.l]?.[2]?.[x.c]?.[x.v - 1] || '') : '';
            return (
              <li key={x.r}>
                <button type="button" className="cartao block w-full text-left" onClick={() => ir(`/biblia/${x.l}/${x.c}/${x.v}`)}>
                  <span className="flex items-center gap-2">
                    {x.cor ? <span className="h-3.5 w-3.5 flex-none rounded-full" style={{ background: CORES[x.cor] }} aria-label="Marcado" /> : null}
                    <b className="text-[16px]">{LIVROS[x.l]} {x.c + 1}:{x.v}</b>
                    {x.nota ? <span className="etiqueta ml-auto">{x.nota.texto.trim() ? 'Anotação' : 'Nota à mão'}</span> : null}
                  </span>
                  {t ? <span className="mt-1 block text-[15px] leading-relaxed" style={x.cor ? { background: CORES[x.cor], borderRadius: 4 } : undefined}>{t}</span> : null}
                  {x.nota?.texto.trim() ? <span className="mt-2 block border-l-2 border-ouro pl-3 text-[15px] italic text-mute">{x.nota.texto.length > 220 ? x.nota.texto.slice(0, 217) + '…' : x.nota.texto}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
