'use client';
// "Meus documentos": comentários e comparações salvos, organizados em pastas.
// Só a própria pessoa vê. O PDF é gerado na hora (não ocupa espaço) e pode ir para o Google Drive dela.
import { useEffect, useMemo, useRef, useState } from 'react';
import { norm } from '@/lib/biblia';
import {
  alterarDocumento, apagarDocumento, apagarPasta, criarPasta, iniciarDocumentos, renomearPasta, salvarDocumento, useDocumentos,
  type ConteudoDoc, type Documento,
} from '@/lib/cliente/documentos';
import { pref } from '@/lib/cliente/local';
import { Cabecalho, Carregando, Confirmar } from './Cabecalho';
import { arquivoPdf, Balao, compartilharPdf, OBRAS, Secoes, type Ref } from './Comentarios';
import { ir, useApp } from './contexto';
import { IcoCompartilhar } from './Icones';

const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const TIPO: Record<string, string> = { comentario: 'Comentário', comparacao: 'Comparação', anotacao: 'Anotação' };

function useIniciar() {
  const { perfil } = useApp();
  useEffect(() => { void iniciarDocumentos(perfil.id); }, [perfil.id]);
  return useDocumentos();
}

/** Abas no topo da lista: Mensagens | Meus documentos. */
export function AbasMensagens({ atual }: { atual: 'mensagens' | 'documentos' }) {
  return (
    <div className="flex gap-2" role="group" aria-label="Mensagens ou documentos">
      <button type="button" className="chip flex-1" aria-pressed={atual === 'mensagens'} onClick={() => ir('/mensagens')}>Mensagens</button>
      <button type="button" className="chip flex-1" aria-pressed={atual === 'documentos'} onClick={() => ir('/documentos')}>Meus documentos</button>
    </div>
  );
}

/** Escolher a pasta (com opção de criar uma nova). */
function EscolherPasta({ valor, mudar }: { valor: string; mudar: (id: string) => void }) {
  const { avisar } = useApp();
  const d = useDocumentos();
  const [nova, setNova] = useState<string | null>(null);
  if (nova !== null) {
    return (
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!nova.trim()) return; try { const p = await criarPasta(nova); mudar(p.id); setNova(null); } catch (er) { avisar((er as Error).message); } }}>
        <input className="campo flex-1" autoFocus maxLength={80} placeholder="Nome da pasta" value={nova} onChange={(e) => setNova(e.target.value)} aria-label="Nome da nova pasta" />
        <button type="submit" className="btn btn-pri btn-mini">Criar</button>
        <button type="button" className="btn btn-mini" onClick={() => setNova(null)}>Cancelar</button>
      </form>
    );
  }
  return (
    <select className="campo" value={valor} aria-label="Pasta" onChange={(e) => (e.target.value === '+' ? setNova('') : mudar(e.target.value))}>
      <option value="">Sem pasta</option>
      {d.pastas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      <option value="+">+ Nova pasta…</option>
    </select>
  );
}

/** Botão "Salvar em Meus documentos" usado nos comentários. */
export function SalvarEmDocumentos({ titulo, tipo, conteudo }: { titulo: string; tipo: Documento['tipo']; conteudo: ConteudoDoc }) {
  const { perfil, avisar } = useApp();
  const [aberto, setAberto] = useState(false);
  const [pasta, setPasta] = useState<string>(() => pref.ler('docs-ultima-pasta', ''));
  const [salvo, setSalvo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (aberto) void iniciarDocumentos(perfil.id); }, [aberto, perfil.id]);
  if (salvo) return <button type="button" className="btn mt-2 w-full" onClick={() => ir(`/documentos/${salvo}`)}>Salvo ✓ · Abrir em Meus documentos</button>;
  if (!aberto) return <button type="button" className="btn mt-2 w-full" onClick={() => setAberto(true)}>Salvar em Meus documentos</button>;
  return (
    <div className="cartao mt-2 !p-3">
      <p className="rot m-0 mb-2">Salvar em qual pasta?</p>
      <EscolherPasta valor={pasta} mudar={setPasta} />
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn flex-1" onClick={() => setAberto(false)}>Cancelar</button>
        <button type="button" className="btn btn-pri flex-1" disabled={ocupado} onClick={async () => {
          setOcupado(true);
          try { const doc = await salvarDocumento({ titulo, tipo, conteudo, pasta_id: pasta || null }); pref.gravar('docs-ultima-pasta', pasta); setSalvo(doc.id); avisar('Salvo em Meus documentos'); }
          catch (e) { avisar((e as Error).message); } finally { setOcupado(false); }
        }}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </div>
  );
}

