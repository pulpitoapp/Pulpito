'use client';
import { IcoVoltar } from './Icones';
import { ir } from './contexto';

/** Cabeçalho de cada módulo, com o botão de voltar. */
export function Cabecalho({ titulo, sub, voltar = '/', children }: { titulo: string; sub?: string; voltar?: string; children?: React.ReactNode }) {
  return (
    <header className="topo sticky top-0 z-20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2 md:max-w-3xl lg:max-w-5xl">
        <button type="button" onClick={() => ir(voltar)} aria-label={voltar === '/' ? 'Voltar ao início' : 'Voltar'} className="redondo"><IcoVoltar /></button>
        <div className="flex-1">
          {sub ? <p className="rot m-0 truncate">{sub}</p> : null}
          <h1 className="tit truncate">{titulo}</h1>
        </div>
        {children}
      </div>
    </header>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return <p className="rot p-10 text-center" role="status">{texto}</p>;
}

/** Janela de confirmação simples. */
export function Confirmar({ titulo, texto, acao, perigo, onSim, onNao }: { titulo: string; texto: string; acao: string; perigo?: boolean; onSim: () => void; onNao: () => void }) {
  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="cartao w-full max-w-sm">
        <h2 className="tit">{titulo}</h2>
        <p className="my-3 text-[15px]">{texto}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onNao}>Cancelar</button>
          <button type="button" className={`btn ${perigo ? 'btn-perigo' : 'btn-pri'}`} onClick={onSim}>{acao}</button>
        </div>
      </div>
    </div>
  );
}
