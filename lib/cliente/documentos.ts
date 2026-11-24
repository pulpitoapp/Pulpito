'use client';
// "Meus documentos": pastas e documentos salvos (comentários e comparações).
// Fica no Supabase (só o dono vê) e uma cópia no aparelho para abrir sem internet.
// Criar, mover e apagar precisam de internet.
import { useSyncExternalStore } from 'react';
import { gravar, ler } from './local';
import { supa } from './supabase';

export type SecaoDoc = { titulo: string; original: string; texto: string };
export type BlocoDoc = { obra: string; secoes: SecaoDoc[] };
export type ConteudoDoc = { ref: string; l: number; c: number; v: number; blocos: BlocoDoc[] };
export type Pasta = { id: string; nome: string; criado_em: string };
export type Documento = { id: string; pasta_id: string | null; titulo: string; tipo: 'comentario' | 'comparacao' | 'anotacao'; conteudo: ConteudoDoc; drive_id: string | null; criado_em: string; atualizado_em: string };
type Estado = { uid: string; pronto: boolean; carregando: boolean; erro: string; pastas: Pasta[]; documentos: Documento[] };

let estado: Estado = { uid: '', pronto: false, carregando: false, erro: '', pastas: [], documentos: [] };
const ouvintes = new Set<() => void>();
const mudar = (p: Partial<Estado>) => {
  estado = { ...estado, ...p };
  ouvintes.forEach((f) => f());
  if (estado.uid && estado.pronto) void gravar('docs:' + estado.uid, { pastas: estado.pastas, documentos: estado.documentos });
};
export const useDocumentos = () => useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => estado, () => estado);

export async function iniciarDocumentos(uid: string) {
  if (estado.uid !== uid) {
    const salvo = await ler<{ pastas: Pasta[]; documentos: Documento[] } | null>('docs:' + uid, null);
    estado = { uid, pronto: true, carregando: false, erro: '', pastas: salvo?.pastas || [], documentos: salvo?.documentos || [] };
    ouvintes.forEach((f) => f());
  }
  await recarregar();
}

export async function recarregar() {
  if (!estado.uid) return;
  mudar({ carregando: true });
  const db = supa();
  const [p, d] = await Promise.all([
    db.from('pastas').select('id, nome, criado_em').order('nome'),
    db.from('documentos').select('id, pasta_id, titulo, tipo, conteudo, drive_id, criado_em, atualizado_em').order('atualizado_em', { ascending: false }).limit(1000),
  ]);
  if (p.error || d.error) { mudar({ carregando: false, erro: 'Sem conexão: mostrando o que está guardado no aparelho.' }); return; }
  mudar({ carregando: false, erro: '', pastas: p.data as Pasta[], documentos: d.data as Documento[] });
}

const falhou = (e: { message?: string } | null) => { if (e) throw new Error(/fetch|network|load failed/i.test(e.message || '') ? 'Sem internet. Tente de novo quando estiver conectado.' : e.message); };

export async function criarPasta(nome: string): Promise<Pasta> {
  const { data, error } = await supa().from('pastas').insert({ nome: nome.trim().slice(0, 80) }).select('id, nome, criado_em').single();
  falhou(error);
  mudar({ pastas: [...estado.pastas, data as Pasta].sort((a, b) => a.nome.localeCompare(b.nome)) });
  return data as Pasta;
}
export async function renomearPasta(id: string, nome: string) {
  const { error } = await supa().from('pastas').update({ nome: nome.trim().slice(0, 80) }).eq('id', id);
  falhou(error);
  mudar({ pastas: estado.pastas.map((p) => (p.id === id ? { ...p, nome } : p)) });
}
/** Apaga a pasta; os documentos dela continuam, sem pasta. */
export async function apagarPasta(id: string) {
  const { error } = await supa().from('pastas').delete().eq('id', id);
  falhou(error);
  mudar({ pastas: estado.pastas.filter((p) => p.id !== id), documentos: estado.documentos.map((d) => (d.pasta_id === id ? { ...d, pasta_id: null } : d)) });
}

export async function salvarDocumento(doc: { titulo: string; tipo: Documento['tipo']; conteudo: ConteudoDoc; pasta_id: string | null }): Promise<Documento> {
  const { data, error } = await supa().from('documentos').insert({ ...doc, titulo: doc.titulo.slice(0, 200) }).select('id, pasta_id, titulo, tipo, conteudo, drive_id, criado_em, atualizado_em').single();
  falhou(error);
  mudar({ documentos: [data as Documento, ...estado.documentos] });
  return data as Documento;
}
export async function alterarDocumento(id: string, parte: Partial<Pick<Documento, 'titulo' | 'pasta_id' | 'drive_id'>>) {
  const atualizado_em = new Date().toISOString();
  const { error } = await supa().from('documentos').update({ ...parte, atualizado_em }).eq('id', id);
  falhou(error);
  mudar({ documentos: estado.documentos.map((d) => (d.id === id ? { ...d, ...parte, atualizado_em } : d)) });
}
export async function apagarDocumento(id: string) {
  const { error } = await supa().from('documentos').delete().eq('id', id);
  falhou(error);
  mudar({ documentos: estado.documentos.filter((d) => d.id !== id) });
}
