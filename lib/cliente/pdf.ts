'use client';
// Gera o PDF da mensagem (texto justificado) e abre o menu de compartilhar do celular.
import type { BibliaDados } from '@/lib/biblia';
import { rotuloChave, textoChave } from '@/lib/textos';
import type { Mensagem } from '@/lib/tipos';
import { alturaUsada, tracosEmImagem } from '@/components/Lousa';

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
  if (c.texto.trim()) { titulo('Mensagem'); paragrafo(c.texto); }
  if (c.tracos.length) {
    titulo('Anotações à mão');
    const altura = Math.min(c.altura, alturaUsada(c.tracos) + 40);
    const img = tracosEmImagem(c.tracos, altura, 1100);
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
