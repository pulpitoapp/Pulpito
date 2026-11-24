'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatarRef, lerRef, limparVerso, LIVROS, norm } from '@/lib/biblia';
import { CORES, NOME_COR } from '@/lib/tipos';
import { temLivro, transliterar, versaoPorId, VERSOES } from '@/lib/versoes';
import { carregarTitulos, useBiblia, type Titulos } from '@/lib/cliente/bibliaDados';
import { destacar, useDados } from '@/lib/cliente/dados';
import { pref } from '@/lib/cliente/local';
import { PainelCartao } from './Cartao';
import { Carregando } from './Cabecalho';
import { ir, useApp } from './contexto';
import { IcoApostila, IcoAvancar, IcoBusca, IcoEnviar, IcoLapis, IcoMarca, IcoMensagemAdd, IcoMenu, IcoOriginal, IcoRefs, IcoVoltar } from './Icones';
import { Painel, PainelEstudos, PainelNota, PainelRefs, PainelUsar } from './Paineis';
import { OrdemOriginal, PainelComentario, PainelOriginal, PainelVerbete, PalavrasDoVerso, temInterlinear, useCapituloInterlinear, useComentarioCapitulo } from './Interlinear';

type Achado = { l: number; c: number; v: number };
type Aberto = null | 'menu' | 'busca' | 'nota' | 'refs' | 'estudos' | 'usar' | 'cartao' | 'cores' | 'original';

/** Texto do versículo com as palavras acrescentadas ([...]) em itálico. */
function Texto({ t }: { t: string }) {
  if (!t.includes('[')) return <>{t}</>;
  return <>{t.split(/(\[[^\]]*\])/).filter(Boolean).map((p, i) => (p.startsWith('[') ? <i key={i}>{p.slice(1, -1)}</i> : p))}</>;
}

/** Faixas de versículos seguidos: [1,2,3,7] -> "1-3,7". */
export function faixas(vs: number[]): string {
  const out: string[] = [];
  let ini = vs[0], ant = ini;
  for (const v of [...vs.slice(1), -1]) { if (v !== ant + 1) { out.push(ini === ant ? `${ini}` : `${ini}-${ant}`); ini = v; } ant = v; }
  return out.join(',');
}

