// Leitura palavra por palavra (interlinear) em hebraico e grego, a partir do STEPBible
// (Tyndale House, Cambridge — licença CC BY 4.0, www.STEPBible.org).
//
// Etapa 1 — extrair o que precisa ser traduzido para o português:
//   node scripts/preparar-interlinear.mjs extrair <pasta-com-os-arquivos-do-STEPBible>
//   Gera dados-fonte/interlinear/pendente/ (glosas e verbetes em inglês, divididos em lotes).
// Etapa 2 — montar os arquivos do app com as traduções de dados-fonte/interlinear/pt/:
//   node scripts/preparar-interlinear.mjs montar <pasta-com-os-arquivos-do-STEPBible>
//
// Arquivos do STEPBible usados (baixar de github.com/STEPBible/STEPBible-Data):
//   TAHOT Gen-Deu ... .txt  (hebraico)     TAGNT Mat-Jhn ... .txt (grego)
//   TBESH ... .txt (léxico hebraico)       TBESG ... .txt (léxico grego)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTE = path.join(RAIZ, 'dados-fonte', 'interlinear');
const OSIS = ['Gen','Exo','Lev','Num','Deu','Jos','Jdg','Rut','1Sa','2Sa','1Ki','2Ki','1Ch','2Ch','Ezr','Neh','Est','Job','Psa','Pro','Ecc','Sng','Isa','Jer','Lam','Ezk','Dan','Hos','Jol','Amo','Oba','Jon','Mic','Nam','Hab','Zep','Hag','Zec','Mal','Mat','Mrk','Luk','Jhn','Act','Rom','1Co','2Co','Gal','Eph','Php','Col','1Th','2Th','1Ti','2Ti','Tit','Phm','Heb','Jas','1Pe','2Pe','1Jn','2Jn','3Jn','Jud','Rev'];
const LIVROS = [0, 42];                    // Gênesis e João (etapa piloto)

const [, , acao, pasta] = process.argv;
if (!['extrair', 'montar'].includes(acao) || !pasta) {
  console.error('Uso: node scripts/preparar-interlinear.mjs extrair|montar <pasta-do-STEPBible>');
  process.exit(1);
}
const arquivo = (prefixo) => {
  const f = readdirSync(pasta).find((n) => n.startsWith(prefixo));
  if (!f) throw new Error(`Arquivo ${prefixo}… não encontrado em ${pasta}`);
  return readFileSync(path.join(pasta, f), 'utf8');
};

