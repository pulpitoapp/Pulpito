'use client';
// Guarda arquivos no Google Drive da própria pessoa, numa pasta "Púlpito".
// Permissão pedida: drive.file — o app só enxerga os arquivos que ele mesmo criou.
// A autorização vale só enquanto o app está aberto (não guardamos a chave de acesso).

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const ESCOPO = 'https://www.googleapis.com/auth/drive.file';

type TokenResp = { access_token?: string; expires_in?: number; error?: string };
type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void; callback: (r: TokenResp) => void };
type Gis = { accounts: { oauth2: { initTokenClient: (c: { client_id: string; scope: string; callback: (r: TokenResp) => void; error_callback?: (e: { type?: string }) => void }) => TokenClient } } };

let script: Promise<void> | null = null;
const carregarScript = () => (script ??= new Promise<void>((ok, erro) => {
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
  s.onload = () => ok(); s.onerror = () => { script = null; erro(new Error('Não foi possível falar com o Google. Verifique a internet.')); };
  document.head.appendChild(s);
}));

let token: { valor: string; ate: number } | null = null;
async function obterToken(): Promise<string> {
  if (token && Date.now() < token.ate) return token.valor;
  if (!GOOGLE_CLIENT_ID) throw new Error('O Google Drive ainda não foi configurado neste app.');
  await carregarScript();
  const g = (window as unknown as { google: Gis }).google;
  return new Promise<string>((ok, erro) => {
    const cliente = g.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID, scope: ESCOPO,
      callback: (r) => {
        if (!r.access_token) { erro(new Error('A autorização do Google não foi concedida.')); return; }
        token = { valor: r.access_token, ate: Date.now() + ((r.expires_in || 3600) - 60) * 1000 };
        ok(r.access_token);
      },
      error_callback: (e) => erro(new Error(e?.type === 'popup_closed' ? 'A janela do Google foi fechada.' : 'Não foi possível autorizar o Google Drive.')),
    });
    cliente.requestAccessToken();
  });
}

async function api(url: string, init: RequestInit = {}) {
  const t = await obterToken();
  const r = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${t}` } });
  if (r.status === 401) token = null;
  if (!r.ok) throw new Error('O Google Drive recusou o envio. Tente de novo.');
  return r.json();
}

let pastaId: string | null = null;
async function pastaPulpito(): Promise<string> {
  if (pastaId) return pastaId;
  const q = encodeURIComponent("name = 'Púlpito' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const achou = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`);
  if (achou.files?.[0]?.id) return (pastaId = achou.files[0].id as string);
  const nova = await api('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Púlpito', mimeType: 'application/vnd.google-apps.folder' }),
  });
  return (pastaId = nova.id as string);
}

/** Envia o arquivo para a pasta "Púlpito" do Drive da pessoa. Devolve o id e o link para abrir. */
export async function enviarAoDrive(arquivo: File): Promise<{ id: string; link: string }> {
  const pasta = await pastaPulpito();
  const meta = { name: arquivo.name, parents: [pasta] };
  const corpo = new FormData();
  corpo.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  corpo.append('file', arquivo);
  const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', { method: 'POST', body: corpo });
  return { id: r.id as string, link: (r.webViewLink as string) || `https://drive.google.com/file/d/${r.id}/view` };
}
