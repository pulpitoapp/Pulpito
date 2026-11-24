'use client';
// PDF do comentário bíblico com o visual do Púlpito (faixa vinho, logo, dourado, texto justificado).
// Fonte Noto Serif (licença SIL OFL), recortada para latim + grego, em public/fontes.
import type { jsPDF as JsPDF } from 'jspdf';
import { BASE } from './bibliaDados';

export type SecaoPdf = { titulo: string; original: string; texto: string };
export type BlocoPdf = { autor: string; rotulo: string; obra: string; ano: string; secoes: SecaoPdf[] };
export type ComentarioPdf = { ref: string; sufixo: string; blocos: BlocoPdf[] };

const HEB = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
/** O jsPDF não inverte o hebraico: invertemos a ordem das letras (mantendo os sinais junto de cada letra). */
const inverterHeb = (w: string) => (w.match(/[^\u0591-\u05C7]?[\u0591-\u05C7]*/gu) || []).filter(Boolean).reverse().join('');

const VINHO: [number, number, number] = [74, 22, 38];
const OURO: [number, number, number] = [201, 162, 74];
const TINTA: [number, number, number] = [43, 33, 36];
const CINZA: [number, number, number] = [125, 112, 116];
const FUNDO: [number, number, number] = [250, 247, 245];

const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><path d="M46 22C36 16 22 16 10 20V58C22 54 36 54 46 60Z" fill="#ffffff"/><path d="M50 22C60 16 74 16 86 20V58C74 54 60 54 50 60Z" fill="#ffffff"/><path d="M58 52H66V80L62 75L58 80Z" fill="#c9a24a"/></svg>';

let fontes: Promise<Record<string, string>> | null = null;
function carregarFontes() {
  fontes ??= (async () => {
    const nomes = { normal: 'NotoSerif_400Regular', bold: 'NotoSerif_700Bold', italic: 'NotoSerif_400Regular_Italic', hebraico: 'NotoSerifHebrew_400Regular' };
    const out: Record<string, string> = {};
    for (const [estilo, n] of Object.entries(nomes)) {
      const r = await fetch(`${BASE}/fontes/${n}.ttf`);
      if (!r.ok) throw new Error('fonte');
      const bytes = new Uint8Array(await r.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      out[estilo] = btoa(bin);
    }
    return out;
  })().catch((e) => { fontes = null; throw e; });
  return fontes;
}

async function logoPng(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO_SVG);
    await img.decode();
    const c = document.createElement('canvas'); c.width = 384; c.height = 384;
    c.getContext('2d')?.drawImage(img, 0, 0, 384, 384);
    return c.toDataURL('image/png');
  } catch { return null; }
}

/** Texto sem marcações, com as referências {{Jhn.1.3}} por extenso. */
export type Conversor = (t: string) => string;

