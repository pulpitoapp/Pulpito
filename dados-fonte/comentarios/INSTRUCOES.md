# Tradução de comentários bíblicos (domínio público) para o português do Brasil

Público: pregadores da Igreja Cristã Maranata, num app de Bíblia. Diretório do projeto: `/home/user/Pulpito`. Não altere nada fora dos arquivos que lhe foram indicados e não faça commit.

## Obras
- `vincent` — Marvin R. Vincent, *Word Studies in the New Testament* (1887). Estudo das palavras gregas.
- `jfb` — Jamieson, Fausset & Brown, *Commentary Critical and Explanatory on the Whole Bible* (1871). Explicação do sentido.
- `keil` — C. F. Keil & F. Delitzsch, *Commentary on the Old Testament* (1866-91). Estudo das palavras hebraicas.
- `clarke` — Adam Clarke, *Commentary on the Holy Bible* (1810-26). Comentário completo (palavras, sentido e aplicação).
- `barnes` — Albert Barnes, *Notes on the New Testament* (1832-53). Notas explicativas para pregação e ensino.

Fonte de `clarke` e `barnes`: Free Use Bible API (módulos da CrossWire), um texto por capítulo, com blocos “## Introdução (antes do versículo 1)” e “## Versículo N”. Cada bloco pode ter várias notas; em Clarke a nota começa com a expressão comentada seguida de “ - ” (ex.: “Jesus answered - …”); em Barnes, com a expressão terminada em ponto (ex.: “Verse 2. The same came to Jesus. …”). Cada nota vira uma seção, com `titulo` = a expressão comentada (sem “Verse 2.”). As linhas de Barnes no formato `(a) "palavra" Ref` são referências da margem da Bíblia inglesa, não texto do autor: não traduza. Referências nas abreviações inglesas (Mt, Mk, Lk, Jn/Joh, Ac, Ro, 1Co, Ga, Eph, Php, Col, Heb, Jas, 1Pe, 1Jo, Re, Ge/Gen, Ex, Le, Nu, De, Ps, Pr, Isa, Jer, Eze, Da etc.) viram `{{OSIS}}`; “Mk 15:40,41” vira `{{Mrk.15.40-41}}`; listas de versículos soltos viram uma chave por versículo.

## Tradução
- Fiel e COMPLETA: não resuma, não omita, não acrescente explicação nem aplicação própria. Português claro e natural.
- Termos bíblicos tradicionais: Deus, SENHOR (para Jehovah/LORD no sentido do nome divino; quando o autor escreve "Jehovah" como nome, use "Jeová"), Senhor, Verbo (Logos referido a Cristo), Espírito Santo, aliança, expiação, Septuaginta (LXX). Nomes próprios na forma usual em português. Abreviações acadêmicas: "cf." fica; "ver." para "see"; obras citadas mantêm o título original (pode traduzir entre parênteses na 1ª vez).
- Hebraico e grego: copie exatamente do original (não redigite). Se a fonte estiver em decomposição Unicode, mantenha; o app normaliza.
- Referências bíblicas viram links no formato `{{OSIS}}`: `{{Jhn.1.3}}`, `{{Gen.16.7-13}}`, `{{Pro.8}}`. Uma referência por chave. Códigos OSIS: Gen Exo Lev Num Deu Jos Jdg Rut 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam Ezk Dan Hos Jol Amo Oba Jon Mic Nam Hab Zep Hag Zec Mal Mat Mrk Luk Jhn Act Rom 1Co 2Co Gal Eph Php Col 1Th 2Th 1Ti 2Ti Tit Phm Heb Jas 1Pe 2Pe 1Jn 2Jn 3Jn Jud Rev. Abreviações da fonte (sacred-texts): Joh=Jhn, Jo1=1Jn, Co1=1Co, Th1=1Th, Ti1=1Ti, Pe1=1Pe, Phi=Php, Mar=Mrk, Sa1=1Sa, Kg1=1Ki, Ch1=1Ch etc. Referências a apócrifos ficam em texto simples ("Sabedoria 7:22").
- Use aspas tipográficas “ ” no texto (o JSON precisa continuar válido). `<i>…</i>` só para títulos de obras.

