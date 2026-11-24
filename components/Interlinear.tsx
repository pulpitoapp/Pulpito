'use client';
// Leitura palavra por palavra no original (hebraico em Gênesis, grego em João),
// com o significado de cada palavra e o verbete do dicionário ao tocar.
// Fonte: STEPBible (Tyndale House, Cambridge), CC BY 4.0 — tradução para o português feita para o Púlpito.
import { useEffect, useState } from 'react';
import { LIVROS } from '@/lib/biblia';
import { BASE } from '@/lib/cliente/bibliaDados';
import { gravar, ler } from '@/lib/cliente/local';
import { ir } from './contexto';
import { Painel } from './Paineis';

/** Livros que já têm a leitura palavra por palavra. */
export const LIVROS_INTERLINEAR = [0, 42];
export const temInterlinear = (l: number) => LIVROS_INTERLINEAR.includes(l);

type Palavra = [string, string, string, string];          // original, transliteração, significado, id do dicionário
type Capitulo = Record<string, Palavra[]>;
type Verbete = [string, string, string, string, string, number, string[], number];

const OSIS = ['Gen','Exo','Lev','Num','Deu','Jos','Jdg','Rut','1Sa','2Sa','1Ki','2Ki','1Ch','2Ch','Ezr','Neh','Est','Job','Psa','Pro','Ecc','Sng','Isa','Jer','Lam','Ezk','Dan','Hos','Jol','Amo','Oba','Jon','Mic','Nam','Hab','Zep','Hag','Zec','Mal','Mat','Mrk','Luk','Jhn','Act','Rom','1Co','2Co','Gal','Eph','Php','Col','1Th','2Th','1Ti','2Ti','Tit','Phm','Heb','Jas','1Pe','2Pe','1Jn','2Jn','3Jn','Jud','Rev'];

const capitulos = new Map<string, Promise<Capitulo>>();
function carregarCapitulo(l: number, c: number): Promise<Capitulo> {
  const k = `${l}.${c}`;
  let p = capitulos.get(k);
  if (!p) {
    p = (async () => {
      const local = await ler<Capitulo | null>(`inter-${k}-v1`, null);
      if (local) return local;
      const r = await fetch(`${BASE}/dados/inter/${l}/${c + 1}.json`);
      if (!r.ok) throw new Error('sem interlinear');
      const d = (await r.json()) as Capitulo;
      void gravar(`inter-${k}-v1`, d);
      return d;
    })().catch((e) => { capitulos.delete(k); throw e; });
    capitulos.set(k, p);
  }
  return p;
}
const lexicos = new Map<number, Promise<Record<string, Verbete>>>();
function carregarLexico(l: number) {
  let p = lexicos.get(l);
  if (!p) {
    p = (async () => {
      const local = await ler<Record<string, Verbete> | null>(`lexico-${l}-v1`, null);
      if (local) return local;
      const r = await fetch(`${BASE}/dados/inter/${l}/lexico.json`);
      if (!r.ok) throw new Error('sem dicionário');
      const d = (await r.json()) as Record<string, Verbete>;
      void gravar(`lexico-${l}-v1`, d);
      return d;
    })().catch((e) => { lexicos.delete(l); throw e; });
    lexicos.set(l, p);
  }
  return p;
}

export function useCapituloInterlinear(l: number, c: number, ativo: boolean): Capitulo | null | 'erro' {
  const [estado, setEstado] = useState<{ k: string; d: Capitulo | null | 'erro' }>({ k: '', d: null });
  const k = `${l}.${c}`;
  useEffect(() => {
    if (!ativo || !temInterlinear(l)) return;
    let vivo = true;
    carregarCapitulo(l, c).then((d) => { if (vivo) setEstado({ k, d }); }).catch(() => { if (vivo) setEstado({ k, d: 'erro' }); });
    return () => { vivo = false; };
  }, [l, c, k, ativo]);
  return estado.k === k ? estado.d : null;
}

const hebraico = (l: number) => l < 39;
const limparTr = (s: string) => s.replace(/[.]/g, '');
const semPont = (s: string) => s.replace(/[\s,.;:·;!?]+$/u, '');

