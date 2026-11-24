'use client';
// Dados do usuário (mensagens, pregações, destaques e notas de versículo).
// Tudo é guardado primeiro no aparelho; o que foi alterado entra numa fila
// e é enviado ao Supabase quando houver internet. Em caso de conflito,
// vale a alteração mais recente.
import { useSyncExternalStore } from 'react';
import type { Mensagem, Nota, Pregacao, Traco } from '@/lib/tipos';
import { conteudoVazio } from '@/lib/tipos';
import { gravar, ler } from './local';
import { supa } from './supabase';

type Fila = { salvar: string[]; apagar: string[]; pregSalvar: string[]; pregApagar: string[]; dest: string[]; notas: string[] };
export type Estado = {
  uid: string;
  pronto: boolean;
  sincronizando: boolean;
  mensagens: Mensagem[];
  pregacoes: Pregacao[];
  destaques: Record<string, string>;
  notas: Record<string, Nota>;
  fila: Fila;
  ultimoErro: string;
};

const filaVazia = (): Fila => ({ salvar: [], apagar: [], pregSalvar: [], pregApagar: [], dest: [], notas: [] });
const vazio = (uid = ''): Estado => ({ uid, pronto: false, sincronizando: false, mensagens: [], pregacoes: [], destaques: {}, notas: {}, fila: filaVazia(), ultimoErro: '' });

let estado: Estado = vazio();
const ouvintes = new Set<() => void>();
const mudar = (parte: Partial<Estado>, persistir = true) => {
  estado = { ...estado, ...parte };
  ouvintes.forEach((f) => f());
  if (persistir && estado.uid) {
    const { mensagens, pregacoes, destaques, notas, fila } = estado;
    void gravar('dados2:' + estado.uid, { mensagens, pregacoes, destaques, notas, fila });
  }
};

export function useDados(): Estado {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => estado, () => estado);
}
export const pendentes = (e: Estado) => Object.values(e.fila).reduce((s, l) => s + l.length, 0);

const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;
const mais = (lista: string[], id: string) => (lista.includes(id) ? lista : [...lista, id]);
const menos = (lista: string[], id: string) => lista.filter((x) => x !== id);
export const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)));
const normalizar = (m: Mensagem): Mensagem => ({ ...m, tema: m.tema || '', conteudo: { ...conteudoVazio(), ...(m.conteudo || {}) } });

/** Carrega os dados guardados no aparelho e tenta sincronizar. */
export async function iniciarDados(uid: string): Promise<void> {
  if (estado.uid === uid && estado.pronto) return;
  estado = vazio(uid);
  const salvo = await ler<Partial<Estado> | null>('dados2:' + uid, null);
  mudar({ ...(salvo || {}), fila: { ...filaVazia(), ...(salvo?.fila || {}) }, uid, pronto: true }, false);
  limparVazias();
  void sincronizar();
}

/** Apaga mensagens minhas que ficaram em branco (abertas e abandonadas há mais de 10 minutos). */
export function limparVazias(): void {
  const limite = Date.now() - 10 * 60 * 1000;
  const vazias = estado.mensagens.filter((m) => m.autor_id === estado.uid && new Date(m.atualizado_em).getTime() < limite
    && !m.titulo.trim() && !m.tema.trim() && !m.conteudo.texto.trim() && !m.conteudo.refs.length && !m.conteudo.tracos.length && !(m.conteudo.docs || []).length);
  for (const m of vazias) apagarMensagem(m.id);
}

export function limparDados(): void {
  estado = vazio();
  ouvintes.forEach((f) => f());
}

export function novaMensagem(uid: string, parte: Partial<Mensagem> = {}): Mensagem {
  const agora = new Date().toISOString();
  return { id: novoId(), autor_id: uid, autor_linha: '', titulo: '', tema: '', serie: '', situacao: 'rascunho', visibilidade: 'privada', conteudo: conteudoVazio(), criado_em: agora, atualizado_em: agora, ...parte };
}

export function salvarMensagem(m: Mensagem): void {
  const nova = { ...m, atualizado_em: new Date().toISOString() };
  mudar({ mensagens: [nova, ...estado.mensagens.filter((x) => x.id !== m.id)], fila: { ...estado.fila, salvar: mais(estado.fila.salvar, m.id) } });
  void sincronizar();
}