## Formato de saída
Arquivo `dados-fonte/comentarios/<obra>/<livro>/<capítulo>.json` (livro 0 = Gênesis, 42 = João; capítulo começa em 1):
```json
{
  "0": {"secoes": [{"titulo": "Introdução ao capítulo", "original": "", "texto": "…"}]},
  "1": {"ate": 5, "secoes": [{"titulo": "No princípio era", "original": "ἐν ἀρχῇ ἦν", "texto": "parágrafo\n\nparágrafo"}]},
  "_atencao": [{"v": "1", "secao": 0, "tema": "dons", "trecho": "frase exata em português do trecho", "motivo": "o autor afirma que os dons de línguas cessaram"}]
}
```
- Chave = primeiro versículo comentado; `ate` só quando o comentário cobre vários versículos (ex.: "John 1:1-5"). "0" = texto antes do versículo 1 (introdução), se houver.
- Uma seção por nota/cabeçalho da fonte, na ordem. `original` = palavra/expressão grega ou hebraica do cabeçalho (vazio se não houver). `titulo` = a expressão comentada, em português. Parágrafos separados por `\n\n`.

## Trechos para revisão doutrinária (`_atencao`) — NÃO remova nada, só aponte
Marque cada trecho em que o autor afirma posição sobre: dons espirituais (línguas, profecia, cura, se cessaram), profecia e escatologia (milênio, arrebatamento, tribulação, Israel, Anticristo, interpretação do Apocalipse), batismo (com água ou com o Espírito Santo), obra do Espírito Santo, ceia/sacramentos, predestinação/eleição, perda da salvação, guarda do sábado como obrigação dos cristãos (tema "sábado"), expressões ofensivas a povos, raças ou pessoas (tema "ofensivo"), especulações de ciência ultrapassada apresentadas como fato (tema "ciencia"), uso de textos de outras religiões (Vedas, Buda, Alcorão etc.) como prova ou ilustração (tema "religioes"), posições sobre a pessoa de Cristo, como negar a filiação eterna do Filho (tema "cristologia"), e figuras/tipos de Cristo no Antigo Testamento (marque com tema "tipologia"). `trecho` deve ser a frase exata da sua tradução, para localizar depois. Seja criterioso: só posições doutrinárias, não menções neutras.

## Conferência
Ao terminar, valide: `node -e "const d=require('ARQUIVO');for(const[k,v] of Object.entries(d)) if(k!=='_atencao') console.log(k, v.ate||'', v.secoes.length, v.secoes.reduce((s,x)=>s+x.texto.split(/\s+/).length,0))"`. A contagem de palavras em português deve ficar entre 85% e 125% do inglês do capítulo; nenhuma frase em inglês pode sobrar. Responda com: arquivos gravados, palavras (inglês × português), quantos trechos em `_atencao` e dúvidas.

## Critério da revisão (definido pelo usuário)
- Prioridade é sempre o entendimento da Igreja Cristã Maranata. Trecho que diverge não vai para o app.
- Eleição e livre-arbítrio (vale o ensino das apostilas): Deus elege e chama por iniciativa dele, mas o homem tem a escolha de aceitar ou rejeitar o chamado, e quem foi servo pode se desviar. Saem os trechos de predestinação incondicional, graça irresistível ou chamado “infalível/eficaz” que não pode ser recusado, perseverança garantida (“uma vez salvo, salvo para sempre”, crente verdadeiro não pode se perder) e reprovação por decreto (alguém “destinado” à perdição). Ficam os trechos que mostram a iniciativa de Deus, a responsabilidade do homem e o perigo de se desviar.
- Figuras de Cristo no Antigo Testamento são bem-vindas (ex.: o cordeiro sacrificado/túnicas de peles apontam para Jesus); trechos que neguem essas figuras são omitidos.
- Na dúvida, o trecho fica fora e vai para "Pontos para confirmar depois" (decisao "confirmar").
