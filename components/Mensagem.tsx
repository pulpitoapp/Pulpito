'use client';
import { useEffect, useRef, useState } from 'react';
import { lerChave, rotuloChave, textoChave } from '@/lib/textos';
import { CORES, ESTILOS, NOME_COR, ROTULO_SITUACAO, SITUACOES, type Conteudo, type Mensagem as Msg, type Pregacao } from '@/lib/tipos';
import { useBiblia } from '@/lib/cliente/bibliaDados';
import { apagarMensagem, apagarPregacao, novoId, salvarMensagem, salvarPregacao, useDados } from '@/lib/cliente/dados';
import { compartilharArquivo, gerarPdf } from '@/lib/cliente/pdf';
import { Cabecalho, Carregando, Confirmar } from './Cabecalho';
import { ir, useApp } from './contexto';
import { AnexosDaMensagem } from './Documentos';
import { Lousa } from './Lousa';
import { SeletorRef } from './SeletorRef';

const dataBR = (d: string) => d.split('-').reverse().join('/');

/** Uma mensagem: título, tema, textos bíblicos usados, texto digitado e folha escrita à mão. */
export function Mensagem({ id }: { id: string }) {
  const { perfil, avisar } = useApp();
  const dados = useDados();
  const pt = useBiblia('blivre');
  const biblia = Array.isArray(pt) ? pt : null;
  const original = dados.mensagens.find((x) => x.id === id);
  const [m, setM] = useState<Msg | null>(null);
  const [estado, setEstado] = useState<'salvo' | 'editando'>('salvo');
  const [aba, setAba] = useState<'digitar' | 'mao'>('digitar');
  const [apagar, setApagar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const tempo = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atual = useRef<Msg | null>(null);

  useEffect(() => { if (original && (!atual.current || atual.current.id !== original.id)) { setM(original); atual.current = original; } }, [original]);
  // ao sair da tela, grava o que estiver pendente
  useEffect(() => () => { if (tempo.current) { clearTimeout(tempo.current); if (atual.current) salvarMensagem(atual.current); } }, []);

  if (!dados.pronto) return <Carregando />;
  if (!original || !m) return (<><Cabecalho titulo="Mensagem" voltar="/mensagens" /><p className="p-8 text-center text-mute">Mensagem não encontrada. Ela pode ter sido apagada ou deixado de ser pública.</p></>);

  const minha = original.autor_id === perfil.id;
  const c = m.conteudo;
  const mudar = (parte: Partial<Msg>) => {
    if (!minha) return;
    const nova = { ...m, ...parte };
    setM(nova); atual.current = nova; setEstado('editando');
    if (tempo.current) clearTimeout(tempo.current);
    tempo.current = setTimeout(() => { tempo.current = null; salvarMensagem(nova); setEstado('salvo'); }, 900);
  };
  const mc = (parte: Partial<Conteudo>) => mudar({ conteudo: { ...c, ...parte } });
  const pregs = minha ? dados.pregacoes.filter((p) => p.mensagem_id === m.id).sort((a, b) => b.data.localeCompare(a.data)) : [];

  function acrescentarRef(chave: string, cor: string) {
    mc({ refs: [...c.refs.filter((x) => x.ref !== chave), { ref: chave, cor }] });
    avisar(`${rotuloChave(chave)} acrescentado`);
  }
  async function pdf() {
    setOcupado(true);
    try {
      const r = await compartilharArquivo(await gerarPdf(m!, biblia), m!.titulo || 'Mensagem');
      if (r === 'baixado') avisar('PDF baixado');
    } catch { avisar('Não foi possível gerar o PDF. Abra o app uma vez com internet e tente de novo.'); }
    finally { setOcupado(false); }
  }

  return (
    <>
      <Cabecalho titulo={minha ? 'Mensagem' : m.titulo || 'Mensagem'} sub={minha ? (estado === 'salvo' ? 'Salva' : 'Salvando…') : m.autor_linha || 'Mensagem pública'} voltar="/mensagens">
        <button type="button" className="btn btn-mini" onClick={pdf} disabled={ocupado}>{ocupado ? '…' : 'PDF'}</button>
      </Cabecalho>
      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-8 pt-3">
        <section className="flex flex-col gap-3">
          <div><label className="rotulo" htmlFor="mTitulo">Título</label>
            <input id="mTitulo" className="campo !text-[21px] font-bold" value={m.titulo} onChange={(e) => mudar({ titulo: e.target.value })} maxLength={200} placeholder="Título da mensagem" readOnly={!minha} /></div>
          <div><label className="rotulo" htmlFor="mTema">Tema</label>
            <input id="mTema" className="campo italic" value={m.tema} onChange={(e) => mudar({ tema: e.target.value })} maxLength={300} placeholder="A ideia central, em uma frase" readOnly={!minha} /></div>
        </section>

        <section aria-label="Textos bíblicos usados">
          <p className="rotulo">Textos usados</p>
          {c.refs.length ? (
            <ul className="m-0 mb-3 flex list-none flex-col gap-2 p-0">
              {c.refs.map((r) => {
                const ref = lerChave(r.ref);
                return (
                  <li key={r.ref} className="cartao !p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <b>{rotuloChave(r.ref)}</b>
                      <span className="flex items-center gap-1.5">
                        {ref ? <button type="button" className="btn btn-mini" onClick={() => ir(`/biblia/${ref.l}/${ref.c}/${ref.v}`)}>Abrir</button> : null}
                        {minha ? <button type="button" className="btn btn-mini btn-perigo" onClick={() => mc({ refs: c.refs.filter((x) => x.ref !== r.ref) })} aria-label={`Remover ${rotuloChave(r.ref)}`}>Tirar</button> : null}
                      </span>
                    </div>
                    <p className="m-0 mt-2 text-[15.5px] leading-relaxed"><span className="rounded px-1 py-0.5" style={{ background: CORES[r.cor] || CORES.am, WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>{textoChave(r.ref, biblia) || '…'}</span></p>
                    {minha ? (
                      <div className="mt-2 flex gap-1.5" role="group" aria-label="Cor do marca-texto">
                        {Object.entries(CORES).map(([k, cor]) => <button key={k} type="button" aria-label={`Marcar em ${NOME_COR[k]}`} aria-pressed={r.cor === k} className="h-6 w-6 rounded-full border-2" style={{ background: cor, borderColor: r.cor === k ? 'var(--ink)' : 'transparent' }} onClick={() => mc({ refs: c.refs.map((x) => (x.ref === r.ref ? { ...x, cor: k } : x)) })} />)}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : <p className="m-0 mb-3 text-[15px] text-mute">Nenhum texto ainda.{minha ? ' Comece a digitar o livro abaixo, ou selecione versículos na Bíblia.' : ''}</p>}
          {minha ? (
            <SeletorRef biblia={biblia} aoEscolher={acrescentarRef} />
          ) : null}
        </section>

        <section aria-label="Mensagem">
          <div className="mb-3 flex gap-2" role="group" aria-label="Como escrever">
            <button type="button" className="chip flex-1" aria-pressed={aba === 'digitar'} onClick={() => setAba('digitar')}>Digitar</button>
            <button type="button" className="chip flex-1" aria-pressed={aba === 'mao'} onClick={() => setAba('mao')}>Escrever à mão{c.tracos.length ? ' •' : ''}</button>
          </div>
          {aba === 'digitar' ? (
            <textarea className="campo" rows={16} value={c.texto} onChange={(e) => mc({ texto: e.target.value })} placeholder="Escreva a mensagem" aria-label="Texto da mensagem" readOnly={!minha} style={{ lineHeight: 1.8 }} />
          ) : (
            <Lousa tracos={c.tracos} altura={c.altura} mudar={minha ? (tracos, altura) => mc({ tracos, altura }) : undefined} leitura={!minha} rotulo="Mensagem escrita à mão" />
          )}
        </section>

        {minha ? (
          <section aria-label="Documentos anexados">
            <p className="rotulo">Documentos anexados</p>
            <AnexosDaMensagem ids={c.docs || []} mudar={(docs) => mc({ docs })} pode={minha} />
          </section>
        ) : null}

        {minha ? (
          <>
            <section className="cartao flex flex-col gap-3">
              <p className="rotulo !mb-0">Situação</p>
              <div className="flex gap-2" role="group" aria-label="Situação">
                {SITUACOES.map((s) => <button key={s} type="button" className="chip flex-1" aria-pressed={m.situacao === s} onClick={() => mudar({ situacao: s })}>{ROTULO_SITUACAO[s]}</button>)}
              </div>
              <p className="rotulo !mb-0">Quem pode ler</p>
              <div className="flex gap-2" role="group" aria-label="Visibilidade">
                <button type="button" className="chip flex-1" aria-pressed={m.visibilidade === 'privada'} onClick={() => mudar({ visibilidade: 'privada' })}>Só eu</button>
                <button type="button" className="chip flex-1" aria-pressed={m.visibilidade === 'publica'} onClick={() => mudar({ visibilidade: 'publica' })}>Todos</button>
              </div>
              <p className="ajuda !mt-0">{m.visibilidade === 'publica' ? 'Todos os usuários do Púlpito podem ler esta mensagem. Só você pode editar ou apagar. Os registros de pregação não aparecem para eles.' : 'Só você vê esta mensagem.'}</p>
            </section>
            <Pregacoes m={m} lista={pregs} igrejaPadrao={perfil.igreja} />
            <button type="button" className="btn btn-perigo self-start" onClick={() => setApagar(true)}>Apagar mensagem</button>
          </>
        ) : null}
      </main>
      {apagar ? <Confirmar titulo="Apagar esta mensagem?" texto={`“${m.titulo || 'Sem título'}” será apagada de vez, com os registros de pregação. Não dá para desfazer.`} acao="Apagar" perigo
        onNao={() => setApagar(false)} onSim={() => { if (tempo.current) { clearTimeout(tempo.current); tempo.current = null; } atual.current = null; apagarMensagem(m.id); avisar('Mensagem apagada'); ir('/mensagens'); }} /> : null}
    </>
  );
}

function Pregacoes({ m, lista, igrejaPadrao }: { m: Msg; lista: Pregacao[]; igrejaPadrao: string }) {
  const { avisar } = useApp();
  const [data, setData] = useState(() => new Date().toLocaleDateString('sv-SE'));
  const [igreja, setIgreja] = useState(igrejaPadrao);
  const [ocasiao, setOcasiao] = useState<string>(ESTILOS[0]);
  function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    salvarPregacao({ id: novoId(), mensagem_id: m.id, autor_id: m.autor_id, data, igreja: igreja.trim(), ocasiao });
    if (m.situacao !== 'pregada') salvarMensagem({ ...m, situacao: 'pregada' });
    avisar('Pregação registrada');
  }
  return (
    <section className="cartao flex flex-col gap-3">
      <p className="rotulo !mb-0">Registro de pregações</p>
      {lista.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {lista.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[15px]">
              <span className="flex-1"><b>{dataBR(p.data)}</b>{p.igreja ? ` · ${p.igreja}` : ''}{p.ocasiao ? ` · ${p.ocasiao}` : ''}</span>
              <button type="button" className="btn btn-mini btn-perigo" onClick={() => apagarPregacao(p.id)} aria-label={`Remover pregação de ${dataBR(p.data)}`}>Tirar</button>
            </li>
          ))}
        </ul>
      ) : <p className="m-0 text-[15px] text-mute">Nenhuma pregação registrada.</p>}
      <form onSubmit={registrar} className="grid gap-2 sm:grid-cols-3">
        <div><label className="rotulo" htmlFor="prData">Data</label><input id="prData" type="date" className="campo" value={data} onChange={(e) => setData(e.target.value)} required /></div>
        <div><label className="rotulo" htmlFor="prIgreja">Igreja</label><input id="prIgreja" className="campo" value={igreja} onChange={(e) => setIgreja(e.target.value)} maxLength={120} /></div>
        <div><label className="rotulo" htmlFor="prOc">Estilo</label><select id="prOc" className="campo" value={ocasiao} onChange={(e) => setOcasiao(e.target.value)}>{ESTILOS.map((o) => <option key={o}>{o}</option>)}</select></div>
        <button type="submit" className="btn sm:col-span-3">+ Registrar que preguei</button>
      </form>
    </section>
  );
}
