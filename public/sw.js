// Service worker do Púlpito: guarda o app e os dados bíblicos no aparelho para uso sem internet.
// Funciona tanto na raiz do site quanto numa subpasta (usa endereços relativos).
const VERSAO = 'pulpito-v7';
const RAIZ = new URL('./', self.location).pathname;            // ex.: "/" ou "/pulpito/"
const BASE = ['', 'biblia.json', 'dados/titulos.json', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'].map((p) => RAIZ + p);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => Promise.allSettled(BASE.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n)))).then(() => self.clients.claim()),
  );
});

// A página avisa quais arquivos ela carregou antes de o service worker assumir.
self.addEventListener('message', (e) => {
  if (e.data && e.data.tipo === 'guardar' && Array.isArray(e.data.urls)) {
    e.waitUntil(caches.open(VERSAO).then((c) => Promise.allSettled(e.data.urls.map((u) => c.match(u).then((tem) => tem || c.add(u))))));
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(RAIZ)) return;

  // Abrir o app: tenta a rede (versão mais nova); sem internet, usa a cópia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(RAIZ, copia)); }
        return r;
      }).catch(() => caches.match(RAIZ, { ignoreSearch: true }).then((r) => r || Response.error())),
    );
    return;
  }

  // Código, fontes, ícones e dados bíblicos: usa a cópia guardada; se não houver, baixa e guarda.
  e.respondWith(
    caches.match(req).then((guardado) => guardado || fetch(req).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
      return r;
    })),
  );
});

// Notificação do texto do dia (enviada pelo servidor às 8h).
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Texto do dia', {
    body: d.corpo || '', icon: RAIZ + 'icone-192.png', badge: RAIZ + 'icone-192.png', tag: 'texto-do-dia', data: { url: d.url || '#/' },
  }));
});

// Ao tocar na notificação: abre o app no texto (e nos comentários, quando houver).
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = RAIZ + (e.notification.data && e.notification.data.url ? e.notification.data.url : '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abertas) => {
    for (const c of abertas) if (c.url.startsWith(self.location.origin + RAIZ) && 'focus' in c) { c.navigate(destino); return c.focus(); }
    return self.clients.openWindow(destino);
  }));
});
