'use client';
// Aparência do app: claro, escuro ou automático (segue o celular).
export type Tema = 'claro' | 'escuro' | 'auto';
const CHAVE = 'pulpito:tema';

export function lerTema(): Tema {
  // padrão: claro. A escolha da pessoa fica guardada no aparelho.
  try { const v = JSON.parse(localStorage.getItem(CHAVE) || '"claro"'); return v === 'escuro' || v === 'auto' ? v : 'claro'; } catch { return 'claro'; }
}
let ouvinte: ((e: MediaQueryListEvent) => void) | null = null;
/** Aplica o tema na página (atributo data-tema no <html>) e acompanha o celular no modo automático. */
export function aplicarTema(t: Tema = lerTema()) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const pinta = () => {
    const escuro = t === 'escuro' || (t === 'auto' && mq.matches);
    document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#4a1626');
  };
  if (ouvinte) mq.removeEventListener('change', ouvinte);
  ouvinte = t === 'auto' ? () => pinta() : null;
  if (ouvinte) mq.addEventListener('change', ouvinte);
  pinta();
}
export function escolherTema(t: Tema) {
  try { localStorage.setItem(CHAVE, JSON.stringify(t)); } catch { /* sem armazenamento */ }
  aplicarTema(t);
}
