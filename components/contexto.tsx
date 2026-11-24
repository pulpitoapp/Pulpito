'use client';
import { createContext, useContext } from 'react';
import type { Perfil } from '@/lib/tipos';

export type Ctx = {
  perfil: Perfil;
  online: boolean;
  avisar: (texto: string) => void;          // mensagem rápida no rodapé
  atualizarPerfil: (p: Perfil) => void;
  sair: () => Promise<void>;
};
export const AppCtx = createContext<Ctx | null>(null);
export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('Fora do aplicativo');
  return c;
}

/** Vai para uma tela do app (endereços do tipo #/mensagens). */
export const ir = (rota: string) => { window.location.hash = rota; };

/**
 * Guarda de saída: uma tela (ex.: a mensagem sendo escrita) pode pedir para confirmar antes de sair.
 * A função recebe o destino e devolve true para deixar sair, ou false para segurar (e mostrar a pergunta).
 */
let guarda: ((destino: string) => boolean) | null = null;
export const definirGuarda = (g: ((destino: string) => boolean) | null) => { guarda = g; };
export const podeSair = (destino: string) => (guarda ? guarda(destino) : true);
/** Sai mesmo, ignorando a guarda (depois que a pessoa escolheu uma opção). */
export const sairSemGuarda = (destino: string) => { guarda = null; ir(destino); };
