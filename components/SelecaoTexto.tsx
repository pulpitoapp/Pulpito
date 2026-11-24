'use client';
// Barra que aparece quando a pessoa seleciona um trecho de texto dentro de uma área (comentário, dicionário):
// Copiar · Compartilhar · Salvar (vai para Meus documentos).
import { useEffect, useState } from 'react';
import { salvarDocumento } from '@/lib/cliente/documentos';
import { pref } from '@/lib/cliente/local';
import { useApp } from './contexto';

export function SelecaoTexto({ area, origem, refTexto, l, c, v }: { area: React.RefObject<HTMLElement | null>; origem: string; refTexto: string; l: number; c: number; v: number }) {
  const { avisar } = useApp();
  const [texto, setTexto] = useState('');
  useEffect(() => {
    const ver = () => {
      const s = window.getSelection();
      const t = s?.toString().trim() || '';
      const dentro = !!(s && s.rangeCount && area.current?.contains(s.getRangeAt(0).commonAncestorContainer));
      setTexto(dentro && t.length > 2 ? t : '');
    };
    document.addEventListener('selectionchange', ver);
    return () => document.removeEventListener('selectionchange', ver);
  }, [area]);
  if (!texto) return null;
  const credito = `${texto}\n\n— ${origem} · ${refTexto} (Púlpito)`;
  const limpar = () => { window.getSelection()?.removeAllRanges(); setTexto(''); };
  return (
    <div className="barra-selecao" role="toolbar" aria-label="Trecho selecionado" onPointerDown={(e) => e.preventDefault()}>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(credito); avisar('Trecho copiado'); } catch { avisar('Não foi possível copiar'); } limpar(); }}>Copiar</button>
      <button type="button" onClick={async () => {
        try { if (navigator.share) await navigator.share({ text: credito }); else { await navigator.clipboard.writeText(credito); avisar('Trecho copiado'); } } catch { /* cancelado */ }
        limpar();
      }}>Compartilhar</button>
      <button type="button" onClick={async () => {
        try {
          await salvarDocumento({ titulo: `${refTexto} · trecho de ${origem}`.slice(0, 200), tipo: 'anotacao', pasta_id: pref.ler<string>('docs-ultima-pasta', '') || null,
            conteudo: { ref: refTexto, l, c, v, blocos: [{ obra: 'trecho', secoes: [{ titulo: origem, original: '', texto }] }] } });
          avisar('Trecho salvo em Meus documentos');
        } catch (e) { avisar((e as Error).message); }
        limpar();
      }}>Salvar</button>
    </div>
  );
}
