# Tradução do interlinear (hebraico e grego) para o português do Brasil

Dados de origem: STEPBible (Tyndale House, Cambridge), em inglês. Público: pregadores de uma igreja evangélica (Igreja Cristã Maranata). Exige precisão: é estudo do texto bíblico no original.

Diretório: `/home/user/pulpito-main`. Não altere nenhum arquivo fora dos que lhe foram indicados e não faça commit.

## Tipo A — glosas (significado curto de cada palavra no versículo)

Entrada: `dados-fonte/interlinear/pendente/glosas-NN.json` — uma lista de textos em inglês.
Saída: `dados-fonte/interlinear/pt/glosas-NN.json` — um objeto `{"texto em inglês exatamente igual": "tradução"}` com **todas** as entradas da lista.

Regras:
- São traduções palavra por palavra de UMA palavra hebraica ou grega (às vezes com prefixos e sufixos). A barra `/` separa partes da mesma palavra: "in/ beginning" → "no princípio"; "and/ the/ earth" → "e a terra"; "the/ heavens" → "os céus". No português, junte as partes com espaço e faça as contrações naturais (em+o = no, de+a = da, a+o = ao). Não deixe barras na tradução.
- `<obj.>` e `[Obj.]` marcam o objeto direto sem tradução: traduza como "(obj.)". Texto entre `< >` é palavra implícita: mantenha entre ⟨ ⟩, ex.: "<and>/ he" → "⟨e⟩ ele". Texto entre `[ ]` é palavra acrescentada pelo tradutor: quando o português pede contração, junte sem colchetes ("In [the]" → "No"); nos demais casos conserve os colchetes ("was [being]" → "era [sendo]").
- Curto e literal, como num interlinear: o sentido da palavra, sem explicar. Use "Deus", "SENHOR" (para LORD/Yahweh), "Senhor", "Espírito", termos bíblicos tradicionais (aliança, iniquidade, propiciação, primogênito, côvado, siclo).
- Fragmentos de nomes ("-el", "-lehem") ficam como estão. Nomes próprios na forma tradicional em português (Abraão, Isaque, Jacó, Faraó, Egito).
- Verbos: conserve pessoa e tempo do inglês ("he created" → "ele criou"; "you shall eat" → "comerás"; "let there be" → "haja").

## Tipo B — verbetes de dicionário

Entrada: `dados-fonte/interlinear/pendente/verbetes/lote-NN.json` — lista de objetos `{id, original, translit, classe, glosa, def}`.
Saída: `dados-fonte/interlinear/pt/verbetes/lote-NN.json` — lista com **todos** os ids do lote, cada um `{"id": "...", "glosa": "glosa traduzida", "def": "definição traduzida"}`.

Regras:
- Traduza `glosa` (curta) e `def` (verbete completo) para o português do Brasil, fielmente: não resuma, não acrescente explicações próprias, não interprete teologicamente. É um dicionário acadêmico (BDB abreviado para o hebraico; Abbott-Smith/LSJ para o grego).
- **Mantenha intactos**: as palavras em hebraico e em grego; as marcações `<b>…</b>` e `<i>…</i>`; as quebras de linha `\n`; as referências entre chaves duplas, como `{{Gen.1.1}}` ou `{{1Pe.2.17; 3.10}}` (não traduza nem altere o que está dentro das chaves); números de Strong (H1234, G5678).
- Abreviaturas acadêmicas em inglês: traduza as comuns (cf. = cf.; "ib." = "ib."; "esp." = "esp."; "LXX" = "LXX"; "NT" = "NT"; "OT" = "AT"; "of" = "de"). Siglas de obras (AS, LS, MM, VGT, BDB, Thayer, Cremer, Tr. Syn.) ficam como estão.
- Classes gramaticais e termos técnicos em português: verb = verbo; noun = substantivo; masculine = masculino; feminine = feminino; Qal, Niphal, Piel, Pual, Hiphil, Hophal, Hithpael ficam como estão; aorist = aoristo; perfect = perfeito; middle = médio; passive = passivo; participle = particípio; genitive = genitivo; dative = dativo; accusative = acusativo.
- "LORD" (Yahweh) = "SENHOR"; "Lord" = "Senhor"; "God" = "Deus".
- JSON válido: aspas dentro do texto devem ser escapadas (\") ou tipográficas (“ ”).

## Conferência

Ao terminar cada arquivo, rode `node scripts/validar-interlinear.mjs` e corrija tudo o que ele apontar para os SEUS arquivos. Termine só quando os seus arquivos passarem. Responda no fim com: arquivos gravados e se a validação passou.
