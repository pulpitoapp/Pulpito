'use client';
// Bíblia falada: a voz do próprio aparelho lê o capítulo, versículo por versículo.
// Não custa nada e funciona sem internet quando o aparelho tem a voz em português instalada.
import { useEffect, useRef, useState } from 'react';
import { limparVerso } from '@/lib/biblia';
import { pref } from '@/lib/cliente/local';

const IDIOMA: Record<string, string> = { pt: 'pt-BR', en: 'en-US', he: 'he-IL', el: 'el-GR' };
const VELOCIDADES = [0.8, 1, 1.2, 1.4];

function escolherVoz(lang: string): SpeechSynthesisVoice | null {
  const vozes = window.speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const exata = vozes.filter((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
  const lista = exata.length ? exata : vozes;
  // prefere vozes "melhoradas"/naturais quando o aparelho tiver
  return lista.find((v) => /premium|enhanced|natural|luciana|felipe|google/i.test(v.name)) || lista[0] || null;
}

/** Barra de "ouvir o capítulo". aoVerso informa qual versículo está sendo lido (0 = nenhum). */
export function OuvirCapitulo({ versos, idioma, titulo, aoVerso, aoTerminar }: { versos: string[]; idioma: string; titulo: string; aoVerso: (v: number) => void; aoTerminar?: () => void }) {
  const [estado, setEstado] = useState<'parado' | 'lendo' | 'pausado'>('parado');
  const [vel, setVel] = useState<number>(() => pref.ler('ouvir-vel', 1));
  const fila = useRef(0);
  const ativo = useRef(false);
  const suporte = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // parar ao trocar de capítulo ou sair da tela
  useEffect(() => () => { ativo.current = false; if (suporte) window.speechSynthesis.cancel(); aoVerso(0); }, [titulo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!suporte) return null;
  const lang = IDIOMA[idioma] || 'pt-BR';

  function falar(i: number) {
    if (!ativo.current) return;
    if (i >= versos.length) { ativo.current = false; setEstado('parado'); aoVerso(0); aoTerminar?.(); return; }
    fila.current = i;
    const texto = limparVerso(versos[i] || '').replace(/<[^>]+>/g, '');
    if (!texto.trim()) { falar(i + 1); return; }
    const u = new SpeechSynthesisUtterance(i === 0 ? `${titulo}. ${texto}` : texto);
    u.lang = lang; u.rate = vel;
    const voz = escolherVoz(lang); if (voz) u.voice = voz;
    u.onstart = () => aoVerso(i + 1);
    u.onend = () => falar(i + 1);
    u.onerror = () => { if (ativo.current) falar(i + 1); };
    window.speechSynthesis.speak(u);
  }
  const tocar = () => {
    if (estado === 'pausado') { window.speechSynthesis.resume(); setEstado('lendo'); return; }
    window.speechSynthesis.cancel(); ativo.current = true; setEstado('lendo'); falar(0);
  };
  const pausar = () => { window.speechSynthesis.pause(); setEstado('pausado'); };
  const parar = () => { ativo.current = false; window.speechSynthesis.cancel(); setEstado('parado'); aoVerso(0); };
  const trocarVel = () => {
    const n = VELOCIDADES[(VELOCIDADES.indexOf(vel) + 1) % VELOCIDADES.length];
    setVel(n); pref.gravar('ouvir-vel', n);
    if (estado === 'lendo') { window.speechSynthesis.cancel(); const i = fila.current; ativo.current = true; setTimeout(() => falar(i), 50); }
  };

  return (
    <div className="ouvir" role="group" aria-label="Ouvir o capítulo">
      {estado === 'lendo' ? <button type="button" onClick={pausar} aria-label="Pausar">❚❚</button> : <button type="button" onClick={tocar} aria-label={estado === 'pausado' ? 'Continuar ouvindo' : 'Ouvir o capítulo'}>▶</button>}
      <span className="ouvir-txt">{estado === 'parado' ? 'Ouvir o capítulo' : estado === 'pausado' ? 'Pausado' : 'Lendo…'}</span>
      <button type="button" className="ouvir-vel" onClick={trocarVel} aria-label={`Velocidade ${vel} vezes`}>{String(vel).replace('.', ',')}×</button>
      {estado !== 'parado' ? <button type="button" onClick={parar} aria-label="Parar">■</button> : null}
    </div>
  );
}
