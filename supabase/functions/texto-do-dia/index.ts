// Texto do dia por notificação (Web Push).
// GET  -> devolve a chave pública das notificações (cria o par de chaves na primeira vez).
// POST -> envia o texto do dia a todos os aparelhos inscritos. Só aceita quem mandar o segredo do
//         agendamento (header x-segredo), guardado em privado.config — o pg_cron chama todo dia às 8h (Brasília).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-segredo, authorization, apikey', 'Content-Type': 'application/json' };

async function chaves(): Promise<{ publica: string; privada: string }> {
  let pub = (await db.rpc('config_ler', { p_chave: 'vapid_publica' })).data as string | null;
  let pri = (await db.rpc('config_ler', { p_chave: 'vapid_privada' })).data as string | null;
  if (!pub || !pri) {
    const k = webpush.generateVAPIDKeys();
    await db.rpc('config_gravar', { p_chave: 'vapid_publica', p_valor: k.publicKey });
    await db.rpc('config_gravar', { p_chave: 'vapid_privada', p_valor: k.privateKey });
    pub = (await db.rpc('config_ler', { p_chave: 'vapid_publica' })).data as string;
    pri = (await db.rpc('config_ler', { p_chave: 'vapid_privada' })).data as string;
  }
  return { publica: pub!, privada: pri! };
}

// Os textos (referência, texto da Bíblia Livre e link) ficam publicados junto com o app
// (public/dados/textos-do-dia.json, gerado de lib/textoDoDia.ts).
const URL_TEXTOS = 'https://pulpitoapp.github.io/Pulpito/dados/textos-do-dia.json';

/** Mesmo cálculo do app (lib/textoDoDia.ts), com a data de Brasília. */
async function textoDeHoje(): Promise<[string, string, string]> {
  const TEXTOS = (await (await fetch(URL_TEXTOS)).json()) as [string, string, string][];
  const [a, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).split('-').map(Number);
  const dia = Math.floor((Date.UTC(a, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
  return TEXTOS[((dia % TEXTOS.length) + TEXTOS.length) % TEXTOS.length];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const k = await chaves();
  if (req.method === 'GET') return new Response(JSON.stringify({ chave: k.publica }), { headers: cors });

  const segredo = (await db.rpc('config_ler', { p_chave: 'segredo_cron' })).data as string | null;
  if (!segredo || req.headers.get('x-segredo') !== segredo) return new Response(JSON.stringify({ erro: 'não autorizado' }), { status: 401, headers: cors });

  // contato exigido pelo padrão das notificações: o endereço do próprio app (sem e-mail pessoal)
  webpush.setVapidDetails('https://pulpitoapp.github.io/Pulpito/', k.publica, k.privada);
  const [ref, texto, url] = await textoDeHoje();
  const corpo = JSON.stringify({ titulo: 'Texto do dia · ' + ref, corpo: texto.length > 180 ? texto.slice(0, 177) + '…' : texto, url });
  const { data: lista } = await db.from('push_inscricoes').select('endpoint, p256dh, auth').limit(10000);
  let enviados = 0, removidos = 0, falhas = 0;
  for (const s of lista || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, corpo, { TTL: 6 * 3600 });
      enviados++;
    } catch (e) {
      const st = (e as { statusCode?: number }).statusCode;
      if (st === 404 || st === 410) { await db.from('push_inscricoes').delete().eq('endpoint', s.endpoint); removidos++; } else falhas++;
    }
  }
  return new Response(JSON.stringify({ ref, enviados, removidos, falhas }), { headers: cors });
});
