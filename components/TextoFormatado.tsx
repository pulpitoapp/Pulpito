'use client';
import { pedacos } from '@/lib/formatacao';

/** Mostra o texto com *negrito* e _itálico_ aplicados, mantendo as quebras de linha. */
export function TextoFormatado({ texto }: { texto: string }) {
  return (
    <>
      {texto.split('\n').map((linha, n) => (
        <span key={n}>
          {n ? <br /> : null}
          {pedacos(linha).map((p, i) => (p.b && p.i ? <b key={i}><i>{p.t}</i></b> : p.b ? <b key={i}>{p.t}</b> : p.i ? <i key={i}>{p.t}</i> : <span key={i}>{p.t}</span>))}
        </span>
      ))}
    </>
  );
}