/** As palavras de um versículo, lado a lado (da direita para a esquerda no hebraico). */
export function PalavrasDoVerso({ l, palavras, aoTocar }: { l: number; palavras: Palavra[]; aoTocar: (p: Palavra) => void }) {
  const heb = hebraico(l);
  return (
    <div className="inter" dir={heb ? 'rtl' : 'ltr'}>
      {palavras.map((p, i) => (
        <button key={i} type="button" className="inter-palavra" onClick={() => aoTocar(p)} disabled={!p[3]} aria-label={`${p[1]}: ${p[2]}`}>
          <span className={heb ? 'inter-heb' : 'inter-gre'} lang={heb ? 'he' : 'el'}>{p[0]}</span>
          <span className="inter-tr" dir="ltr">{p[1]}</span>
          <span className="inter-sig" dir="ltr">{p[2]}</span>
        </button>
      ))}
    </div>
  );
}

const CLASSES: Record<string, string> = {
  V: 'verbo', N: 'substantivo', 'N-M': 'substantivo masculino', 'N-F': 'substantivo feminino', 'N-N': 'substantivo neutro', 'N-M/F': 'substantivo masculino/feminino',
  A: 'adjetivo', Adv: 'advérbio', ADV: 'advérbio', Prep: 'preposição', PREP: 'preposição', Conj: 'conjunção', CONJ: 'conjunção', Pron: 'pronome', 'P': 'pronome',
  Part: 'partícula', PRT: 'partícula', T: 'artigo', Intj: 'interjeição', INJ: 'interjeição', 'N:N-M-P': 'nome de pessoa (masculino)', 'N:N-F-P': 'nome de pessoa (feminino)',
  'N:N--L': 'nome de lugar', 'N:N--T': 'nome próprio', 'N:N-M-T': 'nome próprio',
};
const classe = (c: string) => { const k = c.replace(/^[HG]:/, ''); return CLASSES[k] || CLASSES[k.split('-')[0]] || k; };

/** Verbete com <b>/<i> permitidos e referências {{Gen.1.1}} viradas em links para a Bíblia. */
function TextoVerbete({ def, fechar }: { def: string; fechar: () => void }) {
  const partes = def.split(/(\{\{[^}]+\}\}|<\/?[bi]>)/g).filter(Boolean);
  const out: React.ReactNode[] = [];
  let neg = false, ita = false;
  partes.forEach((p, i) => {
    if (p === '<b>') { neg = true; return; } if (p === '</b>') { neg = false; return; }
    if (p === '<i>') { ita = true; return; } if (p === '</i>') { ita = false; return; }
    const m = p.match(/^\{\{(.+)\}\}$/);
    if (m) {
      const r = m[1].match(/^([1-3]?[A-Za-z]{2,3})\.(\d+)(?:\.(\d+))?(.*)$/);
      const l = r ? OSIS.indexOf(r[1]) : -1;
      if (r && l >= 0) out.push(<button key={i} type="button" className="underline decoration-dotted" onClick={() => { fechar(); ir(`/biblia/${l}/${Number(r[2]) - 1}${r[3] ? '/' + r[3] : ''}`); }}>{LIVROS[l]} {r[2]}{r[3] ? ':' + r[3] : ''}{r[4].replace(/\./g, ':')}</button>);
      else out.push(<span key={i}>{m[1]}</span>);
      return;
    }
    const linhas = p.split('\n');
    linhas.forEach((t, j) => {
      if (j) out.push(<br key={`${i}-${j}`} />);
      if (t) out.push(neg ? <b key={`${i}-${j}t`} style={ita ? { fontStyle: 'italic' } : undefined}>{t}</b> : ita ? <i key={`${i}-${j}t`}>{t}</i> : <span key={`${i}-${j}t`}>{t}</span>);
    });
  });
  return <p className="m-0 text-[15px] leading-relaxed">{out}</p>;
}

