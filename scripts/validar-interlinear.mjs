// Confere as traduções do interlinear (dados-fonte/interlinear/pt) contra o pendente.
// Uso: node scripts/validar-interlinear.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
const F = new URL('../dados-fonte/interlinear/', import.meta.url);
const ler = (rel) => JSON.parse(readFileSync(new URL(rel, F), 'utf8'));
const problemas = []; let ok = 0;
const INGLES = /\b(the|and|which|shall|with|from|unto|that|was|were|have|this|they|them|their|of|to)\b/gi;
for (const f of readdirSync(new URL('pendente/', F)).filter((n) => n.startsWith('glosas-'))) {
  if (!existsSync(new URL('pt/' + f, F))) { problemas.push(`${f}: falta a tradução`); continue; }
  let t; try { t = ler('pt/' + f); } catch { problemas.push(`${f}: JSON inválido`); continue; }
  const faltam = ler('pendente/' + f).filter((g) => typeof t[g] !== 'string' || !t[g].trim());
  if (faltam.length) problemas.push(`${f}: ${faltam.length} glosas sem tradução (ex.: ${faltam.slice(0, 3).join(' | ')})`);
  const barras = Object.entries(t).filter(([, v]) => /\//.test(v)).length;
  if (barras) problemas.push(`${f}: ${barras} traduções ainda com barra "/"`);
  if (!faltam.length && !barras) ok++;
}
for (const f of readdirSync(new URL('pendente/verbetes/', F))) {
  const alvo = 'pt/verbetes/' + f;
  if (!existsSync(new URL(alvo, F))) { problemas.push(`verbetes/${f}: falta a tradução`); continue; }
  let t; try { t = ler(alvo); } catch { problemas.push(`verbetes/${f}: JSON inválido`); continue; }
  const orig = ler('pendente/verbetes/' + f), porId = new Map(t.map((e) => [e.id, e]));
  let bom = true;
  for (const e of orig) {
    const x = porId.get(e.id);
    if (!x || !x.def?.trim() || !x.glosa?.trim()) { problemas.push(`verbetes/${f}: ${e.id} sem tradução`); bom = false; continue; }
    const refs = (s) => (s.match(/\{\{[^}]+\}\}/g) || []).join(' ');
    if (refs(e.def) !== refs(x.def)) { problemas.push(`verbetes/${f}: ${e.id} referências {{…}} alteradas`); bom = false; }
    if (e.def.length > 200 && (x.def.match(INGLES) || []).length > 12) { problemas.push(`verbetes/${f}: ${e.id} parece continuar em inglês`); bom = false; }
    if (x.def.length < e.def.length * 0.6) { problemas.push(`verbetes/${f}: ${e.id} tradução muito mais curta que o original (resumiu?)`); bom = false; }
  }
  if (bom) ok++;
}
console.log(`${ok} arquivos corretos, ${problemas.length} problemas`);
problemas.slice(0, 80).forEach((p) => console.log(' - ' + p));
process.exit(problemas.length ? 1 : 0);
