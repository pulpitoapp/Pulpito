'use client';
import { useEffect, useRef, useState } from 'react';
import { lerChave, rotuloChave, textoChave } from '@/lib/textos';
import { CORES, ESTILOS, NOME_COR, ROTULO_SITUACAO, SITUACOES, type Conteudo, type Mensagem as Msg, type Pregacao } from '@/lib/tipos';
import { useBiblia } from '@/lib/cliente/bibliaDados';
import { apagarMensagem, apagarPregacao, novoId, salvarMensagem, salvarPregacao, useDados } from '@/lib/cliente/dados';
import { pref } from '@/lib/cliente/local';
import { gravarPreferencia, lerPreferencias } from '@/lib/cliente/preferencias';
import { compartilharArquivo, gerarPdf } from '@/lib/cliente/pdf';
import { Cabecalho, Carregando, Confirmar } from './Cabecalho';
import { definirGuarda, ir, sairSemGuarda, useApp } from './contexto';
import { AnexosDaMensagem, EscolherSalvo } from './Documentos';
import { Painel } from './Paineis';
import { Lousa } from './Lousa';
import { TextoFormatado } from './TextoFormatado';
import { SeletorRef } from './SeletorRef';

const dataBR = (d: string) => d.split('-').reverse().join('/');
/** Mensagem sem nada escrito (nem título, tema, texto, textos bíblicos ou escrita). */
const vazia = (x: Msg | null) => !x || (!x.titulo.trim() && !x.tema.trim() && !x.conteudo.texto.trim() && !x.conteudo.refs.length && !x.conteudo.tracos.length && !(x.conteudo.docs || []).length);

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
  const [editandoTexto, setEditandoTexto] = useState(false);
  const [escrevendo, setEscrevendo] = useState(false);       // o dedo escreve na folha (botão Escrever bordô)
  const [apagar, setApagar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const tempo = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atual = useRef<Msg | null>(null);
  const editou = useRef(false);                 // escreveu algo nesta visita
  const foto = useRef<Msg | null>(null);        // como a mensagem estava ao abrir (para "sair sem salvar")
  const [saida, setSaida] = useState<string | null>(null);   // destino pendente da pergunta de saída
  // escolha de um texto bíblico ou de algo salvo para colocar na folha de escrita
  const [escolha, setEscolha] = useState<{ tipo: 'biblia' | 'salvo'; resolve: (r: { titulo: string; texto: string } | null) => void } | null>(null);

  useEffect(() => { if (original && (!atual.current || atual.current.id !== original.id)) { setM(original); atual.current = original; foto.current = original; } }, [original]);
  // ao sair da tela, grava o que estiver pendente
  useEffect(() => () => { if (tempo.current) { clearTimeout(tempo.current); if (atual.current) salvarMensagem(atual.current); } }, []);
  // ao tentar sair de uma mensagem que está sendo escrita, pergunta o que fazer
  useEffect(() => {
    definirGuarda((destino) => {
      const a = atual.current;
      if (!a || a.autor_id !== perfil.id) return true;
      if (vazia(a)) { if (vazia(foto.current)) apagarMensagem(a.id); return true; }
      if (!editou.current || a.situacao !== 'rascunho') return true;
      setSaida(destino); return false;
    });
    return () => definirGuarda(null);
  }, [perfil.id]);
  // se o app for fechado ou trocar de aba, o que foi escrito fica salvo como rascunho
  useEffect(() => {
    const gravar = () => { if (tempo.current) { clearTimeout(tempo.current); tempo.current = null; } if (atual.current && editou.current) salvarMensagem(atual.current); };
    const visivel = () => { if (document.visibilityState === 'hidden') gravar(); };
    window.addEventListener('pagehide', gravar); document.addEventListener('visibilitychange', visivel);
    return () => { window.removeEventListener('pagehide', gravar); document.removeEventListener('visibilitychange', visivel); };
  }, []);

  if (!dados.pronto) return <Carregando />;
  if (!original || !m) return (<><Cabecalho titulo="Mensagem" voltar="/mensagens" /><p className="p-8 text-center text-mute">Mensagem não encontrada. Ela pode ter sido apagada ou deixado de ser pública.</p></>);

  const minha = original.autor_id === perfil.id;
  const c = m.conteudo;
  const mudar = (parte: Partial<Msg>) => {
    if (!minha) return;
    const nova = { ...m, ...parte };
    setM(nova); atual.current = nova; setEstado('editando'); editou.current = true;
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
      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-8 pt-3 md:max-w-3xl lg:max-w-4xl">
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
            <button type="button" className="chip flex-1" aria-pressed={aba === 'mao'} onClick={() => { if (aba !== 'mao') { setAba('mao'); setEscrevendo(true); } }}>Escrever{c.tracos.length ? ' •' : ''}</button>
          </div>
          {aba === 'digitar' ? (
            <>
              {editandoTexto || !c.texto.trim() ? (
                <textarea className="campo" rows={16} value={c.texto} onChange={(e) => mc({ texto: e.target.value })} placeholder="Escreva a mensagem" aria-label="Texto da mensagem" readOnly={!minha} style={{ lineHeight: 1.8 }}
                  autoFocus={editandoTexto} onFocus={() => setEditandoTexto(true)} onBlur={() => setEditandoTexto(false)} />
              ) : (
                <div className="campo texto-formatado" role={minha ? 'button' : undefined} tabIndex={minha ? 0 : undefined} aria-label={minha ? 'Texto da mensagem (toque para editar)' : 'Texto da mensagem'}
                  onClick={() => minha && setEditandoTexto(true)} onKeyDown={(e) => { if (minha && e.key === 'Enter') setEditandoTexto(true); }}>
                  <TextoFormatado texto={c.texto} />
                </div>
              )}
              {minha ? <p className="ajuda">Dica: *entre asteriscos* fica em <b>negrito</b>; _entre sublinhados_ fica em <i>itálico</i>.</p> : null}
            </>
          ) : (
            <Lousa tracos={c.tracos} altura={c.altura} blocos={c.blocos || []} mudar={minha ? (tracos, altura, blocos) => mc({ tracos, altura, ...(blocos ? { blocos } : {}) }) : undefined} leitura={!minha} rotulo="Mensagem escrita"
              aoInserir={(tipo) => new Promise((resolve) => setEscolha({ tipo, resolve }))} escrevendo={minha ? escrevendo : undefined} setEscrevendo={minha ? setEscrevendo : undefined} />
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
                {SITUACOES.map((s) => <button key={s} type="button" className="chip chip-justo flex-1" aria-pressed={m.situacao === s} onClick={() => mudar({ situacao: s })}>{ROTULO_SITUACAO[s]}</button>)}
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
      {escolha ? (
        <Painel titulo={escolha.tipo === 'biblia' ? 'Texto da Bíblia' : 'Algo que salvei'} sub="Colocar na folha" fechar={() => { escolha.resolve(null); setEscolha(null); }}>
          {escolha.tipo === 'biblia' ? (
            <SeletorRef id="refBuscaFolha" biblia={biblia} aoEscolher={(chave) => { const t = textoChave(chave, biblia) || ''; escolha.resolve({ titulo: rotuloChave(chave), texto: t }); setEscolha(null); }} />
          ) : <EscolherSalvo aoEscolher={(r) => { escolha.resolve(r); setEscolha(null); }} />}
        </Painel>
      ) : null}
      {saida ? (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Sair da mensagem">
          <div className="cartao w-full max-w-sm">
            <h2 className="tit">Sair da mensagem?</h2>
            <p className="my-3 text-[15px]">“{m.titulo || 'Sem título'}” ainda está em rascunho. O que você quer fazer?</p>
            <div className="flex flex-col gap-2">
              <button type="button" className="btn btn-pri" onClick={() => { const d = saida; const nova = { ...m, situacao: 'pronta' as const }; if (tempo.current) clearTimeout(tempo.current); salvarMensagem(nova); setSaida(null); avisar('Mensagem salva como pronta'); sairSemGuarda(d); }}>Salvar como pronta</button>
              <button type="button" className="btn" onClick={() => { const d = saida; if (tempo.current) clearTimeout(tempo.current); salvarMensagem(m); setSaida(null); avisar('Rascunho salvo'); sairSemGuarda(d); }}>Salvar rascunho</button>
              <button type="button" className="btn btn-perigo" onClick={() => { const d = saida; if (tempo.current) { clearTimeout(tempo.current); tempo.current = null; } const f = foto.current; if (!f || vazia(f)) apagarMensagem(m.id); else salvarMensagem(f); atual.current = null; setSaida(null); sairSemGuarda(d); }}>Sair sem salvar</button>
              <button type="button" className="btn" onClick={() => setSaida(null)}>Continuar escrevendo</button>
            </div>
          </div>
        </div>
      ) : null}
      {apagar ? <Confirmar titulo="Apagar esta mensagem?" texto={`“${m.titulo || 'Sem título'}” será apagada de vez, com os registros de pregação. Não dá para desfazer.`} acao="Apagar" perigo
        onNao={() => setApagar(false)} onSim={() => { if (tempo.current) { clearTimeout(tempo.current); tempo.current = null; } atual.current = null; apagarMensagem(m.id); avisar('Mensagem apagada'); ir('/mensagens'); }} /> : null}
    </>
  );
}

function Pregacoes({ m, lista, igrejaPadrao }: { m: Msg; lista: Pregacao[]; igrejaPadrao: string }) {
  const { avisar } = useApp();
  const [data, setData] = useState(() => new Date().toLocaleDateString('sv-SE'));
  const [igreja, setIgreja] = useState(igrejaPadrao);
  const [estilos, setEstilos] = useState<string[]>(() => pref.ler('estilos', [...ESTILOS]));
  const [ocasiao, setOcasiao] = useState<string>(() => pref.ler<string[]>('estilos', [...ESTILOS])[0] || '');
  const [editarEstilos, setEditarEstilos] = useState(false);
  const [novoEstilo, setNovoEstilo] = useState('');
  const gravarEstilos = (l: string[]) => { setEstilos(l); pref.gravar('estilos', l); void gravarPreferencia(m.autor_id, 'estilos', l); if (!l.includes(ocasiao)) setOcasiao(l[0] || ''); };
  // a lista de estilos fica na conta: vale em qualquer aparelho
  useEffect(() => {
    let vivo = true;
    void lerPreferencias(m.autor_id).then((d) => {
      const l = d.estilos as string[] | undefined;
      if (vivo && Array.isArray(l) && l.length) { setEstilos(l); pref.gravar('estilos', l); setOcasiao((o) => (l.includes(o) ? o : l[0])); }
    });
    return () => { vivo = false; };
  }, [m.autor_id]);
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
        <div><label className="rotulo" htmlFor="prOc">Estilo</label><select id="prOc" className="campo" value={ocasiao} onChange={(e) => setOcasiao(e.target.value)}>{estilos.map((o) => <option key={o}>{o}</option>)}</select>
          <button type="button" className="ajuda !mt-1 underline" onClick={() => setEditarEstilos(!editarEstilos)}>{editarEstilos ? 'Fechar a edição dos estilos' : 'Editar os estilos'}</button></div>
        {editarEstilos ? (
          <div className="rounded-xl border border-line p-3 sm:col-span-3">
            <p className="rotulo !mt-0">Seus estilos</p>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {estilos.map((e) => <li key={e} className="etiqueta inline-flex items-center gap-1.5">{e}<button type="button" aria-label={`Apagar o estilo ${e}`} className="font-bold text-red" onClick={() => gravarEstilos(estilos.filter((x) => x !== e))}>×</button></li>)}
            </ul>
            <div className="mt-2 flex gap-2">
              <input className="campo flex-1" value={novoEstilo} maxLength={40} placeholder="Novo estilo" aria-label="Novo estilo" onChange={(e) => setNovoEstilo(e.target.value)} />
              <button type="button" className="btn btn-mini" onClick={() => { const t = novoEstilo.trim(); if (t && !estilos.includes(t)) gravarEstilos([...estilos, t]); setNovoEstilo(''); }}>Acrescentar</button>
            </div>
            <button type="button" className="ajuda underline" onClick={() => gravarEstilos([...ESTILOS])}>Voltar aos estilos de fábrica</button>
          </div>
        ) : null}
        <button type="submit" className="btn sm:col-span-3">+ Registrar que preguei</button>
      </form>
    </section>
  );
}
