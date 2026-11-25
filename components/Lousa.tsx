'use client';
// Folha de escrita (dedo, mouse ou caneta, como a Apple Pencil), no estilo das ferramentas do iPhone:
// paleta flutuante que acompanha a tela, pode ser arrastada e minimizada numa bolinha; caneta, lápis,
// marca-texto, borracha, laço (seleciona e arrasta), régua, desfazer/refazer, 5 cores + cor livre,
// tela cheia, "+ Página" e blocos de texto (texto bíblico ou algo salvo).
// Os traços são vetores (medidas de 0 a 1000 da largura): ficam nítidos em qualquer tela.
import { IcoVoltar } from './Icones';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Bloco, Traco } from '@/lib/tipos';
import { pref } from '@/lib/cliente/local';
import { BASE } from '@/lib/cliente/bibliaDados';

export const PAGINA = 1414;                       // altura de uma página (proporção A4) em medidas da folha
type Ferramenta = 'caneta' | 'fina' | 'lapis' | 'marca' | 'borracha' | 'laco';
const CORES_PADRAO = ['#1a1a1a', '#1d6ee6', '#2f9e44', '#f2b705', '#e03131'];
const ESPESSURA: Record<string, number> = { caneta: 3.2, fina: 2.2, lapis: 2.4, marca: 22 };