// ---------- texto original, palavra por palavra ----------
const limparHeb = (s) => s.replace(/[֑-ֽ֯]/g, '').replace(/[\/\\]/g, '').replace(/׃/g, '').trim();
const limparTranslit = (s) => s.replace(/[./]/g, '').replace(/'/g, '’').toLowerCase().trim();

/** Devolve { "livro.cap.vers": [[original, transliteração, glosa em inglês, strong], ...] } */
function lerPalavras() {
  const versos = {};
  const add = (l, c, v, p) => ((versos[`${l}.${c}.${v}`] ??= []).push(p));
  for (const linha of arquivo('TAHOT').split('\n')) {
    const m = linha.match(/^([1-3A-Z][a-z]{2})\.(\d+)\.(\d+)(?:\([\d.]+\))?#\d+=([A-Z]+)/);
    if (!m || !LIVROS.includes(OSIS.indexOf(m[1])) || m[4] === 'X' || m[4].startsWith('K')) continue;
    const c = linha.split('\t');
    const strong = (c[4].match(/\{(H\d+[A-Z]?)\}/) || [])[1] || '';
    add(OSIS.indexOf(m[1]), +m[2], +m[3], [limparHeb(c[1]), limparTranslit(c[2]), c[3].trim(), strong]);
  }
  for (const linha of arquivo('TAGNT').split('\n')) {
    const m = linha.match(/^([1-3A-Z][a-z]{2})\.(\d+)\.(\d+)#\d+=/);
    if (!m || !LIVROS.includes(OSIS.indexOf(m[1]))) continue;
    const c = linha.split('\t');
    if (!/\bTR\b/.test(c[5] || '')) continue;      // mesma base da Almeida e da King James
    const [, orig, tr] = c[1].match(/^(.*?)\s*\((.*)\)\s*$/) || [null, c[1], ''];
    add(OSIS.indexOf(m[1]), +m[2], +m[3], [orig.trim(), tr.trim(), c[2].trim(), c[3].split('=')[0].trim()]);
  }
  return versos;
}

// ---------- léxico ----------
const limparDef = (s) => s
  .replace(/<ref='([^']+)'>[^<]*<\/ref>/g, '{{$1}}')
  .replace(/<br\s*\/?>/gi, '\n').replace(/__/g, '')
  .replace(/<(\/?)(b|i)>/gi, '<$1$2>')
  .replace(/<(?!\/?(?:b|i)>)[^>]+>/g, '')
  .replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();

function lerLexico() {
  const lex = {};
  for (const prefixo of ['TBESH', 'TBESG']) {
    for (const linha of arquivo(prefixo).split('\n')) {
      const c = linha.replace(/\r$/, '').split('\t');
      if (c.length < 8 || !/^[HG]\d{4}/.test(c[0])) continue;
      const id = c[1].split('=')[0].trim();
      lex[id] = { id, original: c[3], translit: c[4], classe: c[5], glosa: c[6], def: limparDef(c[7]) };
    }
  }
  return lex;
}
// sinais do inglês do STEPBible que não fazem sentido em português
const limparGlosa = (g) => g.replace(/¿\s*/g, '').replace(/\s+([!?.,;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
const chaveLex = (lex, s) => (lex[s] ? s : lex[s.replace(/[A-Z]$/, '')] ? s.replace(/[A-Z]$/, '') : null);

const versos = lerPalavras();
const lex = lerLexico();
const usados = new Set();
const glosas = new Set();
for (const ps of Object.values(versos)) for (const p of ps) { glosas.add(p[2]); const k = chaveLex(lex, p[3]); if (k) usados.add(k); }

if (acao === 'extrair') {
  const dir = path.join(FONTE, 'pendente');
  mkdirSync(path.join(dir, 'verbetes'), { recursive: true });
  const lista = [...glosas].sort();
  for (let i = 0, n = 1; i < lista.length; i += 2500, n++) writeFileSync(path.join(dir, `glosas-${String(n).padStart(2, '0')}.json`), JSON.stringify(lista.slice(i, i + 2500), null, 0));
  const entradas = [...usados].sort().map((k) => lex[k]);
  let lote = [], tam = 0, n = 1;
  const gravar = () => { if (lote.length) writeFileSync(path.join(dir, 'verbetes', `lote-${String(n++).padStart(2, '0')}.json`), JSON.stringify(lote, null, 1)); lote = []; tam = 0; };
  for (const e of entradas) { lote.push(e); tam += e.def.length; if (tam > 60000) gravar(); }
  gravar();
  console.log(`${Object.keys(versos).length} versículos, ${lista.length} glosas distintas, ${entradas.length} verbetes em ${n - 1} lotes`);
} else {
  // traduções: dados-fonte/interlinear/pt/glosas-XX.json ({inglês: português}) e verbetes/lote-XX.json ([{id, glosa, def}])
  const pt = path.join(FONTE, 'pt');
  const glosaPt = {};
  for (const f of readdirSync(pt).filter((n) => /^glosas-\d+\.json$/.test(n))) Object.assign(glosaPt, JSON.parse(readFileSync(path.join(pt, f), 'utf8')));
  const verbetePt = {};
  if (existsSync(path.join(pt, 'verbetes'))) for (const f of readdirSync(path.join(pt, 'verbetes')).filter((n) => n.endsWith('.json'))) for (const e of JSON.parse(readFileSync(path.join(pt, 'verbetes', f), 'utf8'))) verbetePt[e.id] = e;
  let semGlosa = 0, semVerbete = 0;
  const saida = path.join(RAIZ, 'public', 'dados', 'inter');
  for (const l of LIVROS) {
    const caps = {};
    for (const [ref, ps] of Object.entries(versos)) {
      const [bl, c, v] = ref.split('.').map(Number);
      if (bl !== l) continue;
      ((caps[c] ??= {})[v] = ps.map(([o, t, g, s]) => { const tr = glosaPt[g]; if (!tr) semGlosa++; return [o, t, limparGlosa(tr || g.replace(/\//g, '')), chaveLex(lex, s) || '']; }));
    }
    mkdirSync(path.join(saida, String(l)), { recursive: true });
    for (const [c, vs] of Object.entries(caps)) writeFileSync(path.join(saida, String(l), `${c}.json`), JSON.stringify(vs));
    // léxico do livro (carregado só quando se toca numa palavra)
    const ids = new Set(Object.values(caps).flatMap((vs) => Object.values(vs).flatMap((ps) => ps.map((p) => p[3])))); ids.delete('');
    // onde mais cada palavra aparece (nos livros que têm interlinear)
    const ocorr = {};
    for (const [ref, ps] of Object.entries(versos)) {
      const [bl, c, v] = ref.split('.').map(Number);
      for (const p of ps) { const k = chaveLex(lex, p[3]); if (k && ids.has(k)) { const lst = (ocorr[k] ??= []); const r = `${bl}.${c - 1}.${v}`; if (lst[lst.length - 1] !== r) lst.push(r); } }
    }
    const lexLivro = {};
    for (const id of ids) {
      const e = lex[id], t = verbetePt[id];
      if (!t) semVerbete++;
      lexLivro[id] = [e.original, e.translit, e.classe, t?.glosa || e.glosa, t?.def || e.def, t ? 1 : 0, (ocorr[id] || []).slice(0, 60), (ocorr[id] || []).length];
    }
    writeFileSync(path.join(saida, String(l), 'lexico.json'), JSON.stringify(lexLivro));
  }
  console.log(`Interlinear montado. Glosas sem tradução: ${semGlosa}. Verbetes sem tradução: ${semVerbete}.`);
}
