'use client';
// Abertura do app (3 segundos): a Bíblia se abre, o marcador desce até o lugar dele no logo,
// o resto do livro some e o nome "Púlpito" aparece embaixo.
// Aparece uma vez a cada vez que o app é aberto; um toque pula. Quem pede menos movimento no
// aparelho vê só o logo, sem animação.
import { useEffect, useState } from 'react';

const DURACAO = 3000;

export function Abertura() {
  // começa visível já no HTML inicial, para o app não aparecer por um instante antes da abertura
  const [ver, setVer] = useState(true);
  useEffect(() => {
    let ja = false;
    try { ja = sessionStorage.getItem('pulpito:abertura') === '1'; sessionStorage.setItem('pulpito:abertura', '1'); } catch { /* sem armazenamento: mostra */ }
    const calmo = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setVer(false), ja ? 0 : calmo ? 900 : DURACAO);
    return () => clearTimeout(t);
  }, []);
  if (!ver) return null;
  return (
    <div className="abertura" role="img" aria-label="Púlpito" onClick={() => setVer(false)}>
      <div className="ab-centro">
        <svg className="ab-svg" viewBox="0 0 96 96" aria-hidden="true">
          {/* capa e detalhes da Bíblia: somem depois que o marcador chega */}
          <g className="ab-extra">
            <path className="ab-capa-esq" d="M44 24C34 18 18 18 5 22V63C18 59 34 59 46 65L48 65V26Z" fill="#2c0b15" stroke="#c9a24a" strokeWidth=".8" />
            <path className="ab-capa-dir" d="M52 24C62 18 78 18 91 22V63C78 59 62 59 50 65L48 65V26Z" fill="#2c0b15" stroke="#c9a24a" strokeWidth=".8" />
          </g>
          <g className="ab-pag-esq">
            <path d="M46 22C36 16 22 16 10 20V58C22 54 36 54 46 60Z" fill="#ffffff" />
            <g className="ab-extra" stroke="#4a1626" strokeOpacity=".28" strokeWidth=".9" strokeLinecap="round">
              <path d="M15 27C24 24 34 24 41 28" fill="none" /><path d="M15 32C24 29 34 29 41 33" fill="none" /><path d="M15 37C24 34 34 34 41 38" fill="none" />
              <path d="M15 42C24 39 34 39 41 43" fill="none" /><path d="M15 47C24 44 34 44 41 48" fill="none" /><path d="M15 52C22 49 30 49 35 51" fill="none" />
            </g>
          </g>
          <g className="ab-pag-dir">
            <path d="M50 22C60 16 74 16 86 20V58C74 54 60 54 50 60Z" fill="#ffffff" />
            <g className="ab-extra" stroke="#4a1626" strokeOpacity=".28" strokeWidth=".9" strokeLinecap="round">
              <path d="M55 28C62 24 72 24 81 27" fill="none" /><path d="M55 33C62 29 72 29 81 32" fill="none" /><path d="M55 38C62 34 72 34 81 37" fill="none" />
              <path d="M55 43C62 39 72 39 81 42" fill="none" /><path d="M55 48C62 44 72 44 81 47" fill="none" />
            </g>
          </g>
          <path className="ab-fita" d="M58 52H66V80L62 75L58 80Z" fill="#c9a24a" />
        </svg>
        <p className="ab-nome">Púl<span>pito</span></p>
      </div>
    </div>
  );
}