export function Biblia({ alvo }: { alvo: number[] }) {
  const { avisar } = useApp();
  const dados = useDados();
  const [versaoId, setVersaoId] = useState<string>(() => pref.ler('biblia-versao', 'blivre'));
  const [comparar, setComparar] = useState<string>(() => pref.ler('biblia-comparar', ''));
  const [translit, setTranslit] = useState<boolean>(() => pref.ler('biblia-translit', true));
  const [porPalavra, setPorPalavra] = useState<boolean>(() => pref.ler('biblia-inter', false));
  const [palavra, setPalavra] = useState<[string, string, string, string] | null>(null);
  const [comentarioV, setComentarioV] = useState<number | null>(null);
  const [tam, setTam] = useState<number>(() => pref.ler('biblia-tam', 19));
  const [pos, setPos] = useState<{ l: number; c: number }>(() => pref.ler('biblia-pos', { l: 42, c: 0 }));
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [aberto, setAberto] = useState<Aberto>(null);
  const [titulos, setTitulos] = useState<Titulos>({});
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<{ titulo: string; lista: Achado[]; mostrar: number } | null>(null);
  const rolarPara = useRef<number | null>(null);
  const indice = useRef<{ id: string; dados: string[][][] } | null>(null);

  const versao = versaoPorId(versaoId);
  const biblia = useBiblia(versaoId);
  const pt = useBiblia('blivre');
  const outra = useBiblia(comparar || null);

  useEffect(() => { carregarTitulos().then(setTitulos); }, []);

  // endereço #/biblia/livro/capítulo/versículo
  const chaveAlvo = alvo.join('.');
  useEffect(() => {
    const [l, c, v] = alvo;
    if (Number.isInteger(l) && Number.isInteger(c) && l >= 0 && l < 66 && c >= 0) {
      setPos({ l, c }); rolarPara.current = Number.isInteger(v) ? v : null; setSel(new Set(Number.isInteger(v) ? [v] : [])); setAberto(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveAlvo]);

  // se a versão não tem o livro aberto (ex.: hebraico no Novo Testamento), vai para o primeiro que tem
  useEffect(() => { if (!temLivro(versao, pos.l)) setPos({ l: versao.livros![0], c: 0 }); }, [versao, pos.l]);

  const cap = Array.isArray(biblia) ? biblia[pos.l]?.[2]?.[pos.c] : undefined;
  useEffect(() => {
    if (!cap) return;
    pref.gravar('biblia-pos', pos);
    const v = rolarPara.current;
    rolarPara.current = null;
    if (v) requestAnimationFrame(() => document.getElementById(`v${v}`)?.scrollIntoView({ block: 'center' }));
    else window.scrollTo(0, 0);
  }, [cap, pos]);

  const inter = useCapituloInterlinear(pos.l, pos.c, porPalavra);
  const comentarios = useComentarioCapitulo(pos.l, pos.c, porPalavra);
  const selOrdenada = useMemo(() => [...sel].sort((a, b) => a - b), [sel]);
  const primeiro = selOrdenada[0];

  if (biblia === 'erro') return <p className="p-10 text-center text-mute">Não foi possível carregar esta Bíblia. Abra o app uma vez com internet para guardá-la no aparelho.</p>;
  if (!Array.isArray(biblia) || !Array.isArray(pt)) return <Carregando texto="Abrindo a Bíblia…" />;
  if (!cap) return <Carregando texto="Abrindo…" />;

  const nomeLivro = LIVROS[pos.l];
  const secoes = new Map((titulos[pos.l]?.[pos.c + 1] || []).map(([v, t]) => [v, t]));
  const rtl = versao.idioma === 'he';
  const capOutra = comparar && Array.isArray(outra) ? outra[pos.l]?.[2]?.[pos.c] : undefined;
  const modoInter = porPalavra && temInterlinear(pos.l);
  // texto em português mostrado acima das palavras do original
  const capPt = versao.idioma === 'pt' ? cap : pt[pos.l]?.[2]?.[pos.c] || [];
  const mudarPorPalavra = (x: boolean) => { setPorPalavra(x); pref.gravar('biblia-inter', x); };
  const irPara = (l: number, c: number, v?: number) => { setAchados(null); ir(`/biblia/${l}/${c}${v ? '/' + v : ''}`); };
  const vizinho = (d: number) => {
    let { l, c } = pos; c += d;
    const [min, max] = versao.livros || [0, 65];
    if (c < 0) { l--; if (l < min) return; c = biblia[l][2].length - 1; }
    else if (c >= biblia[l][2].length) { l++; if (l > max) return; c = 0; }
    irPara(l, c);
  };
  const trocarVersao = (id: string) => { setVersaoId(id); pref.gravar('biblia-versao', id); indice.current = null; if (id === comparar) { setComparar(''); pref.gravar('biblia-comparar', ''); } };
  const tocar = (v: number) => { const n = new Set(sel); if (n.has(v)) n.delete(v); else n.add(v); setSel(n); if (!n.size) setAberto(null); };
  const textoSel = selOrdenada.map((v) => limparVerso(cap[v - 1] || '')).join(' ');
  const refSel = sel.size ? `${nomeLivro} ${pos.c + 1}:${faixas(selOrdenada)}` : '';
  // chave da seleção para "textos usados": só serve para versículos seguidos
  const seguidos = selOrdenada.every((v, i) => i === 0 || v === selOrdenada[i - 1] + 1);
  const chaveSel = sel.size ? `${pos.l}.${pos.c}.${primeiro}${sel.size > 1 && seguidos ? '-' + selOrdenada[sel.size - 1] : ''}` : '';

  function pintar(cor: string) { destacar(selOrdenada.map((v) => `${pos.l}.${pos.c}.${v}`), cor); setSel(new Set()); setAberto(null); }
  async function copiar() {
    try { await navigator.clipboard.writeText(`${selOrdenada.map((v) => `${v} ${limparVerso(cap![v - 1])}`).join('\n')}\n(${refSel} — ${versao.sigla})`); avisar('Versículos copiados'); setSel(new Set()); }
    catch { avisar('Não foi possível copiar'); }
  }
  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const bruto = busca.trim();
    const ref = lerRef(bruto);
    if (ref && Array.isArray(biblia) && biblia[ref.l]?.[2]?.[ref.c]) { setAberto(null); irPara(ref.l, ref.c, ref.v); return; }
    const frase = /^["“].*["”]$/.test(bruto);
    const q = norm(bruto.replace(/["“”]/g, ''));
    if (q.length < 2) { avisar('Digite ao menos 2 letras'); return; }
    if (indice.current?.id !== versaoId) indice.current = { id: versaoId, dados: (biblia as [string, string, string[][]][]).map((livro) => livro[2].map((c) => c.map((t) => norm(limparVerso(t))))) };
    const termos = frase ? [q] : q.split(/\s+/).filter(Boolean);
    const lista: Achado[] = [];
    indice.current.dados.forEach((livro, l) => livro.forEach((c, ci) => c.forEach((t, vi) => { if (termos.every((x) => t.includes(x))) lista.push({ l, c: ci, v: vi + 1 }); })));
    setAchados({ titulo: `${lista.length.toLocaleString('pt-BR')} ${lista.length === 1 ? 'versículo' : 'versículos'} com “${bruto}”`, lista, mostrar: 60 });
  }
  const verDestaques = () => {
    const lista = Object.keys(dados.destaques).map((r) => { const [l, c, v] = r.split('.').map(Number); return { l, c, v }; }).sort((a, b) => a.l - b.l || a.c - b.c || a.v - b.v);
    setAchados({ titulo: `Textos marcados · ${lista.length}`, lista, mostrar: 60 });
  };
  const verNotas = () => {
    const lista = Object.keys(dados.notas).map((r) => { const [l, c, v] = r.split('.').map(Number); return { l, c, v }; }).sort((a, b) => a.l - b.l || a.c - b.c || a.v - b.v);
    setAchados({ titulo: `Textos com anotação · ${lista.length}`, lista, mostrar: 60 });
  };

  return (
    <>
      <header className="topo sticky top-0 z-20 flex items-center justify-between px-4 py-2" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <button type="button" className="redondo" onClick={() => ir('/')} aria-label="Voltar ao início"><IcoVoltar /></button>
        <button type="button" className="rot rounded-full border px-4 py-2.5" onClick={() => setAberto('menu')} aria-label="Escolher a Bíblia">{versao.sigla}{comparar ? ` + ${versaoPorId(comparar).sigla}` : ''}</button>
        <div className="flex gap-2">
          <button type="button" className="redondo" onClick={() => setAberto('busca')} aria-label="Buscar"><IcoBusca /></button>
          <button type="button" className="redondo" onClick={() => setAberto('menu')} aria-label="Livro, capítulo e opções"><IcoMenu /></button>
        </div>
      </header>

      <main className={`mx-auto max-w-2xl px-5 pb-40 ${sel.size ? 'tem-selecao' : ''}`}>
        <button type="button" className="mx-auto mt-8 block text-center" onClick={() => setAberto('menu')} aria-label="Trocar de livro ou capítulo">
          <h1 className="text-[34px]">{nomeLivro} {pos.c + 1}</h1>
        </button>
        <div className="ornamento" aria-hidden="true" />
        {temInterlinear(pos.l) ? (
          <div className="mt-5 flex justify-center">
            <button type="button" className="chip" aria-pressed={porPalavra} onClick={() => mudarPorPalavra(!porPalavra)}>{porPalavra ? 'Palavra por palavra · ligado' : `Ler no ${pos.l < 39 ? 'hebraico' : 'grego'} palavra por palavra`}</button>
          </div>
        ) : null}

        <article className="leitura-biblia mt-8" style={{ fontSize: tam }}>
          {cap.map((t, i) => {
            const v = i + 1, chave = `${pos.l}.${pos.c}.${v}`, cor = dados.destaques[chave];
            if (!t) return null;
            return (
              <div key={v}>
                {secoes.has(v) ? <h3 className="secao" style={i === 0 ? { marginTop: 0 } : undefined}>{secoes.get(v)}</h3> : null}
                <p id={`v${v}`} className={`verso ${versao.idioma === 'el' && !modoInter ? 'grego' : ''}`} dir={rtl && !modoInter ? 'rtl' : undefined} lang={modoInter ? 'pt' : versao.idioma} data-sel={sel.has(v) ? '1' : undefined} onClick={() => tocar(v)}>
                  <span className="n">{v}</span>
                  <span className={`txt ${cor ? 'marca' : ''}`} style={cor ? { background: CORES[cor] } : undefined}><Texto t={modoInter ? capPt[i] || t : t} /></span>
                  {dados.notas[chave] ? <span className="tem-nota" aria-label="Tem anotação" /> : null}
                </p>
                {modoInter ? (
                  inter && inter !== 'erro' && inter[v] ? (
                    <>
                      <OrdemOriginal l={pos.l} palavras={inter[v]} />
                      <PalavrasDoVerso l={pos.l} palavras={inter[v]} aoTocar={setPalavra} />
                      {comentarios?.[v] ? <button type="button" className="chip -mt-2 mb-5" onClick={() => setComentarioV(v)}>Comentário · {comentarios[v].autor}</button> : null}
                    </>
                  ) : inter === 'erro' ? <p className="ajuda">Não foi possível abrir o original. Abra uma vez com internet.</p> : null
                ) : (
                  <>
                    {rtl && translit ? <p className="translit">{transliterar(t)}</p> : null}
                    {capOutra?.[i] ? <p className="comparada" lang={versaoPorId(comparar).idioma}>{limparVerso(capOutra[i])}</p> : null}
                  </>
                )}
              </div>
            );
          })}
        </article>

        {rtl || versao.idioma === 'el' ? <p className="ajuda mt-6">{rtl ? 'A numeração do texto hebraico difere em alguns pontos (títulos dos Salmos, Joel, Malaquias). A transliteração é automática e aproximada.' : 'Texto grego sem acentos, como na edição de origem.'}</p> : null}

        <div className="mt-10 flex items-center justify-between">
          <button type="button" className="redondo" onClick={() => vizinho(-1)} aria-label="Capítulo anterior"><IcoVoltar /></button>
          <span className="rot">{versao.sigla}</span>
          <button type="button" className="redondo" onClick={() => vizinho(1)} aria-label="Próximo capítulo"><IcoAvancar /></button>
        </div>
        <p className="ajuda mt-6 text-center">{versao.credito}</p>
      </main>

      {/* Barra de ações do versículo selecionado */}
      {sel.size && !aberto ? (
        <div className="fixed inset-x-0 bottom-[78px] z-30 mx-auto max-w-md px-3" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="rounded-[26px] border border-line bg-folha p-3 shadow-xl" role="toolbar" aria-label="Ações do versículo">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="rot">{refSel}</span>
              <button type="button" className="rot underline" onClick={() => setSel(new Set())}>Limpar</button>
            </div>
            <div className="flex items-center justify-between">
              {([
                ['Anotar', IcoLapis, () => setAberto('nota')], ['Marcar', IcoMarca, () => setAberto('cores')], ['Ligações', IcoRefs, () => setAberto('refs')],
                ['Apostilas', IcoApostila, () => setAberto('estudos')], ['Mensagem', IcoMensagemAdd, () => setAberto('usar')], ['Cartão', IcoEnviar, () => setAberto('cartao')],
                ...(temInterlinear(pos.l) ? [['Original', IcoOriginal, () => setAberto('original')] as const] : []),
              ] as const).map(([rotulo, Ico, acao]) => (
                <button key={rotulo} type="button" onClick={acao} className="flex w-[48px] flex-col items-center gap-1 rounded-xl py-1.5 text-ink" aria-label={rotulo === 'Ligações' ? 'Referências' : rotulo}>
                  <Ico className="h-6 w-6" /><span className="rot !text-[8px] !tracking-[.08em]">{rotulo}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {aberto === 'cores' ? (
        <Painel titulo="Marca-texto" sub={refSel} fechar={() => setAberto(null)}>
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(CORES).map(([k, c]) => <button key={k} type="button" className="h-12 w-12 rounded-full border border-line" style={{ background: c }} onClick={() => pintar(k)} aria-label={`Marcar em ${NOME_COR[k]}`} />)}
          </div>
          <div className="mt-4 flex gap-2"><button type="button" className="btn flex-1" onClick={() => pintar('')}>Tirar a marca</button><button type="button" className="btn flex-1" onClick={copiar}>Copiar texto</button></div>
        </Painel>
      ) : null}
      {aberto === 'nota' && primeiro ? <PainelNota chave={`${pos.l}.${pos.c}.${primeiro}`} rotulo={formatarRef({ l: pos.l, c: pos.c, v: primeiro })} fechar={() => setAberto(null)} /> : null}
      {aberto === 'refs' && primeiro ? <PainelRefs l={pos.l} c={pos.c} v={primeiro} biblia={pt} fechar={() => setAberto(null)} /> : null}
      {aberto === 'original' && primeiro ? <PainelOriginal l={pos.l} c={pos.c} v={primeiro} textoPt={limparVerso(capPt[primeiro - 1] || '')} fechar={() => setAberto(null)} /> : null}
      {comentarioV && comentarios?.[comentarioV] ? <PainelComentario l={pos.l} c={pos.c} v={comentarioV} com={comentarios[comentarioV]} fechar={() => setComentarioV(null)} /> : null}
      {palavra ? <PainelVerbete l={pos.l} palavra={palavra} fechar={() => setPalavra(null)} /> : null}
      {aberto === 'estudos' ? <PainelEstudos l={pos.l} c={pos.c} fechar={() => setAberto(null)} /> : null}
      {aberto === 'usar' ? <PainelUsar refChave={chaveSel} rotulo={refSel} fechar={() => setAberto(null)} /> : null}
      {aberto === 'cartao' ? <PainelCartao texto={textoSel} livro={nomeLivro} cap={pos.c + 1} versos={faixas(selOrdenada)} sigla={versao.sigla} fechar={() => setAberto(null)} /> : null}

      {aberto === 'menu' ? (
        <Painel titulo="Bíblia" sub="Versão, livro e capítulo" fechar={() => setAberto(null)}>
          <label className="rotulo" htmlFor="bVersao">Qual Bíblia ler</label>
          <select id="bVersao" className="campo" value={versaoId} onChange={(e) => trocarVersao(e.target.value)}>{VERSOES.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}</select>
          <label className="rotulo mt-4" htmlFor="bComparar">Comparar com (aparece abaixo de cada versículo)</label>
          <select id="bComparar" className="campo" value={comparar} onChange={(e) => { setComparar(e.target.value); pref.gravar('biblia-comparar', e.target.value); }}>
            <option value="">Nenhuma</option>{VERSOES.filter((v) => v.id !== versaoId).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
          {versao.idioma === 'he' ? <label className="mt-3 flex items-center gap-2 text-[15px]"><input type="checkbox" className="h-5 w-5" checked={translit} onChange={(e) => { setTranslit(e.target.checked); pref.gravar('biblia-translit', e.target.checked); }} />Mostrar a transliteração (como se lê)</label> : null}
          <label className="mt-3 flex items-center gap-2 text-[15px]"><input type="checkbox" className="h-5 w-5" checked={porPalavra} onChange={(e) => mudarPorPalavra(e.target.checked)} />Palavra por palavra no original (hebraico/grego)</label>
          <p className="ajuda !mt-1">Disponível por enquanto em Gênesis e João. Toque numa palavra para ver o significado.</p>
          <p className="ajuda">Almeida Revista e Corrigida e Revista e Atualizada entram aqui quando houver licença da Sociedade Bíblica do Brasil.</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div><label className="rotulo" htmlFor="bLivro">Livro</label>
              <select id="bLivro" className="campo" value={pos.l} onChange={(e) => { setAberto(null); irPara(Number(e.target.value), 0); }}>
                {(!versao.livros || versao.livros[0] === 0) ? <optgroup label="Antigo Testamento">{LIVROS.slice(0, 39).map((n, i) => <option key={i} value={i}>{n}</option>)}</optgroup> : null}
                {(!versao.livros || versao.livros[1] === 65) ? <optgroup label="Novo Testamento">{LIVROS.slice(39).map((n, i) => <option key={i + 39} value={i + 39}>{n}</option>)}</optgroup> : null}
              </select></div>
            <div><label className="rotulo" htmlFor="bCap">Capítulo</label>
              <select id="bCap" className="campo" value={pos.c} onChange={(e) => { setAberto(null); irPara(pos.l, Number(e.target.value)); }}>{biblia[pos.l][2].map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></div>
          </div>
          <p className="rotulo mt-4">Tamanho da letra</p>
          <div className="flex items-center gap-3">
            <button type="button" className="redondo" onClick={() => { const n = Math.max(14, tam - 1); setTam(n); pref.gravar('biblia-tam', n); }} aria-label="Diminuir a letra">A−</button>
            <span className="rot">{tam}</span>
            <button type="button" className="redondo" onClick={() => { const n = Math.min(30, tam + 1); setTam(n); pref.gravar('biblia-tam', n); }} aria-label="Aumentar a letra">A+</button>
          </div>
        </Painel>
      ) : null}

      {aberto === 'busca' ? (
        <Painel titulo="Buscar" sub={versao.nome} fechar={() => { setAberto(null); setAchados(null); }}>
          <form onSubmit={buscar} className="flex gap-2">
            <input className="campo" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder='Palavras, "frase exata" ou Jo 3:16' aria-label="Buscar na Bíblia" autoFocus />
            <button type="submit" className="btn btn-pri">Buscar</button>
          </form>
          <div className="mt-3 flex gap-2"><button type="button" className="btn btn-mini" onClick={verDestaques}>Textos marcados</button><button type="button" className="btn btn-mini" onClick={verNotas}>Com anotação</button></div>
          {achados ? (
            <section className="mt-4" aria-label="Resultados">
              <p className="rot mb-2">{achados.titulo}</p>
              <div className="flex flex-col gap-2">
                {achados.lista.slice(0, achados.mostrar).map(({ l, c, v }) => {
                  const cor = dados.destaques[`${l}.${c}.${v}`];
                  return (
                    <button key={`${l}.${c}.${v}`} type="button" className="cartao !p-3 text-left text-[15px]" onClick={() => { setAberto(null); irPara(l, c, v); }}>
                      <b className="flex items-center gap-1.5">{cor ? <span className="inline-block h-3 w-3 rounded-full" style={{ background: CORES[cor] }} /> : null}{LIVROS[l]} {c + 1}:{v}</b>
                      <span dir={rtl ? 'rtl' : undefined}>{limparVerso(biblia[l]?.[2]?.[c]?.[v - 1] || pt[l]?.[2]?.[c]?.[v - 1] || '')}</span>
                    </button>);
                })}
                {achados.lista.length > achados.mostrar ? <button type="button" className="btn" onClick={() => setAchados({ ...achados, mostrar: achados.mostrar + 60 })}>Mostrar mais ({achados.lista.length - achados.mostrar})</button> : null}
                {!achados.lista.length ? <p className="text-mute">Nada encontrado.</p> : null}
              </div>
            </section>
          ) : null}
        </Painel>
      ) : null}
    </>
  );
}
