'use client';
// Preferências pessoais guardadas na conta (tabela preferencias, só o dono vê), com cópia no aparelho.
import { pref } from './local';
import { supa } from './supabase';

type Dados = Record<string, unknown>;
let cache: { uid: string; dados: Dados } | null = null;

export async function lerPreferencias(uid: string): Promise<Dados> {
  if (cache?.uid === uid) return cache.dados;
  const local = pref.ler<Dados>(`prefs:${uid}`, {});
  try {
    const { data, error } = await supa().from('preferencias').select('dados').eq('usuario_id', uid).maybeSingle();
    if (!error) { const dados = { ...local, ...((data?.dados as Dados) || {}) }; cache = { uid, dados }; pref.gravar(`prefs:${uid}`, dados); return dados; }
  } catch { /* sem internet */ }
  return local;
}

export async function gravarPreferencia(uid: string, chave: string, valor: unknown): Promise<void> {
  const atual = cache?.uid === uid ? cache.dados : pref.ler<Dados>(`prefs:${uid}`, {});
  const dados = { ...atual, [chave]: valor };
  cache = { uid, dados };
  pref.gravar(`prefs:${uid}`, dados);
  try { await supa().from('preferencias').upsert({ usuario_id: uid, dados, atualizado_em: new Date().toISOString() }); } catch { /* fica no aparelho */ }
}
