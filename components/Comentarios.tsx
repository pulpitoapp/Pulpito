'use client';
// Comentários bíblicos (domínio público, traduzidos para o Púlpito): lista por versículo,
// leitura de cada obra, comparação lado a lado, balão com o texto das referências e PDF.
import { useEffect, useState } from 'react';
import { LIVROS, limparVerso } from '@/lib/biblia';
import { BASE, useBiblia } from '@/lib/cliente/bibliaDados';
import { ir, useApp } from './contexto';
import { IcoCompartilhar, IcoVoltar } from './Icones';
import { Painel } from './Paineis';

export type Secao = { titulo: string; original: string; texto: string };
type Entrada = { ate?: number; secoes: Secao[] };
type Capitulo = Record<string, Entrada>;
type Indice = Record<string, Record<string, number[]>>;

export const OBRAS: Record<string, { autor: string; rotulo: string; obra: string; ano: string }> = {
  vincent: { autor: 'Marvin R. Vincent', rotulo: 'Estudo das Palavras', obra: 'Estudos de Palavras do Novo Testamento', ano: '1887' },
  robertson: { autor: 'A. T. Robertson', rotulo: 'Estudo do grego (Mais complexo)', obra: 'Retratos Verbais do Novo Testamento', ano: '1930–1933' },
  keil: { autor: 'Keil & Delitzsch', rotulo: 'Estudo das Palavras', obra: 'Comentário sobre o Antigo Testamento', ano: '1866–1891' },
  jfb: { autor: 'Jamieson, Fausset e Brown', rotulo: 'Explicação do sentido', obra: 'Comentário Crítico e Explicativo de Toda a Bíblia', ano: '1871' },
};
const ORDEM = ['vincent', 'robertson', 'keil', 'jfb'];          // as que já estavam primeiro

const OSIS = ['Gen','Exo','Lev','Num','Deu','Jos','Jdg','Rut','1Sa','2Sa','1Ki','2Ki','1Ch','2Ch','Ezr','Neh','Est','Job','Psa','Pro','Ecc','Sng','Isa','Jer','Lam','Ezk','Dan','Hos','Jol','Amo','Oba','Jon','Mic','Nam','Hab','Zep','Hag','Zec','Mal','Mat','Mrk','Luk','Jhn','Act','Rom','1Co','2Co','Gal','Eph','Php','Col','1Th','2Th','1Ti','2Ti','Tit','Phm','Heb','Jas','1Pe','2Pe','1Jn','2Jn','3Jn','Jud','Rev'];
type Ref = { l: number; c: number; v?: number; v2?: number; rotulo: string };
function lerOsis(s: string): Ref | null {
  const r = s.match(/^([1-3]?[A-Za-z]{2,3})\.(\d+)(?:\.(\d+))?(?:-(\d+))?/);
  const l = r ? OSIS.indexOf(r[1]) : -1;
  if (!r || l < 0) return null;
  const c = Number(r[2]), v = r[3] ? Number(r[3]) : undefined, v2 = r[4] ? Number(r[4]) : undefined;
  return { l, c, v, v2, rotulo: `${LIVROS[l]} ${c}${v ? ':' + v : ''}${v2 ? '-' + v2 : ''}` };
}
/** Texto sem marcações, com as referências por extenso (para PDF e compartilhamento). */
export const textoPlano = (t: string) => t.replace(/<\/?[bi]>/g, '').replace(/\{\{([^}]+)\}\}/g, (_, r: string) => lerOsis(r)?.rotulo || r);

