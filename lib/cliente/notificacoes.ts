'use client';
// Notificação do texto do dia às 8h (Web Push). A inscrição fica em push_inscricoes (só o dono vê).
import { supa } from './supabase';

const URL_FUNCAO = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/functions/v1/texto-do-dia`;

export const temSuporte = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
/** iPhone/iPad fora da Tela de Início: lá a Apple só permite notificação com o app instalado. */
export const precisaInstalarNoIphone = () => {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalado = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !instalado;
};

function chaveBytes(b64: string) {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function inscricaoAtual(): Promise<PushSubscription | null> {
  if (!temSuporte()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function ativarNotificacoes(): Promise<void> {
  if (!temSuporte()) throw new Error('Este aparelho ou navegador não aceita notificações.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('As notificações não foram permitidas. Libere nas configurações do aparelho.');
  const reg = await navigator.serviceWorker.ready;
  const { chave } = (await (await fetch(URL_FUNCAO)).json()) as { chave: string };
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes(chave) }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supa().from('push_inscricoes').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
  if (error) throw new Error('Não foi possível salvar a notificação. Tente de novo com internet.');
}

export async function desativarNotificacoes(): Promise<void> {
  const sub = await inscricaoAtual();
  if (!sub) return;
  await supa().from('push_inscricoes').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
