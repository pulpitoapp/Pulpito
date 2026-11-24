// Monta os comentários bíblicos do app a partir das traduções em dados-fonte/comentarios/.
//   node scripts/preparar-comentarios.mjs
//
// Revisão doutrinária: cada tradução marca em "_atencao" os trechos sobre dons, profecia, batismo etc.
// As decisões ficam em dados-fonte/comentarios/revisao.json:
//   [{ "obra": "jfb", "l": 0, "c": 3, "v": "15", "trecho": "…", "decisao": "manter" | "omitir" }]
// Enquanto um trecho não tiver decisão "manter", ele NÃO vai para o app: aparece "[trecho omitido]".
// A lista do que falta decidir é gravada em dados-fonte/comentarios/REVISAO-PENDENTE.md.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTE = path.join(RAIZ, 'dados-fonte', 'comentarios');
const SAIDA = path.join(RAIZ, 'public', 'dados', 'comentarios');
const LIVROS = ['Gênesis','Êxodo','Levítico','Números','Deuteronômio','Josué','Juízes','Rute','1 Samuel','2 Samuel','1 Reis','2 Reis','1 Crônicas','2 Crônicas','Esdras','Neemias','Ester','Jó','Salmos','Provérbios','Eclesiastes','Cânticos','Isaías','Jeremias','Lamentações','Ezequiel','Daniel','Oseias','Joel','Amós','Obadias','Jonas','Miqueias','Naum','Habacuque','Sofonias','Ageu','Zacarias','Malaquias','Mateus','Marcos','Lucas','João','Atos','Romanos','1 Coríntios','2 Coríntios','Gálatas','Efésios','Filipenses','Colossenses','1 Tessalonicenses','2 Tessalonicenses','1 Timóteo','2 Timóteo','Tito','Filemom','Hebreus','Tiago','1 Pedro','2 Pedro','1 João','2 João','3 João','Judas','Apocalipse'];
const OMITIDO = '[trecho omitido]';

const chave = (o, l, c, v, t) => [o, l, c, v, t.trim()].join('|');
const revisao = new Map();
const arqRevisao = path.join(FONTE, 'revisao.json');
if (existsSync(arqRevisao)) for (const r of JSON.parse(readFileSync(arqRevisao, 'utf8'))) revisao.set(chave(r.obra, r.l, r.c, r.v, r.trecho), r.decisao);

rmSync(SAIDA, { recursive: true, force: true });
const indice = {};
const pendentes = [];
let omitidos = 0, mantidos = 0, naoAchados = 0;

for (const obra of readdirSync(FONTE).filter((n) => existsSync(path.join(FONTE, n)) && !n.includes('.'))) {
  for (const l of readdirSync(path.join(FONTE, obra))) {
    for (const arq of readdirSync(path.join(FONTE, obra, l)).filter((n) => /^\d+\.json$/.test(n))) {
      const c = Number(arq.replace('.json', ''));
      const d = JSON.parse(readFileSync(path.join(FONTE, obra, l, arq), 'utf8'));
      const atencao = d._atencao || [];
      delete d._atencao;
      for (const a of atencao) {
        const dec = revisao.get(chave(obra, Number(l), c, String(a.v), a.trecho)) || 'pendente';
        if (dec === 'manter') { mantidos++; continue; }
        if (dec === 'pendente') pendentes.push({ obra, l: Number(l), c, ...a });
        const entrada = d[String(a.v)];
        const s = entrada?.secoes?.[a.secao];
        if (s && s.texto.includes(a.trecho)) { s.texto = s.texto.replace(a.trecho, OMITIDO); omitidos++; }
        else if (entrada) {
          // não achou a frase exata: por segurança, omite a seção inteira
          const alvo = s || entrada.secoes.find((x) => x.texto.includes(a.trecho.slice(0, 40)));
          if (alvo) alvo.texto = OMITIDO;
          naoAchados++; omitidos++;
        }
      }
      for (const e of Object.values(d)) for (const s of e.secoes) { s.texto = s.texto.normalize('NFC'); s.original = (s.original || '').normalize('NFC'); }
      mkdirSync(path.join(SAIDA, obra, l), { recursive: true });
      writeFileSync(path.join(SAIDA, obra, l, `${c}.json`), JSON.stringify(d));
      ((indice[obra] ??= {})[l] ??= []).push(c);
    }
  }
}
for (const o of Object.values(indice)) for (const l of Object.keys(o)) o[l].sort((a, b) => a - b);
mkdirSync(SAIDA, { recursive: true });
writeFileSync(path.join(SAIDA, 'indice.json'), JSON.stringify(indice));

const NOMES = { vincent: 'Vincent', jfb: 'Jamieson, Fausset e Brown', keil: 'Keil & Delitzsch', robertson: 'Robertson' };
const md = ['# Trechos aguardando revisão doutrinária', '', 'Enquanto não forem aprovados, aparecem no app como "[trecho omitido]". Para aprovar, registre em `revisao.json` com "decisao": "manter".', ''];
for (const p of pendentes) md.push(`- **${NOMES[p.obra] || p.obra} · ${LIVROS[p.l]} ${p.c}:${p.v}** · tema: ${p.tema}\n  > ${p.trecho}\n  _Motivo:_ ${p.motivo}`);
writeFileSync(path.join(FONTE, 'REVISAO-PENDENTE.md'), md.join('\n') + '\n');
console.log(`Comentários montados. Trechos omitidos: ${omitidos} (pendentes: ${pendentes.length}, frase não localizada: ${naoAchados}). Aprovados: ${mantidos}.`);