// ---------- dados ----------
let indice: Promise<Indice> | null = null;
const carregarIndice = (): Promise<Indice> => (indice ??= fetch(`${BASE}/dados/comentarios/indice.json`).then((r) => (r.ok ? (r.json() as Promise<Indice>) : ({} as Indice))).catch(() => { indice = null; return {} as Indice; }));
const caps = new Map<string, Promise<Capitulo | null>>();
const carregarCap = (o: string, l: number, c: number) => {
  const k = `${o}/${l}/${c}`;
  if (!caps.has(k)) caps.set(k, fetch(`${BASE}/dados/comentarios/${k}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => { caps.delete(k); return null; }));
  return caps.get(k)!;
};

/** Comentários do capítulo (c começa em 0, como no leitor), por obra. */
export function useComentarios(l: number, c: number, ativo: boolean): Record<string, Capitulo> | null {
  const [estado, setEstado] = useState<{ k: string; d: Record<string, Capitulo> | null }>({ k: '', d: null });
  const k = `${l}.${c}`;
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    (async () => {
      const ind = await carregarIndice();
      const obras = ORDEM.filter((o) => ind[o]?.[l]?.includes(c + 1));
      const res: Record<string, Capitulo> = {};
      await Promise.all(obras.map(async (o) => { const d = await carregarCap(o, l, c + 1); if (d) res[o] = d; }));
      if (vivo) setEstado({ k, d: res });
    })();
    return () => { vivo = false; };
  }, [l, c, k, ativo]);
  return estado.k === k ? estado.d : null;
}

/** As seções de cada obra para um versículo (com a introdução do capítulo junto do versículo 1). */
export function comentariosDoVerso(com: Record<string, Capitulo> | null, v: number): { obra: string; ref: string; secoes: Secao[] }[] {
  if (!com) return [];
  const out: { obra: string; ref: string; secoes: Secao[] }[] = [];
  for (const o of ORDEM) {
    const cap = com[o];
    if (!cap) continue;
    const secoes: Secao[] = [];
    let faixa = '';
    if (v === 1 && cap['0']) secoes.push(...cap['0'].secoes.map((s) => ({ ...s, titulo: s.titulo || 'Introdução ao capítulo' })));
    for (const [k, e] of Object.entries(cap)) {
      const ini = Number(k);
      if (!ini) continue;
      if (v === ini || (e.ate && v > ini && v <= e.ate)) { secoes.push(...e.secoes); if (e.ate) faixa = `${ini}-${e.ate}`; }
    }
    if (secoes.length) out.push({ obra: o, ref: faixa, secoes });
  }
  return out;
}

// ---------- texto com referências que abrem um balão ----------
function Balao({ r, fechar }: { r: Ref; fechar: () => void }) {
  const biblia = useBiblia('blivre');
  const cap = Array.isArray(biblia) ? biblia[r.l]?.[2]?.[r.c - 1] : null;
  const ini = r.v || 1, fim = r.v ? (r.v2 || r.v) : Math.min(cap?.length || 0, 10);
  const versos = cap ? cap.slice(ini - 1, fim).map((t, i) => [ini + i, limparVerso(t)] as const) : [];
  return (
    <>
      <div className="fundo-balao" onClick={fechar} aria-hidden="true" />
      <div className="balao" role="dialog" aria-label={r.rotulo}>
        <p className="rot m-0">{r.rotulo} · Bíblia Livre</p>
        {biblia === null ? <p className="text-mute">Carregando…</p> : !versos.length ? <p className="text-mute">Texto não encontrado.</p> : (
          <p className="m-0 mt-2 max-h-[40vh] overflow-auto text-[16px] leading-relaxed">
            {versos.map(([n, t]) => <span key={n}><sup className="text-mute">{n}</sup> {t} </span>)}
            {!r.v && cap && cap.length > 10 ? <span className="text-mute">…</span> : null}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn flex-1" onClick={fechar}>Fechar</button>
          <button type="button" className="btn btn-pri flex-1" onClick={() => { fechar(); ir(`/biblia/${r.l}/${r.c - 1}${r.v ? '/' + r.v : ''}`); }}>Abrir na Bíblia</button>
        </div>
      </div>
    </>
  );
}

function Paragrafo({ texto, aoRef }: { texto: string; aoRef: (r: Ref) => void }) {
  const partes = texto.split(/(\{\{[^}]+\}\}|<\/?[bi]>|\[trecho omitido\])/g).filter(Boolean);
  let neg = false, ita = false;
  const out: React.ReactNode[] = [];
  partes.forEach((p, i) => {
    if (p === '<b>') { neg = true; return; } if (p === '</b>') { neg = false; return; }
    if (p === '<i>') { ita = true; return; } if (p === '</i>') { ita = false; return; }
    if (p === '[trecho omitido]') { out.push(<span key={i} className="omitido">[trecho omitido]</span>); return; }
    const m = p.match(/^\{\{(.+)\}\}$/);
    if (m) {
      const r = lerOsis(m[1]);
      out.push(r ? <button key={i} type="button" className="ref-balao" onClick={() => aoRef(r)}>{r.rotulo}</button> : <span key={i}>{m[1]}</span>);
      return;
    }
    out.push(neg ? <b key={i}>{p}</b> : ita ? <i key={i}>{p}</i> : <span key={i}>{p}</span>);
  });
  return <p className="m-0 text-[16px] leading-relaxed">{out}</p>;
}

function Secoes({ secoes, aoRef, aoCompartilhar, ocupado, abrirPrimeira = true }: { secoes: Secao[]; aoRef: (r: Ref) => void; aoCompartilhar?: (s: Secao) => void; ocupado?: boolean; abrirPrimeira?: boolean }) {
  return (
    <>
      {secoes.map((s, i) => (
        <details key={i} className="cartao mt-3 !p-4" open={abrirPrimeira && i === 0}>
          <summary className="topico flex cursor-pointer items-start gap-2 text-[17px] font-bold">
            <span className="seta" aria-hidden="true">▸</span>
            <span className="flex-1">{s.titulo}{s.original ? <span className="inter-gre !text-[17px] font-normal"> · {s.original}</span> : null}</span>
            {aoCompartilhar ? <button type="button" className="redondo !h-10 !w-10 shrink-0" aria-label={`Compartilhar em PDF: ${s.titulo}`} disabled={ocupado} onClick={(e) => { e.preventDefault(); e.stopPropagation(); aoCompartilhar(s); }}><IcoCompartilhar /></button> : null}
          </summary>
          <div className="mt-2 space-y-3">{s.texto.split(/\n\n+/).map((par, j) => <Paragrafo key={j} texto={par} aoRef={aoRef} />)}</div>
        </details>
      ))}
    </>
  );
}

// ---------- painel ----------
type Tela = { tipo: 'lista' } | { tipo: 'obra'; obra: string } | { tipo: 'comparar' };

export function PainelComentarios({ l, c, v, com, fechar }: { l: number; c: number; v: number; com: Record<string, Capitulo>; fechar: () => void }) {
  const { avisar } = useApp();
  const lista = comentariosDoVerso(com, v);
  const [tela, setTela] = useState<Tela>(lista.length === 1 ? { tipo: 'obra', obra: lista[0].obra } : { tipo: 'lista' });
  const [ref, setRef] = useState<Ref | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const refVerso = `${LIVROS[l]} ${c + 1}:${v}`;

  async function pdf(blocos: { obra: string; secoes: Secao[] }[], sufixo: string) {
    if (ocupado) return;
    setOcupado(true);
    try {
      const [{ gerarPdfComentario }, { compartilharArquivo }] = await Promise.all([import('@/lib/cliente/pdfComentario'), import('@/lib/cliente/pdf')]);
      const arq = await gerarPdfComentario({ ref: refVerso, sufixo, blocos: blocos.map((b) => ({ ...OBRAS[b.obra], secoes: b.secoes })) }, textoPlano);
      const r = await compartilharArquivo(arq, `${refVerso} — comentário`);
      if (r === 'baixado') avisar('PDF baixado');
    } catch { avisar('Não foi possível gerar o PDF. Abra o app uma vez com internet e tente de novo.'); }
    finally { setOcupado(false); }
  }

  const voltar = lista.length > 1 && tela.tipo !== 'lista' ? <button type="button" className="chip mb-2 gap-1" onClick={() => setTela({ tipo: 'lista' })}><IcoVoltar /> Comentários</button> : null;
  let corpo: React.ReactNode;
  let sub = 'Comentários';
  if (tela.tipo === 'lista') {
    corpo = (
      <>
        <p className="ajuda !mt-0">Escolha um comentário. Toque numa referência para ler o texto ali mesmo.</p>
        <div className="mt-3 flex flex-col gap-2">
          {lista.map((x) => (
            <button key={x.obra} type="button" className="cartao !p-4 text-left" onClick={() => setTela({ tipo: 'obra', obra: x.obra })}>
              <span className="block text-[17px] font-bold">{OBRAS[x.obra].autor}</span>
              <span className="rot mt-1 block">{OBRAS[x.obra].rotulo}</span>
            </button>
          ))}
        </div>
        {lista.length > 1 ? <button type="button" className="btn btn-pri mt-4 w-full" onClick={() => setTela({ tipo: 'comparar' })}>Comparar os {lista.length} comentários</button> : null}
      </>
    );
  } else if (tela.tipo === 'obra') {
    const x = lista.find((y) => y.obra === tela.obra)!;
    const o = OBRAS[tela.obra];
    sub = `${o.autor} · ${o.rotulo}`;
    corpo = (
      <>
        {voltar}
        <p className="ajuda !mt-0">{o.autor}, <i>{o.obra}</i> ({o.ano}){x.ref ? ` · comenta os versículos ${x.ref}` : ''}. Toque num tópico para abrir.</p>
        <button type="button" className="btn btn-pri mt-2 w-full gap-2" disabled={ocupado} onClick={() => void pdf([x], o.autor)}><IcoCompartilhar /> {ocupado ? 'Gerando o PDF…' : 'Compartilhar em PDF'}</button>
        <Secoes secoes={x.secoes} aoRef={setRef} ocupado={ocupado} aoCompartilhar={(s) => void pdf([{ obra: x.obra, secoes: [s] }], s.titulo)} />
      </>
    );
  } else {
    sub = 'Comparação';
    corpo = (
      <>
        {voltar}
        <p className="ajuda !mt-0">Os comentários deste versículo, um depois do outro, para você comparar.</p>
        <button type="button" className="btn btn-pri mt-2 w-full gap-2" disabled={ocupado} onClick={() => void pdf(lista, 'comparação')}><IcoCompartilhar /> {ocupado ? 'Gerando o PDF…' : 'Compartilhar a comparação em PDF'}</button>
        {lista.map((x) => (
          <section key={x.obra} className="mt-5">
            <h3 className="comparar-tit">{OBRAS[x.obra].autor}<span className="rot ml-2">{OBRAS[x.obra].rotulo}</span></h3>
            <Secoes secoes={x.secoes} aoRef={setRef} abrirPrimeira={false} />
          </section>
        ))}
      </>
    );
  }
  return (
    <Painel titulo={refVerso} sub={sub} fechar={fechar}>
      {corpo}
      <p className="ajuda mt-4">É a explicação dos autores, não do app. Textos antigos, em domínio público, traduzidos para o português pelo Púlpito, sem revisão de especialista. Trechos que ainda passam por revisão doutrinária aparecem como “[trecho omitido]”.</p>
      {ref ? <Balao r={ref} fechar={() => setRef(null)} /> : null}
    </Painel>
  );
}