/** Desenha os traços num canvas. escala = pixels por unidade (a largura tem 1000 unidades). */
export function desenharTracos(ctx: CanvasRenderingContext2D, tracos: Traco[], escala: number) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const t of tracos) {
    const p = t.p;
    if (p.length < 3) continue;
    ctx.strokeStyle = t.c;
    ctx.fillStyle = t.c;
    const base = t.a ?? 1;
    ctx.globalAlpha = t.f === 'marca' ? 0.45 * base : t.f === 'lapis' ? 0.72 * base : base;
    if (p.length === 3) {
      ctx.beginPath();
      ctx.arc(p[0] * escala, p[1] * escala, (t.e * escala) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (t.f !== 'caneta') {
      // marca-texto e lápis: um traço só, de largura constante (sem pontos mais escuros nas emendas)
      ctx.lineWidth = t.e * escala * (t.f === 'lapis' ? 1.1 : 1);
      ctx.lineCap = t.f === 'marca' ? 'butt' : 'round';
      ctx.beginPath();
      ctx.moveTo(p[0] * escala, p[1] * escala);
      for (let i = 3; i < p.length; i += 3) {
        const x0 = p[i - 3] * escala, y0 = p[i - 2] * escala, x1 = p[i] * escala, y1 = p[i + 1] * escala;
        ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      }
      ctx.lineTo(p[p.length - 3] * escala, p[p.length - 2] * escala);
      ctx.stroke();
      ctx.lineCap = 'round';
      continue;
    }
    for (let i = 3; i < p.length; i += 3) {
      const pressao = 0.55 + (p[i + 2] / 100) * 0.9;
      ctx.lineWidth = t.e * escala * pressao;
      ctx.beginPath();
      const x0 = p[i - 3] * escala, y0 = p[i - 2] * escala, x1 = p[i] * escala, y1 = p[i + 1] * escala;
      if (i >= 6) {
        const xa = p[i - 6] * escala, ya = p[i - 5] * escala;
        ctx.moveTo((xa + x0) / 2, (ya + y0) / 2);
        ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      } else {
        ctx.moveTo(x0, y0);
        ctx.lineTo((x0 + x1) / 2, (y0 + y1) / 2);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** Escreve os blocos de texto num canvas (usado no PDF). */
export function desenharBlocos(ctx: CanvasRenderingContext2D, blocos: Bloco[], escala: number) {
  for (const b of blocos) {
    const x = b.x * escala, w = b.w * escala;
    let y = b.y * escala;
    ctx.fillStyle = '#fbf3dc'; ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2 * escala;
    const linhas = quebrar(ctx, b.texto, w - 24 * escala, 17 * escala);
    const alt = (34 + linhas.length * 25) * escala;
    ctx.fillRect(x, y, w, alt); ctx.strokeRect(x, y, w, alt);
    ctx.fillStyle = '#4a1626'; ctx.font = `bold ${15 * escala}px Georgia, serif`;
    ctx.fillText(b.titulo, x + 12 * escala, y + 22 * escala);
    ctx.fillStyle = '#21171a'; ctx.font = `${17 * escala}px Georgia, serif`;
    y += 46 * escala;
    for (const l of linhas) { ctx.fillText(l, x + 12 * escala, y); y += 25 * escala; }
  }
}
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, tam: number) {
  ctx.font = `${tam}px Georgia, serif`;
  const out: string[] = [];
  let linha = '';
  for (const p of texto.split(/\s+/)) { const t = linha ? linha + ' ' + p : p; if (ctx.measureText(t).width > largura && linha) { out.push(linha); linha = p; } else linha = t; }
  if (linha) out.push(linha);
  return out;
}
const alturaBloco = (b: Bloco) => 34 + Math.ceil((b.texto.length * 9.2) / Math.max(120, b.w - 24)) * 25 + 12;

/** Gera uma imagem dos traços (e blocos) sobre fundo branco (para o PDF). */
export function tracosEmImagem(tracos: Traco[], altura: number, larguraPx = 1200, blocos: Bloco[] = []): string {
  const canvas = document.createElement('canvas');
  canvas.width = larguraPx;
  canvas.height = Math.round((altura / 1000) * larguraPx);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  desenharBlocos(ctx, blocos, larguraPx / 1000);
  desenharTracos(ctx, tracos, larguraPx / 1000);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** Altura usada pelos traços e blocos (para cortar o espaço vazio no PDF). */
export function alturaUsada(tracos: Traco[], blocos: Bloco[] = []): number {
  let max = 0;
  for (const t of tracos) for (let i = 1; i < t.p.length; i += 3) if (t.p[i] > max) max = t.p[i];
  for (const b of blocos) max = Math.max(max, b.y + alturaBloco(b));
  return max;
}

const dentro = (x: number, y: number, poli: number[]) => {
  let d = false;
  for (let i = 0, j = poli.length - 2; i < poli.length; j = i, i += 2) {
    const xi = poli[i], yi = poli[i + 1], xj = poli[j], yj = poli[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
};
type Foto = { tracos: Traco[]; altura: number; blocos: Bloco[] };

export function Lousa({ tracos, altura, blocos = [], mudar, leitura, pautada = true, rotulo = 'Folha de escrita', aoInserir, escrevendo, setEscrevendo }: {
  tracos: Traco[]; altura: number; blocos?: Bloco[]; mudar?: (tracos: Traco[], altura: number, blocos?: Bloco[]) => void; leitura?: boolean; pautada?: boolean; rotulo?: string;
  /** Abre a escolha de um texto bíblico ou de algo salvo; devolve o bloco a colocar (ou null). */
  aoInserir?: (tipo: 'biblia' | 'salvo') => Promise<{ titulo: string; texto: string } | null>;
  /** Quando vem de fora: o dedo escreve (botão “Escrever” bordô) ou rola a página. */
  escrevendo?: boolean; setEscrevendo?: (v: boolean) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const [largura, setLargura] = useState(0);
  const [ativaLocal, setAtivaLocal] = useState(false);     // o dedo escreve (a caneta sempre escreve)
  const ativa = escrevendo ?? ativaLocal;
  const setAtiva = (v: boolean) => { if (setEscrevendo) setEscrevendo(v); else setAtivaLocal(v); };
  const [mini, setMini] = useState(false);                // a paleta vira uma bolinha enquanto se escreve
  const [ferramenta, setFerramenta] = useState<Ferramenta>('caneta');
  const [cores, setCores] = useState<string[]>(() => pref.ler('lousa-cores', CORES_PADRAO));
  // cada ferramenta lembra a sua cor (como no iPhone)
  const [corPor, setCorPor] = useState<Record<string, number>>(() => pref.ler('lousa-cor-por', { caneta: 1, fina: 0, marca: 3 }));
  const corIdx = corPor[ferramenta] ?? 0;
  const setCorIdx = (i: number) => { const n = { ...corPor, [ferramenta]: i }; setCorPor(n); pref.gravar('lousa-cor-por', n); };
  const [opacidade, setOpacidade] = useState(1);
  const [regua] = useState(false);
  const [cheia, setCheia] = useState(false);
  // o botão "Mexer na página" sobre as ferramentas só aparece quando o de cima saiu da tela
  const modoRef = useRef<HTMLDivElement>(null);
  const [modoVisivel, setModoVisivel] = useState(true);
  useEffect(() => {
    const el = modoRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([e]) => setModoVisivel(e.isIntersecting), { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [cheia, leitura, mudar]);
  const [seletor, setSeletor] = useState(false);
  const [mais, setMais] = useState(false);
  const [selecao, setSelecao] = useState<{ tr: number[]; bl: string[] } | null>(null);
  const emCurso = useRef<Traco | null>(null);
  const laco = useRef<number[] | null>(null);
  const arrasto = useRef<{ x: number; y: number } | null>(null);
  const atual = useRef<Foto>({ tracos, altura, blocos });
  useEffect(() => { atual.current = { tracos, altura, blocos }; }, [tracos, altura, blocos]);
  const desfazer = useRef<Foto[]>([]);
  const refazer = useRef<Foto[]>([]);
  const [pilhas, setPilhas] = useState({ d: 0, r: 0 });        // quantos passos dá para desfazer/refazer
  const forcar = () => setPilhas({ d: desfazer.current.length, r: refazer.current.length });
  const cor = cores[corIdx] || '#1a1a1a';

  const aplicar = (f: Foto, guardar = true) => {
    if (guardar) { desfazer.current.push(atual.current); if (desfazer.current.length > 60) desfazer.current.shift(); refazer.current = []; }
    atual.current = f;
    mudar?.(f.tracos, f.altura, f.blocos);
    forcar();
  };

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setLargura(el.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [cheia]);

  const redesenhar = useCallback(() => {
    const c = tela.current;
    if (!c || !largura) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const hCss = (altura / 1000) * largura;
    if (c.width !== Math.round(largura * dpr) || c.height !== Math.round(hCss * dpr)) {
      c.width = Math.round(largura * dpr);
      c.height = Math.round(hCss * dpr);
      c.style.height = hCss + 'px';
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const k = (largura * dpr) / 1000;
    ctx.clearRect(0, 0, c.width, c.height);
    desenharTracos(ctx, emCurso.current ? [...tracos, emCurso.current] : tracos, k);
    // seleção do laço
    if (selecao) {
      ctx.save(); ctx.globalAlpha = 0.9;
      desenharTracos(ctx, selecao.tr.map((i) => ({ ...tracos[i], c: '#c9a24a', e: tracos[i].e + 3, a: 0.35 })), k);
      ctx.restore();
    }
    if (laco.current && laco.current.length > 4) {
      ctx.save(); ctx.setLineDash([8 * dpr, 6 * dpr]); ctx.strokeStyle = '#4a1626'; ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath(); ctx.moveTo(laco.current[0] * k, laco.current[1] * k);
      for (let i = 2; i < laco.current.length; i += 2) ctx.lineTo(laco.current[i] * k, laco.current[i + 1] * k);
      ctx.stroke(); ctx.restore();
    }
  }, [largura, altura, tracos, selecao]);
  useEffect(() => { redesenhar(); }, [redesenhar]);

  const ponto = (e: { clientX: number; clientY: number; pointerType?: string; pressure?: number }) => {
    const r = (tela.current as HTMLCanvasElement).getBoundingClientRect();
    const k = 1000 / r.width;
    const pressao = e.pointerType === 'pen' ? Math.round((e.pressure || 0.5) * 100) : 50;
    return [Math.round((e.clientX - r.left) * k * 10) / 10, Math.round((e.clientY - r.top) * k * 10) / 10, pressao];
  };
  const apagarPerto = (x: number, y: number) => {
    const raio = 18;
    const f = atual.current;
    const restam = f.tracos.filter((t) => { for (let i = 0; i < t.p.length; i += 3) if (Math.abs(t.p[i] - x) < raio && Math.abs(t.p[i + 1] - y) < raio) return false; return true; });
    if (restam.length !== f.tracos.length) aplicar({ ...f, tracos: restam });
  };
  const naSelecao = (x: number, y: number) => {
    if (!selecao) return false;
    const f = atual.current;
    for (const i of selecao.tr) { const p = f.tracos[i]?.p || []; for (let j = 0; j < p.length; j += 3) if (Math.abs(p[j] - x) < 30 && Math.abs(p[j + 1] - y) < 30) return true; }
    return selecao.bl.some((id) => { const b = f.blocos.find((z) => z.id === id); return b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + alturaBloco(b); });
  };

  function aoBaixar(e: React.PointerEvent) {
    if (leitura || !mudar) return;
    if (e.pointerType !== 'pen' && !ativa) return;
    if (e.pointerType === 'pen' && !ativa) setAtiva(true);
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const [x, y, p] = ponto(e);
    setMini(true);
    if (ferramenta === 'laco') {
      if (naSelecao(x, y)) { arrasto.current = { x, y }; desfazer.current.push(atual.current); refazer.current = []; return; }
      setSelecao(null); laco.current = [x, y]; return;
    }
    setSelecao(null);
    if (ferramenta === 'borracha') { emCurso.current = { c: '', e: 0, f: 'caneta', p: [] }; apagarPerto(x, y); return; }
    emCurso.current = { c: cor, e: ESPESSURA[ferramenta], f: ferramenta as Traco['f'], p: [x, y, p], ...(opacidade < 1 ? { a: opacidade } : {}) };
    redesenhar();
  }
  function aoMover(e: React.PointerEvent) {
    const [x, y] = ponto(e);
    if (arrasto.current && selecao) {
      e.preventDefault();
      const dx = x - arrasto.current.x, dy = y - arrasto.current.y;
      arrasto.current = { x, y };
      const f = atual.current;
      const tr = f.tracos.map((t, i) => (selecao.tr.includes(i) ? { ...t, p: t.p.map((v, j) => (j % 3 === 0 ? v + dx : j % 3 === 1 ? v + dy : v)) } : t));
      const bl = f.blocos.map((b) => (selecao.bl.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b));
      atual.current = { ...f, tracos: tr, blocos: bl };
      mudar?.(tr, f.altura, bl);
      return;
    }
    if (laco.current) { e.preventDefault(); laco.current.push(x, y); redesenhar(); return; }
    const t = emCurso.current;
    if (!t) return;
    e.preventDefault();
    const eventos = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() || [];
    const lista = eventos.length ? eventos : [e.nativeEvent as PointerEvent];
    for (const ev of lista) {
      const [px, py, pr] = ponto(ev);
      if (ferramenta === 'borracha') { apagarPerto(px, py); continue; }
      if (regua) { t.p = [t.p[0], t.p[1], t.p[2], px, py, pr]; continue; }   // régua: linha reta do início até o dedo
      const n = t.p.length;
      if (Math.abs(t.p[n - 3] - px) + Math.abs(t.p[n - 2] - py) < 1.2) continue;
      t.p.push(px, py, pr);
    }
    if (ferramenta !== 'borracha') redesenhar();
  }
  function aoSoltar() {
    if (arrasto.current) { arrasto.current = null; forcar(); return; }
    if (laco.current) {
      const poli = laco.current; laco.current = null;
      const f = atual.current;
      if (poli.length >= 8) {
        const tr = f.tracos.map((t, i) => { let n = 0, d = 0; for (let j = 0; j < t.p.length; j += 3) { n++; if (dentro(t.p[j], t.p[j + 1], poli)) d++; } return n && d / n > 0.6 ? i : -1; }).filter((i) => i >= 0);
        const bl = f.blocos.filter((b) => dentro(b.x + b.w / 2, b.y + 20, poli)).map((b) => b.id);
        setSelecao(tr.length || bl.length ? { tr, bl } : null);
      }
      redesenhar();
      return;
    }
    const t = emCurso.current;
    emCurso.current = null;
    if (!t || !t.c || !mudar) return;
    const f = atual.current;
    const fundo = alturaUsada([t]);
    aplicar({ ...f, tracos: [...f.tracos, t], altura: fundo > f.altura - 120 ? f.altura + 350 : f.altura });
  }

  const apagarSelecao = () => {
    if (!selecao) return;
    const f = atual.current;
    aplicar({ ...f, tracos: f.tracos.filter((_, i) => !selecao.tr.includes(i)), blocos: f.blocos.filter((b) => !selecao.bl.includes(b.id)) });
    setSelecao(null);
  };
  const voltar = () => { const f = desfazer.current.pop(); if (!f) return; refazer.current.push(atual.current); aplicar(f, false); setSelecao(null); };
  const avancar = () => { const f = refazer.current.pop(); if (!f) return; desfazer.current.push(atual.current); aplicar(f, false); };
  const inserir = async (tipo: 'biblia' | 'salvo') => {
    setMais(false);
    const r = await aoInserir?.(tipo);
    if (!r) return;
    const f = atual.current;
    const fundo = alturaUsada(f.tracos, f.blocos);
    const y = Math.min(fundo + 30, f.altura - 200);
    const b: Bloco = { id: Math.random().toString(36).slice(2), x: 60, y: Math.max(30, y), w: 880, titulo: r.titulo, texto: r.texto.slice(0, 1200) };
    aplicar({ ...f, blocos: [...f.blocos, b], altura: Math.max(f.altura, b.y + alturaBloco(b) + 200) });
  };
  // a cor escolhida vai para a ferramenta atual (cada uma lembra a sua)
  const trocarCor = (nova: string) => {
    let i = cores.indexOf(nova);
    let l = cores;
    if (i < 0) { l = [...cores, nova].slice(-12); i = l.length - 1; setCores(l); pref.gravar('lousa-cores', l); }
    setCorIdx(i);
  };

  const editavel = !leitura && !!mudar;
  const paginas = Math.floor(altura / PAGINA);
  const folha = (
    <div ref={caixa} className="lousa" data-ativa={editavel && ativa ? '1' : undefined}>
      {pautada ? <div className="pautas" aria-hidden="true" /> : null}
      {Array.from({ length: paginas }, (_, i) => <div key={i} className="lousa-pagina" style={{ top: `${((i + 1) * PAGINA / 1000) * largura}px` }} aria-hidden="true"><span>Página {i + 2}</span></div>)}
      {blocos.map((b) => (
        <div key={b.id} className={`lousa-bloco ${selecao?.bl.includes(b.id) ? 'sel' : ''}`} style={{ left: (b.x / 1000) * largura, top: (b.y / 1000) * largura, width: (b.w / 1000) * largura, fontSize: Math.max(12, largura * 0.017) }}>
          <b>{b.titulo}</b>{b.texto}
        </div>
      ))}
      <canvas ref={tela} role="img" aria-label={rotulo}
        onPointerDown={aoBaixar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar} style={{ position: 'relative' }} />
    </div>
  );

  if (!editavel) return folha;
  const conteudo = (
    <>
      {(() => {
        const modo = (
          <div ref={modoRef} className="modo-dedo" role="group" aria-label="O que o dedo faz">
            <button type="button" aria-pressed={ativa} onClick={() => setAtiva(true)}>✏️ Escrever</button>
            <button type="button" aria-pressed={!ativa} onClick={() => setAtiva(false)}>✋ Mexer na página</button>
          </div>
        );
        return cheia ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" className="redondo redondo-claro" onClick={() => setCheia(false)} aria-label="Sair da tela cheia" title="Sair da tela cheia"><IcoVoltar /></button>
            {modo}
          </div>
        ) : (
          <div className="mb-3 flex flex-col items-center gap-2">
            {modo}
            <button type="button" className="chip" onClick={() => setCheia(true)}>⛶ Tela cheia</button>
          </div>
        );
      })()}
      {folha}
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn btn-mini flex-1" onClick={() => aplicar({ ...atual.current, altura: (Math.floor(atual.current.altura / PAGINA) + 1) * PAGINA + PAGINA })}>+ Página</button>
        <button type="button" className="btn btn-mini flex-1" onClick={() => aplicar({ ...atual.current, altura: atual.current.altura + 350 })}>+ Linhas</button>
      </div>
      <p className="ajuda">{ativa ? 'Escrevendo com o dedo. Para rolar a página, toque em “Mexer na página” (aqui em cima ou no botão sobre as ferramentas).' : 'O dedo rola a página. Toque em “Escrever” ou numa caneta para escrever. Com a caneta (Apple Pencil) é só escrever.'}</p>
      <Paleta
        ferramenta={ferramenta} setFerramenta={(f) => { setFerramenta(f); setAtiva(true); if (f !== 'laco') setSelecao(null); }}
        cor={cor} corDe={(f) => cores[corPor[f] ?? 0] || '#1a1a1a'} mini={mini} setMini={setMini}
        podeDesfazer={pilhas.d > 0} podeRefazer={pilhas.r > 0} desfazer={voltar} refazer={avancar}
        abrirCores={() => setSeletor(true)} abrirMais={() => setMais(!mais)} selecao={!!selecao} apagarSelecao={apagarSelecao}
        rolar={ativa && !modoVisivel ? () => { setAtiva(false); setMini(true); } : undefined}
      />
      {mais ? (
        <div className="lousa-mais" role="menu">
          <button type="button" role="menuitem" onClick={() => void inserir('biblia')}>📖 Texto da Bíblia</button>
          <button type="button" role="menuitem" onClick={() => void inserir('salvo')}>🔖 Algo que salvei</button>
          <button type="button" role="menuitem" onClick={() => setMais(false)}>Fechar</button>
        </div>
      ) : null}
      {seletor ? <SeletorCor inicial={cor} recentes={cores} opacidade={opacidade} aoEscolher={(c, a) => { trocarCor(c); setOpacidade(a); setSeletor(false); }} fechar={() => setSeletor(false)} /> : null}
    </>
  );
  return cheia ? <div className="lousa-cheia" role="dialog" aria-modal="true" aria-label="Escrever em tela cheia">{conteudo}</div> : <div>{conteudo}</div>;
}

// ---------- paleta flutuante ----------
const TINGE = ['caneta', 'fina', 'marca'];
/** Desenho da ferramenta; a ponta e a faixa ficam da cor escolhida para ela (a borracha e o laço não mudam). */
function IcoFerramenta({ f, cor }: { f: Ferramenta | 'regua'; cor?: string }) {
  const tinge = !!cor && TINGE.includes(f);
  const mascara = `url(${BASE}/canetas/${f}-cor.png)`;
  return (
    <span className="ico-ferr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${BASE}/canetas/${f}${tinge ? '-base' : ''}.png`} alt="" draggable={false} />
      {tinge ? <b className="ico-tinta" style={{ background: cor, WebkitMaskImage: mascara, maskImage: mascara }} /> : null}
    </span>
  );
}

function Paleta(p: {
  ferramenta: Ferramenta; setFerramenta: (f: Ferramenta) => void; cor: string; corDe: (f: Ferramenta) => string; mini: boolean; setMini: (m: boolean) => void;
  podeDesfazer: boolean; podeRefazer: boolean; desfazer: () => void; refazer: () => void;
  abrirCores: () => void; abrirMais: () => void; selecao: boolean; apagarSelecao: () => void;
  /** Só aparece enquanto o dedo escreve: volta o dedo a rolar a página. */
  rolar?: () => void;
}) {
  const botaoRolar = p.rolar ? <button type="button" className={`paleta-rolar ${p.mini ? 'mini' : ''}`} onClick={p.rolar}>✋ Mexer na página</button> : null;
  if (p.mini) {
    return (
      <>
        {botaoRolar}
        <button type="button" className="paleta paleta-mini" aria-label="Abrir as ferramentas de escrita" onClick={() => p.setMini(false)}>
          <span className="paleta-mini-cor" style={{ background: p.cor }} />
        </button>
      </>
    );
  }
  const ferramentas: [Ferramenta, string][] = [['caneta', 'Caneta'], ['fina', 'Caneta fina'], ['marca', 'Marca-texto'], ['borracha', 'Borracha']];
  return (
    <div className="paleta" role="toolbar" aria-label="Ferramentas de escrita">
      {botaoRolar}
      <div className="paleta-linha">
        <div className="paleta-grupo">
          <button type="button" className="paleta-redondo" disabled={!p.podeDesfazer} onClick={p.desfazer} aria-label="Desfazer">↶</button>
          <button type="button" className="paleta-redondo" disabled={!p.podeRefazer} onClick={p.refazer} aria-label="Refazer">↷</button>
        </div>
        <div className="paleta-ferramentas">
          {ferramentas.map(([f, nome]) => (
            <button key={f} type="button" className="paleta-ferr" aria-pressed={p.ferramenta === f} aria-label={nome} title={nome} onClick={() => p.setFerramenta(f)}>
              <IcoFerramenta f={f} cor={p.corDe(f)} />
            </button>
          ))}
        </div>
        <div className="paleta-grupo">
          <button type="button" className="paleta-anel" aria-label="Escolher a cor" title="Cor" onClick={p.abrirCores}><span style={{ background: p.cor }} /></button>
          <button type="button" className="paleta-redondo" onClick={p.abrirMais} aria-label="Acrescentar texto da Bíblia ou algo salvo">＋</button>
          <button type="button" className="paleta-redondo" onClick={() => p.setMini(true)} aria-label="Recolher as ferramentas">⌄</button>
        </div>
      </div>
      {p.selecao ? <div className="paleta-sel"><span>Arraste a seleção para mover</span><button type="button" onClick={p.apagarSelecao}>Apagar seleção</button></div> : null}
    </div>
  );
}

// ---------- seletor de cor (grade, espectro e opacidade) ----------
const GRADE: string[] = (() => {
  const cinzas = Array.from({ length: 12 }, (_, i) => `hsl(0 0% ${100 - Math.round((i / 11) * 100)}%)`);
  const matizes = [195, 215, 235, 265, 290, 320, 350, 10, 25, 40, 55, 75];
  const linhas = [18, 28, 38, 48, 58, 68, 78, 86, 93].map((l) => matizes.map((h) => `hsl(${h} ${l > 85 ? 80 : 95}% ${l}%)`));
  return [...cinzas, ...linhas.flat()];
})();
const hslParaHex = (s: string) => {
  const m = s.match(/hsl\((\d+) (\d+)% (\d+)%\)/);
  if (!m) return s;
  const h = +m[1], sa = +m[2] / 100, l = +m[3] / 100;
  const f = (n: number) => { const k = (n + h / 30) % 12; const a = sa * Math.min(l, 1 - l); const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
};

function SeletorCor({ inicial, recentes = [], opacidade, aoEscolher, fechar }: { inicial: string; recentes?: string[]; opacidade: number; aoEscolher: (cor: string, opacidade: number) => void; fechar: () => void }) {
  const [aba, setAba] = useState<'grade' | 'espectro'>('grade');
  const [cor, setCor] = useState(inicial);
  const [op, setOp] = useState(opacidade);
  const espectro = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = espectro.current; if (!c || aba !== 'espectro') return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, c.width, 0);
    for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, `hsl(${i * 30} 100% 50%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    const v = ctx.createLinearGradient(0, 0, 0, c.height);
    v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.5, 'rgba(255,255,255,0)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, c.width, c.height);
  }, [aba]);
  const pegar = (e: React.PointerEvent) => {
    const c = espectro.current; if (!c || (e.type === 'pointermove' && e.buttons === 0)) return;
    const r = c.getBoundingClientRect();
    const x = Math.max(0, Math.min(c.width - 1, ((e.clientX - r.left) / r.width) * c.width)), y = Math.max(0, Math.min(c.height - 1, ((e.clientY - r.top) / r.height) * c.height));
    const d = c.getContext('2d')!.getImageData(x, y, 1, 1).data;
    setCor(`#${[d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join('')}`);
  };
  return (
    <div className="cores-fundo" onClick={fechar}>
      <div className="cores" role="dialog" aria-label="Cores" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><b>Cores</b><button type="button" onClick={fechar} aria-label="Fechar">✕</button></div>
        {recentes.length ? (
          <div className="cores-recentes" aria-label="Suas cores">
            {recentes.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={c === cor} style={{ background: c }} onClick={() => aoEscolher(c, op)} />)}
          </div>
        ) : null}
        <div className="cores-abas">
          <button type="button" aria-pressed={aba === 'grade'} onClick={() => setAba('grade')}>Grade</button>
          <button type="button" aria-pressed={aba === 'espectro'} onClick={() => setAba('espectro')}>Espectro</button>
        </div>
        {aba === 'grade' ? (
          <div className="cores-grade">{GRADE.map((g) => { const hx = hslParaHex(g); return <button key={g} type="button" aria-label={hx} aria-pressed={hx === cor} style={{ background: hx }} onClick={() => setCor(hx)} />; })}</div>
        ) : (
          <canvas ref={espectro} width={360} height={240} className="cores-espectro" onPointerDown={pegar} onPointerMove={pegar} />
        )}
        <p className="cores-rot">Opacidade</p>
        <div className="flex items-center gap-3">
          <input type="range" min={10} max={100} value={Math.round(op * 100)} onChange={(e) => setOp(Number(e.target.value) / 100)} className="flex-1" aria-label="Opacidade" style={{ accentColor: cor }} />
          <span className="cores-pct">{Math.round(op * 100)}%</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="cores-amostra" style={{ background: cor, opacity: op }} />
          <button type="button" className="btn btn-pri flex-1" onClick={() => aoEscolher(cor, op)}>Usar esta cor</button>
        </div>
      </div>
    </div>
  );
}
