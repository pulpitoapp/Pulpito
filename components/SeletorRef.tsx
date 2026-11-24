'use client';
// Escolha de um texto bíblico em três passos: livro (enquanto digita), capítulo e versículos.
import { useMemo, useState } from 'react';
import { formatarRef, indiceLivro, lerRef, limparVerso, LIVROS, norm, type BibliaDados } from '@/lib/biblia';
import { chaveDe } from '@/lib/textos';
import { CORES, NOME_COR } from '@/lib/tipos';

const NOMES = LIVROS.map((n) => norm(n).replace(/[^a-z0-9]/g, ''));

/** Livros que começam pelo que foi digitado (aceita "jo", "1 co", "sl"…). */
function sugerirLivros(texto: string): number[] {
  const q = norm(texto).replace(/[^a-z0-9]/g, '');
  if (!q) return [];
  const achados = NOMES.map((n, i) => (n.startsWith(q) ? i : -1)).filter((i) => i >= 0);
  const apelido = indiceLivro(texto);
  if (apelido >= 0 && !achados.includes(apelido)) achados.unshift(apelido);
  return achados.slice(0, 10);
}

export function SeletorRef({ biblia, aoEscolher, id = 'refBusca' }: { biblia: BibliaDados | null; aoEscolher: (chave: string, cor: string) => void; id?: string }) {
  const [texto, setTexto] = useState('');
  const [livro, setLivro] = useState<number | null>(null);
  const [cap, setCap] = useState<number | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [cor, setCor] = useState('am');

  const sugestoes = useMemo(() => (livro === null ? sugerirLivros(texto.replace(/\s*\d+\s*[:.,]?.*$/, (m) => (/^\s*\d+\s*$/.test(texto) ? m : ''))) : []), [texto, livro]);
  // referência completa digitada (ex.: "Jo 3:16-18") pode ser acrescentada direto
  const direta = useMemo(() => { const r = lerRef(texto); return r?.v && biblia?.[r.l]?.[2]?.[r.c]?.[r.v - 1] ? r : null; }, [texto, biblia]);
  // "Lucas 15" digitado: já oferece abrir o capítulo
  const capDigitado = useMemo(() => { const r = lerRef(texto); return r && !r.v && biblia?.[r.l]?.[2]?.[r.c] ? r : null; }, [texto, biblia]);

  const limpar = () => { setTexto(''); setLivro(null); setCap(null); setSel([]); };
  const escolherLivro = (l: number) => { setLivro(l); setCap(null); setSel([]); setTexto(LIVROS[l] + ' '); };
  const escolherCap = (l: number, c: number) => { setLivro(l); setCap(c); setSel([]); setTexto(`${LIVROS[l]} ${c + 1}`); };
  const tocar = (v: number) => setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]).sort((a, b) => a - b));
  const confirmar = (chave: string) => { aoEscolher(chave, cor); limpar(); };

  const versos = livro !== null && cap !== null ? biblia?.[livro]?.[2]?.[cap] || [] : [];
  const ini = sel[0], fim = sel[sel.length - 1];
  const refSel = livro !== null && cap !== null && sel.length ? { l: livro, c: cap, v: ini, v2: fim > ini ? fim : undefined } : null;

  return (
    <div className="cartao !p-3.5">
      <label className="rotulo" htmlFor={id}>Acrescentar texto</label>
      <div className="flex gap-2">
        <input id={id} className="campo flex-1" value={texto} autoComplete="off"
          onChange={(e) => { setTexto(e.target.value); if (livro !== null && !norm(e.target.value).startsWith(norm(LIVROS[livro]))) { setLivro(null); setCap(null); setSel([]); } }}
          placeholder="Comece a digitar o livro: Lu, Sl, 1 Co…" />
        {texto ? <button type="button" className="btn btn-mini" onClick={limpar}>Limpar</button> : null}
      </div>

      {direta ? (
        <button type="button" className="btn btn-pri mt-2 w-full" onClick={() => confirmar(chaveDe(direta))}>Acrescentar {formatarRef(direta)}</button>
      ) : null}
      {capDigitado && cap === null ? (
        <button type="button" className="btn mt-2 w-full" onClick={() => escolherCap(capDigitado.l, capDigitado.c)}>Abrir {LIVROS[capDigitado.l]} {capDigitado.c + 1} e escolher os versículos</button>
      ) : null}

      {/* passo 1: livro */}
      {livro === null && sugestoes.length && !direta ? (
        <div className="mt-2 flex flex-wrap gap-1.5" role="list" aria-label="Livros">
          {sugestoes.map((l) => <button key={l} type="button" role="listitem" className="chip !min-h-[34px] !normal-case !tracking-normal !text-[14px] !font-normal" onClick={() => escolherLivro(l)}>{LIVROS[l]}</button>)}
        </div>
      ) : null}

      {/* passo 2: capítulo */}
      {livro !== null && cap === null && biblia ? (
        <div className="mt-3">
          <p className="rotulo">{LIVROS[livro]} · escolha o capítulo</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(42px,1fr))] gap-1.5">
            {biblia[livro][2].map((_, c) => <button key={c} type="button" className="h-10 rounded-lg border border-line bg-paper text-[15px]" onClick={() => escolherCap(livro, c)}>{c + 1}</button>)}
          </div>
        </div>
      ) : null}

      {/* passo 3: versículos */}
      {livro !== null && cap !== null && versos.length ? (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo !mb-0">{LIVROS[livro]} {cap + 1} · toque nos versículos</p>
            <button type="button" className="rot underline" onClick={() => { setCap(null); setSel([]); setTexto(LIVROS[livro] + ' '); }}>Outro capítulo</button>
          </div>
          <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-line bg-paper p-2">
            {versos.map((t, i) => {
              const v = i + 1, dentro = refSel ? v >= ini && v <= fim : false;
              return (
                <button key={v} type="button" onClick={() => tocar(v)} aria-pressed={sel.includes(v)}
                  className="block w-full rounded-md px-2 py-1 text-left text-[15px] leading-relaxed" style={dentro ? { background: CORES[cor] } : undefined}>
                  <span className="mr-1 text-[11px] text-mute">{v}</span>{limparVerso(t)}
                </button>
              );
            })}
          </div>
          <p className="ajuda">Toque no primeiro e no último versículo do trecho; os do meio entram juntos.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex gap-1" role="group" aria-label="Cor do marca-texto">
              {Object.entries(CORES).map(([k, c]) => <button key={k} type="button" aria-label={NOME_COR[k]} aria-pressed={cor === k} className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: cor === k ? 'var(--ink)' : 'transparent' }} onClick={() => setCor(k)} />)}
            </span>
            <button type="button" className="btn btn-pri flex-1" disabled={!refSel} onClick={() => refSel && confirmar(chaveDe(refSel))}>{refSel ? `Acrescentar ${formatarRef(refSel)}` : 'Escolha os versículos'}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