export function apagarMensagem(id: string): void {
  mudar({
    mensagens: estado.mensagens.filter((x) => x.id !== id),
    pregacoes: estado.pregacoes.filter((p) => p.mensagem_id !== id),
    fila: { ...estado.fila, salvar: menos(estado.fila.salvar, id), apagar: mais(estado.fila.apagar, id) },
  });
  void sincronizar();
}

export function salvarPregacao(p: Pregacao): void {
  mudar({ pregacoes: [p, ...estado.pregacoes.filter((x) => x.id !== p.id)], fila: { ...estado.fila, pregSalvar: mais(estado.fila.pregSalvar, p.id) } });
  void sincronizar();
}
export function apagarPregacao(id: string): void {
  mudar({ pregacoes: estado.pregacoes.filter((x) => x.id !== id), fila: { ...estado.fila, pregSalvar: menos(estado.fila.pregSalvar, id), pregApagar: mais(estado.fila.pregApagar, id) } });
  void sincronizar();
}

/** Destaca (ou remove o destaque, se cor vazia) uma lista de versículos. */
export function destacar(refs: string[], cor: string): void {
  const destaques = { ...estado.destaques };
  let fila = estado.fila.dest;
  for (const r of refs) {
    if (cor) destaques[r] = cor; else delete destaques[r];
    fila = mais(fila, r);
  }
  mudar({ destaques, fila: { ...estado.fila, dest: fila } });
  void sincronizar();
}

/** Grava (ou apaga, se vazia) a nota de um versículo. */
export function salvarNota(ref: string, texto: string, tracos: Traco[]): void {
  const notas = { ...estado.notas };
  if (texto.trim() || tracos.length) notas[ref] = { texto, tracos, atualizado_em: new Date().toISOString() };
  else delete notas[ref];
  mudar({ notas, fila: { ...estado.fila, notas: mais(estado.fila.notas, ref) } });
  void sincronizar();
}

const erroDeRede = (e: { message?: string } | null) => !online() || /fetch|network|load failed/i.test(e?.message || '');

