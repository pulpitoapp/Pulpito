'use client';
// Leitura da Bíblia: capítulos lidos (e quantas vezes) e tempo de uso do app por dia.
// Fica primeiro no aparelho e é enviado ao Supabase quando houver internet (só o dono vê).
import { useSyncExternalStore } from 'react';
import { gravar, ler } from './local';
import { supa } from './supabase';

/** Quantidade de capítulos de cada livro (Gênesis … Apocalipse). */
export const CAPITULOS = [50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22];
export const TOTAL_CAPITULOS = CAPITULOS.reduce((a, b) => a + b, 0);   // 1189

type Lido = { v: number; u: string };          // vezes que leu; quando leu por último
type Estado = { uid: string; pronto: boolean; lidos: Record<string, Lido>; uso: Record<string, number>; fila: { lidos: string[]; uso: string[] } };
let estado: Estado = { uid: '', pronto: false, lidos: {}, uso: {}, fila: { lidos: [], uso: [] } };
const ouvintes = new Set<() => void>();
const mudar = (p: Partial<Estado>) => {
  estado = { ...estado, ...p };
  ouvintes.forEach((f) => f());
  if (estado.uid) void gravar('leitura:' + estado.uid, { lidos: estado.lidos, uso: estado.uso, fila: estado.fila });
};
export const useLeitura = () => useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => estado, () => estado);
const mais = (l: string[], x: string) => (l.includes(x) ? l : [...l, x]);
export const hoje = () => new Date().toLocaleDateString('sv-SE');          // AAAA-MM-DD no fuso do aparelho

export async function iniciarLeitura(uid: string) {
  if (estado.uid === uid && estado.pronto) return;
  const salvo = await ler<Partial<Estado> | null>('leitura:' + uid, null);
  estado = { uid, pronto: true, lidos: salvo?.lidos || {}, uso: salvo?.uso || {}, fila: { lidos: [], uso: [], ...(salvo?.fila || {}) } };
  ouvintes.forEach((f) => f());
  void sincronizarLeitura();
}

const ref = (l: number, c: number) => `${l}.${c}`;
export const vezesLido = (l: number, c: number) => estado.lidos[ref(l, c)]?.v || 0;

/** Conta mais uma leitura do capítulo (chamado quando a pessoa chega a ~75% do capítulo). */
export function contarLeitura(l: number, c: number) {
  const k = ref(l, c);
  mudar({ lidos: { ...estado.lidos, [k]: { v: (estado.lidos[k]?.v || 0) + 1, u: new Date().toISOString() } }, fila: { ...estado.fila, lidos: mais(estado.fila.lidos, k) } });
  void sincronizarLeitura();
}
/** Marca ou desmarca capítulos à mão (edição do progresso). */
export function definirLidos(refs: [number, number][], lido: boolean) {
  const lidos = { ...estado.lidos };
  let fila = estado.fila.lidos;
  for (const [l, c] of refs) {
    const k = ref(l, c);
    lidos[k] = lido ? { v: Math.max(1, lidos[k]?.v || 0), u: lidos[k]?.u || new Date().toISOString() } : { v: 0, u: new Date().toISOString() };
    fila = mais(fila, k);
  }
  mudar({ lidos, fila: { ...estado.fila, lidos: fila } });
  void sincronizarLeitura();
}

/** Soma tempo de uso ao dia de hoje. */
export function somarUso(segundos: number) {
  if (!estado.uid || segundos <= 0) return;
  const d = hoje();
  mudar({ uso: { ...estado.uso, [d]: Math.min(86400, (estado.uso[d] || 0) + Math.round(segundos)) }, fila: { ...estado.fila, uso: mais(estado.fila.uso, d) } });
}

let emCurso: Promise<void> | null = null;
export function sincronizarLeitura(): Promise<void> {
  if (!estado.uid || (typeof navigator !== 'undefined' && navigator.onLine === false)) return Promise.resolve();
  if (emCurso) return emCurso;
  emCurso = (async () => {
    const db = supa();
    try {
      const refs = [...estado.fila.lidos], dias = [...estado.fila.uso];
      if (refs.length) {
        const { error } = await db.from('leituras').upsert(refs.map((k) => ({ ref: k, vezes: estado.lidos[k]?.v || 0, ultima: estado.lidos[k]?.u || new Date().toISOString() })));
        if (!error) mudar({ fila: { ...estado.fila, lidos: estado.fila.lidos.filter((k) => !refs.includes(k)) } });
      }
      if (dias.length) {
        const { error } = await db.from('uso_diario').upsert(dias.map((d) => ({ dia: d, segundos: estado.uso[d] || 0 })));
        if (!error) mudar({ fila: { ...estado.fila, uso: estado.fila.uso.filter((d) => !dias.includes(d)) } });
      }
      // traz o que foi lido em outros aparelhos (vale o maior número)
      const [rl, ru] = await Promise.all([db.from('leituras').select('ref, vezes, ultima').limit(5000), db.from('uso_diario').select('dia, segundos').limit(5000)]);
      if (rl.error || ru.error) return;
      const lidos = { ...estado.lidos };
      for (const r of rl.data || []) if (!estado.fila.lidos.includes(r.ref) && (r.vezes > (lidos[r.ref]?.v || 0) || !lidos[r.ref])) lidos[r.ref] = { v: r.vezes, u: r.ultima };
      const uso = { ...estado.uso };
      for (const r of ru.data || []) if (!estado.fila.uso.includes(r.dia) && r.segundos > (uso[r.dia] || 0)) uso[r.dia] = r.segundos;
      mudar({ lidos, uso });
    } catch { /* sem internet: fica na fila */ } finally { emCurso = null; }
  })();
  return emCurso;
}

/** Resumo do progresso: capítulos e livros lidos, porcentagem da Bíblia. */
export function resumo(lidos: Record<string, Lido>) {
  let caps = 0, livros = 0;
  const porLivro = CAPITULOS.map((n, l) => {
    let feitos = 0;
    for (let c = 0; c < n; c++) if ((lidos[`${l}.${c}`]?.v || 0) > 0) feitos++;
    caps += feitos; if (feitos === n) livros++;
    return feitos;
  });
  return { caps, livros, porLivro, pct: caps / TOTAL_CAPITULOS };
}

/** Porcentagem no formato brasileiro (vírgula), com 1 casa abaixo de 10%. */
export const porcento = (x: number) => `${(x * 100).toLocaleString('pt-BR', { maximumFractionDigits: x > 0 && x < 0.1 ? 1 : 0 })}%`;
