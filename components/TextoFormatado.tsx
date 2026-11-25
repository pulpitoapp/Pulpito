'use client';
import { useState } from 'react';
import { pedacos } from '@/lib/formatacao';

/** Mostra o texto com *negrito* e _itálico_ aplicados, mantendo as quebras de linha.
 *  ⟦título⟧ vira um link: o toque abre um balão com o texto colocado. */
export function TextoFormatado({ texto, links }: { texto: string; links?: Record<string, string> }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const estilo = (t: string, k: string) => pedacos(t).map((p, i) => (p.b && p.i ? <b key={k + i}><i>{p.t}</i></b> : p.b ? <b key={k + i}>{p.t}</b> : p.i ? <i key={k + i}>{p.t}</i> : <span key={k + i}>{p.t}</span>));
  return (
    <>
      {texto.split('\n').map((linha, n) => (
        <span key={n}>
          {n ? <br /> : null}
          {linha.split(/(⟦[^⟧]+⟧)/).map((parte, j) => {
            const m = parte.match(/^⟦([^⟧]+)⟧$/);
            if (!m) return estilo(parte, `${j}-`);
            const t = m[1], chave = `${n}.${j}`;
            return (
              <span key={j} className="link-texto-envolta">
                <button type="button" className="link-texto" aria-expanded={aberto === chave} onClick={(e) => { e.stopPropagation(); setAberto(aberto === chave ? null : chave); }}>↗ {t}</button>
                {aberto === chave ? (
                  <span className="balao-texto" role="dialog" aria-label={t} onClick={(e) => e.stopPropagation()}>
                    <b>{t}</b>
                    <span className="block">{links?.[t] || 'Texto não encontrado.'}</span>
                    <button type="button" className="rot mt-2 underline" onClick={() => setAberto(null)}>Fechar</button>
                  </span>
                ) : null}
              </span>
            );
          })}
        </span>
      ))}
    </>
  );
}