/** Lista de documentos com pastas e busca. */
export function Documentos() {
  const { avisar } = useApp();
  const d = useIniciar();
  const [pasta, setPasta] = useState<string>(() => pref.ler('docs-pasta', ''));   // '' = todas, '-' = sem pasta
  const [busca, setBusca] = useState('');
  const [renomear, setRenomear] = useState<string | null>(null);
  const [apagar, setApagar] = useState(false);
  const [nova, setNova] = useState<string | null>(null);
  const escolher = (p: string) => { setPasta(p); pref.gravar('docs-pasta', p); setRenomear(null); };
  // segurar o dedo numa pasta abre a opção de renomear
  const toque = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segurou = useRef(false);
  const atual = d.pastas.find((p) => p.id === pasta);
  const q = norm(busca.trim());
  const lista = useMemo(() => d.documentos.filter((doc) => {
    if (pasta === '-' ? doc.pasta_id : pasta && doc.pasta_id !== pasta) return false;
    if (!q) return true;
    return norm([doc.titulo, doc.conteudo?.ref, ...(doc.conteudo?.blocos || []).flatMap((b) => [OBRAS[b.obra]?.autor || '', ...b.secoes.map((s) => s.titulo + ' ' + s.texto)])].join(' ')).includes(q);
  }), [d.documentos, pasta, q]);

  return (
    <>
      <Cabecalho titulo="Meus documentos" sub={`${lista.length} ${lista.length === 1 ? 'documento' : 'documentos'}`} />
      <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-6 pt-2">
        <AbasMensagens atual="documentos" />
        <input className="campo" type="search" placeholder="Buscar nos documentos" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar documentos" />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pastas">
          <button type="button" className="chip" aria-pressed={!pasta} onClick={() => escolher('')}>Todos</button>
          {d.pastas.map((p) => (
            <button key={p.id} type="button" className="chip" aria-pressed={pasta === p.id} title="Segure para renomear"
              onClick={() => { if (segurou.current) { segurou.current = false; return; } escolher(p.id); }}
              onPointerDown={() => { segurou.current = false; if (toque.current) clearTimeout(toque.current); toque.current = setTimeout(() => { segurou.current = true; escolher(p.id); setRenomear(p.nome); navigator.vibrate?.(15); }, 550); }}
              onPointerUp={() => { if (toque.current) clearTimeout(toque.current); }} onPointerLeave={() => { if (toque.current) clearTimeout(toque.current); }}
              onContextMenu={(e) => { e.preventDefault(); escolher(p.id); setRenomear(p.nome); }}>{p.nome}</button>
          ))}
          <button type="button" className="chip" aria-pressed={pasta === '-'} onClick={() => escolher('-')}>Sem pasta</button>
          <button type="button" className="chip" onClick={() => setNova('')}>+ Pasta</button>
        </div>
        {nova !== null ? (
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!nova.trim()) return; try { const p = await criarPasta(nova); setNova(null); escolher(p.id); } catch (er) { avisar((er as Error).message); } }}>
            <input className="campo flex-1" autoFocus maxLength={80} placeholder="Nome da nova pasta" value={nova} onChange={(e) => setNova(e.target.value)} aria-label="Nome da nova pasta" />
            <button type="submit" className="btn btn-pri btn-mini">Criar</button>
            <button type="button" className="btn btn-mini" onClick={() => setNova(null)}>Cancelar</button>
          </form>
        ) : null}
        {atual ? (
          renomear !== null ? (
            <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!renomear.trim()) return; try { await renomearPasta(atual.id, renomear.trim()); setRenomear(null); } catch (er) { avisar((er as Error).message); } }}>
              <input className="campo flex-1" autoFocus maxLength={80} value={renomear} onChange={(e) => setRenomear(e.target.value)} aria-label="Novo nome da pasta" />
              <button type="submit" className="btn btn-pri btn-mini">Salvar</button>
              <button type="button" className="btn btn-mini" onClick={() => setRenomear(null)}>Cancelar</button>
            </form>
          ) : (
            <div className="flex gap-2">
              <button type="button" className="btn btn-mini" onClick={() => setRenomear(atual.nome)}>Renomear pasta</button>
              <button type="button" className="btn btn-mini btn-perigo" onClick={() => setApagar(true)}>Apagar pasta</button>
            </div>
          )
        ) : null}
        {d.pastas.length && !atual ? <p className="ajuda !mt-0">Dica: segure o dedo numa pasta para renomear.</p> : null}
        {d.erro ? <p className="ajuda !mt-0">{d.erro}</p> : null}
        {!d.pronto ? <Carregando /> : !lista.length ? (
          <div className="cartao text-center">
            <p className="m-0 text-mute">{d.documentos.length ? 'Nenhum documento aqui.' : 'Você ainda não salvou documentos.'}</p>
            {!d.documentos.length ? <p className="ajuda">Abra a Bíblia em hebraico ou grego, toque em “Comentários” num versículo e use “Salvar em Meus documentos”.</p> : null}
          </div>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {lista.map((doc) => (
              <li key={doc.id}>
                <a href={`#/documentos/${doc.id}`} className="cartao block no-underline">
                  <b className="block text-[18px] leading-tight">{doc.titulo || 'Sem título'}</b>
                  <span className="mt-1 block text-[14px] italic text-mute">{(doc.conteudo?.blocos || []).map((b) => OBRAS[b.obra]?.autor).filter(Boolean).join(' · ')}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="etiqueta">{TIPO[doc.tipo] || doc.tipo}</span>
                    {doc.pasta_id ? <span className="etiqueta">{d.pastas.find((p) => p.id === doc.pasta_id)?.nome || 'Pasta'}</span> : null}
                    {doc.drive_id ? <span className="etiqueta">No Google Drive</span> : null}
                    <span className="rot !tracking-normal">{dataBR(doc.atualizado_em)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </main>
      {apagar && atual ? <Confirmar titulo="Apagar esta pasta?" texto={`A pasta “${atual.nome}” será apagada. Os documentos dela NÃO são apagados: passam para “Sem pasta”.`} acao="Apagar pasta" perigo
        onNao={() => setApagar(false)} onSim={async () => { setApagar(false); try { await apagarPasta(atual.id); escolher(''); } catch (e) { avisar((e as Error).message); } }} /> : null}
    </>
  );
}

/** Um documento aberto. */
export function DocumentoTela({ id }: { id: string }) {
  const { avisar } = useApp();
  const d = useIniciar();
  const doc = d.documentos.find((x) => x.id === id);
  const [ref, setRef] = useState<Ref | null>(null);
  const [ocupado, setOcupado] = useState('');
  const [apagar, setApagar] = useState(false);
  const [titulo, setTitulo] = useState<string | null>(null);
  if (!d.pronto || (!doc && d.carregando)) return <Carregando />;
  if (!doc) return (<><Cabecalho titulo="Documento" voltar="/documentos" /><p className="p-8 text-center text-mute">Documento não encontrado.</p></>);
  const blocos = doc.conteudo?.blocos || [];
  const sufixo = doc.tipo === 'comparacao' ? 'comparação' : OBRAS[blocos[0]?.obra]?.autor || 'comentario';

  async function pdf() {
    setOcupado('pdf');
    try { const r = await compartilharPdf(doc!.conteudo.ref, blocos, sufixo); if (r === 'baixado') avisar('PDF baixado'); }
    catch { avisar('Não foi possível gerar o PDF.'); } finally { setOcupado(''); }
  }
  async function drive() {
    setOcupado('drive');
    try {
      const { enviarAoDrive } = await import('@/lib/cliente/drive');
      const r = await enviarAoDrive(await arquivoPdf(doc!.conteudo.ref, blocos, sufixo));
      await alterarDocumento(doc!.id, { drive_id: r.id });
      avisar('Salvo na pasta “Púlpito” do seu Google Drive');
    } catch (e) { avisar((e as Error).message || 'Não foi possível salvar no Google Drive.'); } finally { setOcupado(''); }
  }

  return (
    <>
      <Cabecalho titulo={doc.titulo || 'Documento'} sub={TIPO[doc.tipo]} voltar="/documentos" />
      <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-6 pt-2">
        {titulo !== null ? (
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { await alterarDocumento(doc.id, { titulo: titulo.trim() }); setTitulo(null); } catch (er) { avisar((er as Error).message); } }}>
            <input className="campo flex-1" autoFocus maxLength={200} value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Título do documento" />
            <button type="submit" className="btn btn-pri btn-mini">Salvar</button>
          </form>
        ) : null}
        <div>
          <p className="rot m-0 mb-1">Pasta</p>
          <EscolherPasta valor={doc.pasta_id || ''} mudar={async (p) => { try { await alterarDocumento(doc.id, { pasta_id: p || null }); avisar('Documento movido'); } catch (e) { avisar((e as Error).message); } }} />
        </div>
        <button type="button" className="btn btn-pri w-full gap-2" disabled={!!ocupado} onClick={() => void pdf()}><IcoCompartilhar /> {ocupado === 'pdf' ? 'Gerando o PDF…' : 'Compartilhar em PDF'}</button>
        <button type="button" className="btn w-full" disabled={!!ocupado} onClick={() => void drive()}>{ocupado === 'drive' ? 'Enviando ao Google Drive…' : doc.drive_id ? 'Enviar de novo ao Google Drive' : 'Salvar no meu Google Drive'}</button>
        {doc.drive_id ? <a className="ajuda !mt-0 text-center underline" href={`https://drive.google.com/file/d/${doc.drive_id}/view`} target="_blank" rel="noreferrer">Abrir no Google Drive</a> : null}
        <div className="flex gap-2">
          <button type="button" className="btn btn-mini flex-1" onClick={() => setTitulo(doc.titulo)}>Renomear</button>
          <button type="button" className="btn btn-mini btn-perigo flex-1" onClick={() => setApagar(true)}>Apagar</button>
        </div>
        <h2 className="tit mt-2">{doc.conteudo.ref}</h2>
        <button type="button" className="chip self-start" onClick={() => ir(`/biblia/${doc.conteudo.l}/${doc.conteudo.c}/${doc.conteudo.v}`)}>Abrir o versículo na Bíblia</button>
        {blocos.map((b) => (
          <section key={b.obra}>
            <h3 className="comparar-tit">{OBRAS[b.obra]?.autor}<span className="rot ml-2">{OBRAS[b.obra]?.rotulo}</span></h3>
            <Secoes secoes={b.secoes} aoRef={setRef} abrirPrimeira={blocos.length === 1} />
          </section>
        ))}
        <p className="ajuda">É a explicação dos autores, não do app. Textos antigos, em domínio público, traduzidos para o português pelo Púlpito, sem revisão de especialista.</p>
      </main>
      {ref ? <Balao r={ref} fechar={() => setRef(null)} /> : null}
      {apagar ? <Confirmar titulo="Apagar este documento?" texto={`“${doc.titulo}” será apagado de Meus documentos. Uma cópia que você já enviou ao Google Drive continua lá.`} acao="Apagar" perigo
        onNao={() => setApagar(false)} onSim={async () => { setApagar(false); try { await apagarDocumento(doc.id); ir('/documentos'); } catch (e) { avisar((e as Error).message); } }} /> : null}
    </>
  );
}

/** Na mensagem: documentos anexados e o botão para anexar. */
export function AnexosDaMensagem({ ids, mudar, pode }: { ids: string[]; mudar: (ids: string[]) => void; pode: boolean }) {
  const d = useIniciar();
  const [escolher, setEscolher] = useState(false);
  const anexos = ids.map((id) => d.documentos.find((x) => x.id === id) || { id, titulo: 'Documento indisponível', tipo: 'comentario' as const });
  const livres = d.documentos.filter((x) => !ids.includes(x.id));
  return (
    <div>
      {anexos.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <a href={`#/documentos/${a.id}`} className="cartao flex-1 !py-2.5 no-underline"><b className="text-[15.5px]">{a.titulo}</b> <span className="etiqueta ml-1">{TIPO[a.tipo]}</span></a>
              {pode ? <button type="button" className="btn btn-mini btn-perigo" onClick={() => mudar(ids.filter((x) => x !== a.id))} aria-label={`Tirar ${a.titulo}`}>Tirar</button> : null}
            </li>
          ))}
        </ul>
      ) : <p className="ajuda !mt-0">Nenhum documento anexado.</p>}
      {pode ? (escolher ? (
        livres.length ? (
          <select className="campo mt-2" defaultValue="" aria-label="Escolher documento para anexar" onChange={(e) => { if (e.target.value) { mudar([...ids, e.target.value]); setEscolher(false); } }}>
            <option value="" disabled>Escolha um documento…</option>
            {d.pastas.map((p) => { const ds = livres.filter((x) => x.pasta_id === p.id); return ds.length ? <optgroup key={p.id} label={p.nome}>{ds.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}</optgroup> : null; })}
            {livres.some((x) => !x.pasta_id) ? <optgroup label="Sem pasta">{livres.filter((x) => !x.pasta_id).map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}</optgroup> : null}
          </select>
        ) : <p className="ajuda">Você não tem outros documentos salvos.</p>
      ) : <button type="button" className="btn btn-mini mt-2" onClick={() => setEscolher(true)}>+ Anexar documento</button>) : null}
    </div>
  );
}