export function PainelVerbete({ l, palavra, fechar }: { l: number; palavra: Palavra; fechar: () => void }) {
  const [v, setV] = useState<Verbete | null | 'erro'>(null);
  useEffect(() => {
    let vivo = true;
    carregarLexico(l).then((d) => { if (vivo) setV(d[palavra[3]] || 'erro'); }).catch(() => { if (vivo) setV('erro'); });
    return () => { vivo = false; };
  }, [l, palavra]);
  const heb = hebraico(l);
  return (
    <Painel titulo={palavra[1]} sub={heb ? 'Hebraico' : 'Grego'} fechar={fechar}>
      <p className={`m-0 text-center ${heb ? 'inter-heb' : 'inter-gre'} !text-[40px]`} dir={heb ? 'rtl' : 'ltr'} lang={heb ? 'he' : 'el'}>{semPont(palavra[0])}</p>
      <p className="mt-1 text-center text-[15px]">Neste versículo: <b>{semPont(palavra[2])}</b></p>
      {v === null ? <p className="text-mute">Abrindo o dicionário…</p> : v === 'erro' ? <p className="text-mute">Sem verbete para esta palavra. Abra o app uma vez com internet para guardar o dicionário.</p> : (
        <section className="cartao mt-4 !p-4">
          <p className="rot m-0">Forma no dicionário</p>
          <p className="m-0 mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className={heb ? 'inter-heb !text-[26px]' : 'inter-gre !text-[24px]'} dir={heb ? 'rtl' : 'ltr'}>{v[0]}</span>
            <span className="italic">{limparTr(v[1])}</span>
            <span className="etiqueta">{classe(v[2])}</span>
            <span className="text-[13px] text-mute">{palavra[3].replace(/^([HG])0*/, '$1')}</span>
          </p>
          <p className="m-0 mt-3 text-[17px] font-bold">{v[3]}</p>
          <div className="mt-2"><TextoVerbete def={v[4]} fechar={fechar} /></div>
          {!v[5] ? <p className="ajuda">Verbete ainda em inglês: a tradução está em andamento.</p> : null}
          {v[6].length > 1 ? (
            <>
              <p className="rot mt-4">Onde mais aparece{v[7] > v[6].length ? ` · ${v[7]} vezes (primeiras ${v[6].length})` : ` · ${v[7]} vezes`}</p>
              <div className="flex flex-wrap gap-1.5">
                {v[6].map((r) => { const [rl, rc, rv] = r.split('.').map(Number); return <button key={r} type="button" className="chip !min-h-[30px] !text-[11px] !tracking-normal" onClick={() => { fechar(); ir(`/biblia/${rl}/${rc}/${rv}`); }}>{LIVROS[rl]} {rc + 1}:{rv}</button>; })}
              </div>
              <p className="ajuda">Por enquanto, a contagem considera só Gênesis e João.</p>
            </>
          ) : null}
        </section>
      )}
      <p className="ajuda mt-4">Dados: STEPBible (Tyndale House, Cambridge), licença CC BY 4.0. Tradução para o português feita para o Púlpito, sem revisão de especialista.</p>
    </Painel>
  );
}

/** Painel com um versículo no original, palavra por palavra (aberto pela barra de ações). */
export function PainelOriginal({ l, c, v, textoPt, fechar }: { l: number; c: number; v: number; textoPt: string; fechar: () => void }) {
  const cap = useCapituloInterlinear(l, c, true);
  const [palavra, setPalavra] = useState<Palavra | null>(null);
  if (palavra) return <PainelVerbete l={l} palavra={palavra} fechar={() => setPalavra(null)} />;
  return (
    <Painel titulo="No original" sub={`${LIVROS[l]} ${c + 1}:${v} · ${hebraico(l) ? 'hebraico' : 'grego'}`} fechar={fechar}>
      <p className="m-0 text-[16px] leading-relaxed">{textoPt}</p>
      {cap === null ? <p className="text-mute">Carregando…</p> : cap === 'erro' || !cap[v] ? <p className="text-mute">Não foi possível abrir o original deste versículo.</p> : (
        <>
          <PalavrasDoVerso l={l} palavras={cap[v]} aoTocar={setPalavra} />
          <p className="ajuda">Toque numa palavra para ver o significado no dicionário.</p>
        </>
      )}
    </Painel>
  );
}

/** O sentido de cada palavra, na ordem em que está escrita no original. */
export function OrdemOriginal({ l, palavras }: { l: number; palavras: Palavra[] }) {
  const frase = palavras.map((p) => p[2]).join(' ')
    .replace(/\(obj\.\)/g, '').replace(/[⟨⟩]/g, '')
    .replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  if (!frase) return null;
  return (
    <p className="ordem-original">
      <span className="rot">Na ordem do {hebraico(l) ? 'hebraico' : 'grego'}</span>
      {frase}
    </p>
  );
}
