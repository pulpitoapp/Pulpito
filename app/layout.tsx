import type { Metadata, Viewport } from 'next';
import { Archivo, Frank_Ruhl_Libre, Instrument_Serif, Merriweather, Newsreader, Space_Mono } from 'next/font/google';
import './globals.css';
import './cartao.css';

const corpo = Merriweather({ variable: '--font-corpo', subsets: ['latin'], weight: ['400', '700', '900'], style: ['normal', 'italic'], display: 'swap' });
const titulo = Instrument_Serif({ variable: '--font-titulo', subsets: ['latin'], weight: '400', display: 'swap' });
const rotulo = Space_Mono({ variable: '--font-rotulo', subsets: ['latin'], weight: ['400', '700'], display: 'swap' });
const cartaoSerif = Newsreader({ variable: '--font-cartao-serif', subsets: ['latin'], weight: ['500', '700'], style: ['normal', 'italic'], display: 'swap' });
const cartaoSans = Archivo({ variable: '--font-cartao-sans', subsets: ['latin'], weight: ['800'], display: 'swap' });
const hebraico = Frank_Ruhl_Libre({ variable: '--font-hebraico', subsets: ['hebrew'], weight: ['400', '500'], display: 'swap' });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'Púlpito',
  description: 'Bíblia, anotações e mensagens.',
  applicationName: 'Púlpito',
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: 'Púlpito', statusBarStyle: 'default' },
  // prévia do link (WhatsApp, iMessage etc.): nome e ícone do app
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://buffalowear.github.io'),
  openGraph: { type: 'website', siteName: 'Púlpito', title: 'Púlpito', description: 'Bíblia, anotações e mensagens para pregadores.', locale: 'pt_BR', images: [{ url: `${BASE}/icone-512.png`, width: 512, height: 512, alt: 'Púlpito' }] },
  twitter: { card: 'summary', title: 'Púlpito', description: 'Bíblia, anotações e mensagens para pregadores.', images: [`${BASE}/icone-512.png`] },
  icons: { icon: [{ url: `${BASE}/logo/icone-app.svg`, type: 'image/svg+xml' }, { url: `${BASE}/icone-48.png`, sizes: '48x48' }, { url: `${BASE}/icone-192.png`, sizes: '192x192' }], apple: `${BASE}/icone-180.png` },
};

export const viewport: Viewport = { themeColor: '#4a1626', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${corpo.variable} ${titulo.variable} ${rotulo.variable} ${cartaoSerif.variable} ${cartaoSans.variable} ${hebraico.variable}`}>
      <head>
        {/* aplica o modo claro/escuro antes de desenhar a página (evita piscar) */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=JSON.parse(localStorage.getItem('pulpito:tema')||'\"claro\"');var e=t==='escuro'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.tema=e?'escuro':'claro'}catch(_){}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
