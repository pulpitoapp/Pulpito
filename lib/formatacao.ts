// Formatação simples do texto digitado: *negrito* e _itálico_ (como no WhatsApp).
export type Pedaco = { t: string; b?: boolean; i?: boolean };

/** Quebra uma linha em pedaços com estilo. Marcas sem par ficam como texto comum. */
export function pedacos(linha: string): Pedaco[] {
  const out: Pedaco[] = [];
  const re = /\*([^*\n]+)\*|_([^_\n]+)_/g;
  let ult = 0, m: RegExpExecArray | null;
  while ((m = re.exec(linha))) {
    if (m.index > ult) out.push({ t: linha.slice(ult, m.index) });
    if (m[1] != null) {
      // itálico dentro do negrito: *_assim_*
      for (const p of pedacos(m[1])) out.push({ ...p, b: true });
    } else out.push({ t: m[2], i: true });
    ult = re.lastIndex;
  }
  if (ult < linha.length) out.push({ t: linha.slice(ult) });
  return out;
}
