'use client';
import { BASE } from '@/lib/cliente/bibliaDados';

/**
 * Logo oficial do Púlpito ("Fita marcadora"): símbolo + nome desenhado (com a fita no "p").
 * Os SVGs ficam em public/logo/ e não devem ser redesenhados (guia: design-systems/logo/LOGO-PULPITO.md).
 * fundo "vinho": páginas brancas, "Púl" em branco e "pito" em dourado.
 * fundo "claro": símbolo em duas cores e nome em vinho com a fita dourada.
 * Símbolo e nome com a mesma altura; espaço entre eles = 0,2 × a altura.
 */
export function Logo({ fundo = 'vinho', tamanho = 30 }: { fundo?: 'vinho' | 'claro'; tamanho?: number }) {
  const vinho = fundo === 'vinho';
  const altura = Math.round(tamanho * 1.7);
  return (
    <span className="inline-flex items-center" role="img" aria-label="Púlpito" style={{ gap: altura * 0.2 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${BASE}/logo/${vinho ? 'simbolo-fundo-vinho' : 'simbolo'}.svg`} alt="" width={altura} height={altura} style={{ height: altura, width: 'auto', display: 'block' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${BASE}/logo/${vinho ? 'nome-fundo-vinho' : 'nome'}.svg`} alt="" height={altura} style={{ height: altura, width: 'auto', display: 'block' }} />
    </span>
  );
}