let emCurso: Promise<void> | null = null;
/** Envia a fila e busca as novidades do servidor. */
export function sincronizar(): Promise<void> {
  if (!estado.uid || !estado.pronto || !online()) return Promise.resolve();
  if (emCurso) return emCurso;
  emCurso = (async () => {
    mudar({ sincronizando: true }, false);
    const uid = estado.uid;
    const db = supa();
    let ultimoErro = '';
    try {
      // 1) envia o que está na fila
      for (const id of [...estado.fila.apagar]) {
        const { error } = await db.from('mensagens').delete().eq('id', id);
        if (error && erroDeRede(error)) throw error;
        mudar({ fila: { ...estado.fila, apagar: menos(estado.fila.apagar, id) } });
      }
      for (const id of [...estado.fila.salvar]) {
        const m = estado.mensagens.find((x) => x.id === id);
        if (m && m.autor_id === uid) {
          const { error } = await db.from('mensagens').upsert({ id: m.id, titulo: m.titulo, tema: m.tema, serie: m.serie, situacao: m.situacao, visibilidade: m.visibilidade, conteudo: m.conteudo, atualizado_em: m.atualizado_em });
          if (error) { if (erroDeRede(error)) throw error; ultimoErro = 'Uma mensagem não pôde ser enviada: ' + error.message; }
        }
        if (uid !== estado.uid) return;
        mudar({ fila: { ...estado.fila, salvar: menos(estado.fila.salvar, id) } });
      }
      for (const id of [...estado.fila.pregApagar]) {
        const { error } = await db.from('pregacoes').delete().eq('id', id);
        if (error && erroDeRede(error)) throw error;
        mudar({ fila: { ...estado.fila, pregApagar: menos(estado.fila.pregApagar, id) } });
      }
      for (const id of [...estado.fila.pregSalvar]) {
        const p = estado.pregacoes.find((x) => x.id === id);
        if (p) {
          const { error } = await db.from('pregacoes').upsert({ id: p.id, mensagem_id: p.mensagem_id, data: p.data, igreja: p.igreja, ocasiao: p.ocasiao });
          if (error && erroDeRede(error)) throw error;
        }
        mudar({ fila: { ...estado.fila, pregSalvar: menos(estado.fila.pregSalvar, id) } });
      }
      if (estado.fila.dest.length) {
        const refs = [...estado.fila.dest];
        const por = refs.filter((r) => estado.destaques[r]).map((r) => ({ ref: r, cor: estado.destaques[r] }));
        const tirar = refs.filter((r) => !estado.destaques[r]);
        if (por.length) { const { error } = await db.from('destaques').upsert(por); if (error && erroDeRede(error)) throw error; }
        if (tirar.length) { const { error } = await db.from('destaques').delete().eq('usuario_id', uid).in('ref', tirar); if (error && erroDeRede(error)) throw error; }
        mudar({ fila: { ...estado.fila, dest: estado.fila.dest.filter((r) => !refs.includes(r)) } });
      }
      if (estado.fila.notas.length) {
        const refs = [...estado.fila.notas];
        const por = refs.filter((r) => estado.notas[r]).map((r) => ({ ref: r, ...estado.notas[r] }));
        const tirar = refs.filter((r) => !estado.notas[r]);
        if (por.length) { const { error } = await db.from('notas').upsert(por); if (error && erroDeRede(error)) throw error; }
        if (tirar.length) { const { error } = await db.from('notas').delete().eq('usuario_id', uid).in('ref', tirar); if (error && erroDeRede(error)) throw error; }
        mudar({ fila: { ...estado.fila, notas: estado.fila.notas.filter((r) => !refs.includes(r)) } });
      }

      // 2) busca o que há no servidor (o RLS devolve as minhas mensagens + as públicas)
      const [rm, rp, rd, rn] = await Promise.all([
        db.from('mensagens').select('*').order('atualizado_em', { ascending: false }).limit(2000),
        db.from('pregacoes').select('*').order('data', { ascending: false }),
        db.from('destaques').select('ref, cor'),
        db.from('notas').select('ref, texto, tracos, atualizado_em'),
      ]);
      if (rm.error || rp.error || rd.error || rn.error) throw rm.error || rp.error || rd.error || rn.error;
      if (uid !== estado.uid) return;
      // o que ainda está na fila (alterado durante a sincronização) continua valendo a versão local
      const f = estado.fila;
      const locais = new Map(estado.mensagens.map((m) => [m.id, m]));
      const mensagens = ((rm.data || []) as Mensagem[])
        .filter((m) => !f.apagar.includes(m.id))
        .map((m) => (f.salvar.includes(m.id) && locais.has(m.id) ? (locais.get(m.id) as Mensagem) : normalizar(m)));
      for (const id of f.salvar) if (!mensagens.some((m) => m.id === id) && locais.has(id)) mensagens.unshift(locais.get(id) as Mensagem);
      const pregLocais = estado.pregacoes.filter((p) => f.pregSalvar.includes(p.id));
      const pregacoes = [...pregLocais, ...((rp.data || []) as Pregacao[]).filter((p) => !f.pregApagar.includes(p.id) && !f.pregSalvar.includes(p.id))];
      const destaques: Record<string, string> = {};
      for (const d of rd.data || []) if (!f.dest.includes(d.ref)) destaques[d.ref] = d.cor;
      for (const r of f.dest) if (estado.destaques[r]) destaques[r] = estado.destaques[r];
      const notas: Record<string, Nota> = {};
      for (const n of rn.data || []) if (!f.notas.includes(n.ref)) notas[n.ref] = { texto: n.texto, tracos: (n.tracos || []) as Traco[], atualizado_em: n.atualizado_em };
      for (const r of f.notas) if (estado.notas[r]) notas[r] = estado.notas[r];
      mudar({ mensagens, pregacoes, destaques, notas, ultimoErro });
    } catch (e) {
      // sem rede: fica tudo na fila para a próxima tentativa
      if (!erroDeRede(e as { message?: string })) mudar({ ultimoErro: 'Não foi possível sincronizar agora.' }, false);
    } finally {
      mudar({ sincronizando: false }, false);
      emCurso = null;
    }
  })();
  return emCurso;
}
