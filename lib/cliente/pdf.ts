'use client';
// Gera o PDF da mensagem (texto justificado) e abre o menu de compartilhar do celular.
import type { BibliaDados } from '@/lib/biblia';
import { rotuloChave, textoChave } from '@/lib/textos';
import type { Mensagem } from '@/lib/tipos';
import { alturaUsada, tracosEmImagem } from '@/components/Lousa';
import { pedacos } from '@/lib/formatacao';

export async function gerarPdf(m: Mensagem, biblia: BibliaDados | null): Promise<File> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const L = 56, T = 64, larg = doc.internal.pageSize.getWidth() - L * 2, fim = doc.internal.pageSize.getHeight() - 64;
  let y = T;
  const espaco = (h: number) => { if (y + h > fim) { doc.addPage(); y = T; } };

  const paragrafo = (txt: string, o: { tam?: number; estilo?: 'normal' | 'bold' | 'italic'; justo?: boolean; recuo?: number; cor?: [number, number, number] } = {}) => {
    const tam = o.tam ?? 12, alt = tam * 1.5, x = L + (o.recuo ?? 0), w = larg - (o.recuo ?? 0);
    doc.setFont('times', o.estilo ?? 'normal'); doc.setFontSize(tam); doc.setTextColor(...(o.cor ?? [41, 46, 51]));
    for (const bloco of String(txt || '').split(/\n+/).map((s) => s.trim()).filter(Boolean)) {
      const linhas = doc.splitTextToSize(bloco, w) as string[];
      linhas.forEach((linha, i) => {
        espaco(alt);
        const palavras = linha.trim().split(/\s+/);
        // justifica todas as linhas, menos a última de cada parágrafo
        if (o.justo !== false && i < linhas.length - 1 && palavras.length > 1) {
          const ocupado = palavras.reduce((soma, pal) => soma + doc.getTextWidth(pal), 0);
          const vao = (w - ocupado) / (palavras.length - 1);
          let px = x;
          for (const pal of palavras) { doc.text(pal, px, y); px += doc.getTextWidth(pal) + vao; }
        } else doc.text(linha, x, y);
        y += alt;
      });
      y += tam * 0.45;
    }
  };

  // parágrafo com *negrito* e _itálico_ misturados, justificado
  const paragrafoRico = (txt: string) => {
    const tam = 12, alt = tam * 1.5;
    doc.setFontSize(tam); doc.setTextColor(41, 46, 51);
    const estiloDe = (b?: boolean, i?: boolean) => (b && i ? 'bolditalic' : b ? 'bold' : i ? 'italic' : 'normal');
    const espacoW = () => { doc.setFont('times', 'normal'); return doc.getTextWidth(' '); };
    for (const bloco of String(txt || '').split(/\n+/).map((s) => s.trim()).filter(Boolean)) {
      // palavras com estilo (uma palavra pode ter partes de estilos diferentes)
      const palavras: { partes: { t: string; e: string }[]; w: number }[] = [];
      let atual: { partes: { t: string; e: string }[]; w: number } | null = null;
      for (const p of pedacos(bloco)) {
        const e = estiloDe(p.b, p.i);
        p.t.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { atual = null; return; }
          doc.setFont('times', e);
          if (!atual) { atual = { partes: [], w: 0 }; palavras.push(atual); }
          atual.partes.push({ t: tok, e }); atual.w += doc.getTextWidth(tok);
        });
      }
      const sp = espacoW();
      const linhas: (typeof palavras)[] = [];
      let linha: typeof palavras = [], w = 0;
      for (const pal of palavras) {
        if (linha.length && w + sp + pal.w > larg) { linhas.push(linha); linha = []; w = 0; }
        w += (linha.length ? sp : 0) + pal.w; linha.push(pal);
      }
      if (linha.length) linhas.push(linha);
      linhas.forEach((ln, i) => {
        espaco(alt);
        const ocupado = ln.reduce((s, p) => s + p.w, 0);
        const vao = i < linhas.length - 1 && ln.length > 1 ? (larg - ocupado) / (ln.length - 1) : sp;
        let px = L;
        for (const pal of ln) { for (const pt of pal.partes) { doc.setFont('times', pt.e); doc.text(pt.t, px, y); px += doc.getTextWidth(pt.t); } px += vao; }
        y += alt;
      });
      y += tam * 0.45;
    }
  };
  const titulo = (txt: string) => { y += 8; espaco(40); paragrafo(txt.toUpperCase(), { tam: 10, estilo: 'bold', justo: false, cor: [125, 122, 112] }); };
  const c = m.conteudo;

  paragrafo(m.titulo || 'Mensagem', { tam: 22, estilo: 'bold', justo: false });
  if (m.tema) paragrafo(m.tema, { tam: 13, estilo: 'italic', justo: false });
  if (m.autor_linha) paragrafo(m.autor_linha, { tam: 10, justo: false, cor: [125, 122, 112] });
  doc.setDrawColor(207, 200, 182); doc.setLineWidth(1); doc.line(L, y, L + larg, y); y += 16;

  if (c.refs.length) {
    titulo('Textos');
    for (const r of c.refs) {
      paragrafo(rotuloChave(r.ref), { estilo: 'bold', justo: false });
      const t = textoChave(r.ref, biblia);
      if (t) paragrafo(t, { estilo: 'italic', recuo: 10 });
    }
  }
  if (c.texto.trim()) { titulo('Mensagem'); paragrafoRico(c.texto.replace(/⟦([^⟧]+)⟧/g, '$1')); }
  if (c.tracos.length || (c.blocos || []).length) {
    titulo('Anotações à mão');
    const altura = Math.min(c.altura, alturaUsada(c.tracos, c.blocos || []) + 40);
    const img = tracosEmImagem(c.tracos, altura, 1100, c.blocos || []);
    let resto = (altura / 1000) * larg, origem = 0;
    // a folha pode ser mais alta que a página: é fatiada
    while (resto > 0 && img) {
      const cabe = Math.max(80, fim - y), fatia = Math.min(resto, cabe);
      const corte = document.createElement('canvas');
      corte.width = 1100; corte.height = Math.round((fatia / larg) * 1100);
      const ctx = corte.getContext('2d');
      const fonte = new Image(); fonte.src = img;
      await new Promise((ok) => { fonte.onload = ok; fonte.onerror = ok; });
      ctx?.drawImage(fonte, 0, Math.round((origem / larg) * 1100), 1100, corte.height, 0, 0, 1100, corte.height);
      doc.addImage(corte.toDataURL('image/jpeg', 0.85), 'JPEG', L, y, larg, fatia);
      resto -= fatia; origem += fatia; y += fatia;
      if (resto > 0) { doc.addPage(); y = T; }
    }
  }
  // textos colocados como links (na folha ou no texto digitado): o conteúdo vai aqui
  const citados = new Map<string, string>();
  for (const b of c.blocos || []) citados.set(b.titulo, b.texto);
  for (const [t, x] of Object.entries(c.links || {})) if (c.texto.includes(`⟦${t}⟧`)) citados.set(t, x);
  if (citados.size) {
    titulo('Textos citados');
    for (const [t, x] of citados) { paragrafo(t, { estilo: 'bold', justo: false }); if (x) paragrafo(x, { estilo: 'italic', recuo: 10 }); }
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFont('times', 'normal'); doc.setFontSize(9); doc.setTextColor(125, 122, 112);
    doc.text(`Púlpito · ${i}/${total}`, L + larg, fim + 30, { align: 'right' });
  }
  const nome = (m.titulo || 'mensagem').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'mensagem';
  return new File([doc.output('blob')], `${nome}.pdf`, { type: 'application/pdf' });
}

/** Compartilha pelo menu do sistema (celular) ou baixa o arquivo (computador). */
export async function compartilharArquivo(arquivo: File, titulo: string): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [arquivo] })) {
    try { await nav.share({ files: [arquivo], title: titulo }); return 'compartilhado'; }
    catch (e) { if ((e as Error)?.name === 'AbortError') return 'cancelado'; }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url; a.download = arquivo.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'baixado';
}