export async function gerarPdfComentario(c: ComentarioPdf, plano: Conversor): Promise<File> {
  const [{ jsPDF }, f, logo] = await Promise.all([import('jspdf'), carregarFontes(), logoPng()]);
  const doc: JsPDF = new jsPDF({ unit: 'pt', format: 'a4' });
  for (const [estilo, b64] of Object.entries(f)) {
    doc.addFileToVFS(`noto-${estilo}.ttf`, b64);
    if (estilo === 'hebraico') doc.addFont('noto-hebraico.ttf', 'NotoHeb', 'normal');
    else doc.addFont(`noto-${estilo}.ttf`, 'Noto', estilo);
  }
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const L = 58, larg = W - L * 2, T = 70, fim = H - 70;
  let y = 0;

  const fundo = () => { doc.setFillColor(...FUNDO); doc.rect(0, 0, W, H, 'F'); };
  const novaPagina = () => {
    doc.addPage(); fundo();
    // faixa fina vinho no topo das páginas seguintes
    doc.setFillColor(...VINHO); doc.rect(0, 0, W, 26, 'F');
    doc.setFont('Noto', 'normal'); doc.setFontSize(8.5); doc.setTextColor(231, 207, 213);
    doc.text(`${c.ref.toUpperCase()}  ·  COMENTÁRIO`, L, 17, { charSpace: 1.2 });
    y = T;
  };
  const espaco = (h: number) => { if (y + h > fim) novaPagina(); };

  // ---------- capa: faixa vinho ----------
  fundo();
  const alturaFaixa = 168;
  doc.setFillColor(...VINHO); doc.rect(0, 0, W, alturaFaixa, 'F');
  if (logo) doc.addImage(logo, 'PNG', L - 6, 34, 46, 46);
  doc.setFont('Noto', 'bold'); doc.setFontSize(11); doc.setTextColor(...OURO);
  doc.text('PÚLPITO', L + 48, 62, { charSpace: 3 });
  doc.setFont('Noto', 'bold'); doc.setFontSize(30); doc.setTextColor(255, 255, 255);
  doc.text(c.ref, L, 122);
  doc.setFont('Noto', 'italic'); doc.setFontSize(12); doc.setTextColor(231, 207, 213);
  const b0 = c.blocos[0];
  doc.text(c.blocos.length > 1 ? `Comparação de comentários · ${c.blocos.map((b) => b.autor).join(', ')}` : `Comentário · ${b0.autor}, ${b0.obra} (${b0.ano})`, L, 146, { maxWidth: larg });
  doc.setDrawColor(...OURO); doc.setLineWidth(2.2); doc.line(L, alturaFaixa, L + 70, alturaFaixa);
  y = alturaFaixa + 46;

  // escreve palavra por palavra, trocando para a fonte hebraica quando a palavra é hebraica
  // uma palavra pode misturar hebraico e pontuação: cada pedaço é escrito com a sua fonte
  const pedacos = (w: string) => w.split(/([\u0590-\u05FF\uFB1D-\uFB4F]+)/).filter(Boolean);
  const largura = (w: string, estilo: string) => pedacos(w).reduce((t, p) => {
    if (HEB.test(p)) { doc.setFont('NotoHeb', 'normal'); return t + doc.getTextWidth(inverterHeb(p)); }
    doc.setFont('Noto', estilo); return t + doc.getTextWidth(p);
  }, 0);
  const escrever = (w: string, x: number, yy: number, estilo: string) => {
    let px = x;
    for (const p of pedacos(w)) {
      if (HEB.test(p)) { doc.setFont('NotoHeb', 'normal'); const r = inverterHeb(p); doc.text(r, px, yy); px += doc.getTextWidth(r); }
      else { doc.setFont('Noto', estilo); doc.text(p, px, yy); px += doc.getTextWidth(p); }
    }
  };
  const linhasDe = (txt: string, w: number, estilo: string) => {
    const linhas: string[][] = []; let atual: string[] = [], ocup = 0;
    const esp = largura(' ', estilo);
    for (const p of txt.split(/\s+/).filter(Boolean)) {
      const lw = largura(p, estilo);
      if (atual.length && ocup + esp + lw > w) { linhas.push(atual); atual = []; ocup = 0; }
      ocup += (atual.length ? esp : 0) + lw; atual.push(p);
    }
    if (atual.length) linhas.push(atual);
    return linhas;
  };
  const paragrafo = (txt: string, tam = 11.5) => {
    const alt = tam * 1.55;
    doc.setFontSize(tam); doc.setTextColor(...TINTA);
    const linhas = linhasDe(txt, larg, 'normal');
    linhas.forEach((palavras, i) => {
      espaco(alt);
      const ocupado = palavras.reduce((s, p) => s + largura(p, 'normal'), 0);
      const vao = i < linhas.length - 1 && palavras.length > 1 ? (larg - ocupado) / (palavras.length - 1) : largura(' ', 'normal');
      let px = L;
      for (const p of palavras) { escrever(p, px, y, 'normal'); px += largura(p, 'normal') + vao; }
      y += alt;
    });
    y += tam * 0.6;
  };
  const linhaSimples = (txt: string, x: number, estilo: string) => {
    let px = x;
    for (const p of txt.split(/\s+/).filter(Boolean)) { escrever(p, px, y, estilo); px += largura(p, estilo) + largura(' ', estilo); }
  };

  const varios = c.blocos.length > 1;
  c.blocos.forEach((bl, bi) => {
    if (varios) {
      if (bi > 0) y += 14;
      espaco(90);
      doc.setFillColor(...VINHO); doc.roundedRect(L, y - 16, larg, 30, 4, 4, 'F');
      doc.setFont('Noto', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
      doc.text(bl.autor, L + 12, y + 3);
      doc.setFont('Noto', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...OURO);
      doc.text(bl.rotulo.toUpperCase(), L + larg - 12, y + 3, { align: 'right', charSpace: 0.8 });
      y += 40;
    }
  bl.secoes.forEach((s, i) => {
    if (i > 0) y += 10;
    espaco(70);
    // título do tópico: marcador dourado + título vinho + grego
    doc.setFillColor(...OURO); doc.rect(L, y - 13, 3.5, 17, 'F');
    doc.setFont('Noto', 'bold'); doc.setFontSize(15); doc.setTextColor(...VINHO);
    const tl = doc.splitTextToSize(s.titulo, larg - 14) as string[];
    tl.forEach((t, j) => { if (j) { y += 20; espaco(20); } doc.text(t, L + 14, y); });
    y += 18;
    if (s.original) {
      doc.setFontSize(12.5); doc.setTextColor(...CINZA);
      linhaSimples(s.original, L + 14, 'italic'); y += 18;
    }
    y += 6;
    for (const par of plano(s.texto).split(/\n\n+/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean)) paragrafo(par);
  });
  });

  // ---------- rodapé ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...OURO); doc.setLineWidth(0.6); doc.line(L, H - 50, L + larg, H - 50);
    doc.setFont('Noto', 'normal'); doc.setFontSize(8); doc.setTextColor(...CINZA);
    doc.text(`${c.blocos.map((b) => `${b.autor}, ${b.obra} (${b.ano})`).join('; ')}. Domínio público. Tradução para o português feita pelo app Púlpito, sem revisão de especialista.`, L, H - 36, { maxWidth: larg - 40 });
    doc.text(`${i}/${total}`, L + larg, H - 36, { align: 'right' });
  }

  const nome = `${c.ref}-comentario-${c.sufixo}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 70);
  return new File([doc.output('blob')], `${nome}.pdf`, { type: 'application/pdf' });
}
