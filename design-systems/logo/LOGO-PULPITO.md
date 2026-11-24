# Logo do Púlpito — guia para implementação

Este arquivo reúne tudo o que é preciso para aplicar o logo escolhido ("Fita marcadora") no aplicativo Púlpito. Os códigos SVG abaixo são a fonte oficial: copie-os como estão, sem redesenhar.

## 1. O que é o símbolo

Um livro aberto visto de frente, com uma fita marcadora dourada caindo da página direita. Representa a Bíblia aberta no ponto onde a leitura parou.

## 2. Cores (usar somente estas)

| Nome | Hex | Uso |
|---|---|---|
| Vinho | `#4a1626` | Cor principal: símbolo, nome, fundo do ícone |
| Dourado | `#c9a24a` | Somente a fita (no símbolo e no "p" do nome) e o trecho "pito" do nome sobre fundo vinho |
| Branco | `#ffffff` | Páginas do livro e "Púl" sobre fundo vinho |
| Claro de fundo | `#f6f2ef` | Fundo de telas e superfícies claras |

Sugestão de variáveis CSS:

```css
:root {
  --pulpito-vinho: #4a1626;
  --pulpito-dourado: #c9a24a;
  --pulpito-branco: #ffffff;
  --pulpito-claro: #f6f2ef;
}
```

## 3. Tipografia

- Fonte: **Merriweather Black** (peso 900), do Google Fonts.
- No logo, o nome usa os arquivos SVG da seção 5 (com a fita no "p"), não texto digitado.
- Quando o nome aparecer em texto corrido, escrever sempre **"Púlpito"**, com acento e só a primeira letra maiúscula.
- Espaçamento entre letras: `-0.5px` no tamanho 40 px (proporcional nos demais).

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap">
```

```css
.pulpito-nome {
  font-family: 'Merriweather', serif;
  font-weight: 900;
  letter-spacing: -0.0125em;
  line-height: 1;
}
```

## 4. Arquivos SVG

Salve cada bloco no caminho indicado (sugestão: pasta `assets/logo/`).

### 4.1 Símbolo, duas cores — `simbolo.svg`

Para fundos claros (branco ou `#f6f2ef`).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><path d="M46 22C36 16 22 16 10 20V58C22 54 36 54 46 60Z" fill="#4a1626"/><path d="M50 22C60 16 74 16 86 20V58C74 54 60 54 50 60Z" fill="#4a1626"/><path d="M58 52H66V80L62 75L58 80Z" fill="#c9a24a"/></svg>
```

### 4.2 Símbolo para fundo vinho — `simbolo-fundo-vinho.svg`

Páginas brancas e fita dourada. Fundo transparente: aplicar sobre `#4a1626`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><path d="M46 22C36 16 22 16 10 20V58C22 54 36 54 46 60Z" fill="#ffffff"/><path d="M50 22C60 16 74 16 86 20V58C74 54 60 54 50 60Z" fill="#ffffff"/><path d="M58 52H66V80L62 75L58 80Z" fill="#c9a24a"/></svg>
```

### 4.3 Símbolo em uma cor — `simbolo-uma-cor.svg`

Tudo em vinho. Usa `currentColor`, então a cor pode ser trocada pelo CSS (`color: ...`).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="currentColor" color="#4a1626"><path d="M46 22C36 16 22 16 10 20V58C22 54 36 54 46 60Z"/><path d="M50 22C60 16 74 16 86 20V58C74 54 60 54 50 60Z"/><path d="M58 52H66V80L62 75L58 80Z"/></svg>
```

### 4.4 Ícone de app com cantos arredondados — `icone-app.svg`

Quadrado vinho com cantos arredondados. Usar na web: favicon, PWA (`purpose: any`) e telas internas.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="43" fill="#4a1626"/><g transform="translate(34.56 34.56) scale(1.28)"><path d="M46 22C36 16 22 16 10 20V58C22 54 36 54 46 60Z" fill="#ffffff"/><path d="M50 22C60 16 74 16 86 20V58C74 54 60 54 50 60Z" fill="#ffffff"/><path d="M58 52H66V80L62 75L58 80Z" fill="#c9a24a"/></g></svg>
```

### 4.5 Ícone de app sem cantos (fundo cheio) — `icone-app-quadrado.svg`

Quadrado vinho inteiro, com o símbolo um pouco menor. Usar onde o sistema recorta o ícone sozinho: App Store (iOS), ícone adaptativo do Android e PWA `purpose: maskable`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="#4a1626"/><g transform="translate(43.2 43.2) scale(1.1)"><path d="M46 22C36 16 22 16 10 20V58C22 54 36 54 46 60Z" fill="#ffffff"/><path d="M50 22C60 16 74 16 86 20V58C74 54 60 54 50 60Z" fill="#ffffff"/><path d="M58 52H66V80L62 75L58 80Z" fill="#c9a24a"/></g></svg>
```

## 5. Nome "Púlpito" com a fita

No logo, o nome **não é texto digitado**: é um desenho em SVG. A haste do "p" que vem antes do "i" foi transformada na fita marcadora, mais comprida que a letra e com o corte em V na ponta, igual à fita do símbolo. Use sempre os arquivos abaixo; não tente recriar o efeito com a fonte e CSS.

As letras foram desenhadas a partir da Merriweather Black. A fonte da seção 3 continua valendo para os demais textos do app.

### 5.1 Nome para fundo claro — `nome.svg`

Nome todo em vinho, só a fita em dourado.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7170 2440"><g transform="translate(0 1840) scale(1 -1)"><path transform="translate(0 0)" d="M231 153V1319L85 1347V1486H409Q455 1486 503.0 1489.0Q551 1492 609.5 1495.0Q668 1498 745 1497Q965 1497 1087.0 1445.0Q1209 1393 1258.5 1294.0Q1308 1195 1308 1052Q1308 883 1239.5 762.0Q1171 641 1038.0 576.5Q905 512 712 512Q684 512 655.0 513.0Q626 514 604.5 515.5Q583 517 574 518V153L837 132V0H79V132ZM573 656Q590 652 622.5 649.5Q655 647 704 647Q777 647 834.0 683.0Q891 719 924.5 806.0Q958 893 958 1045Q958 1157 930.0 1227.5Q902 1298 845.5 1331.0Q789 1364 703 1364Q667 1364 644.0 1362.0Q621 1360 605.0 1357.5Q589 1355 573 1352Z" fill="#4a1626"/><path transform="translate(1320 0)" d="M980 -20Q907 -20 875.5 12.0Q844 44 844 102V146Q814 105 760.5 66.5Q707 28 641.0 3.0Q575 -22 506 -22Q310 -22 227.0 75.0Q144 172 144 400V956L50 982V1110L426 1136H428L472 1108V392Q472 305 486.0 254.5Q500 204 532.0 182.0Q564 160 618 160Q666 160 702.5 173.0Q739 186 765.0 203.5Q791 221 806 236V956L680 986V1110L1078 1136H1084L1132 1108V138H1238V10Q1201 3 1133.5 -8.5Q1066 -20 980 -20ZM589 1268 477 1366 825 1797 1017 1626Q991 1581 939.0 1526.5Q887 1472 824.0 1419.0Q761 1366 699.5 1325.5Q638 1285 593 1268Z" fill="#4a1626"/><path transform="translate(2593 0)" d="M178 151V1444L37 1471V1592L438 1639H443L502 1597V150L632 132V0H50V132Z" fill="#4a1626"/><g transform="translate(3236 0)"><clipPath id="nc1"><rect x="517" y="-100" width="900" height="1400"/></clipPath><path clip-path="url(#nc1)" d="M75 -484V-360L195 -334V902L75 938V1094L433 1138H437L491 1096V988Q518 1024 563.5 1059.0Q609 1094 669.5 1117.0Q730 1140 801 1140Q920 1140 1018.5 1084.5Q1117 1029 1176.0 908.5Q1235 788 1235 592Q1235 471 1197.5 360.5Q1160 250 1084.5 163.5Q1009 77 897.5 27.5Q786 -22 637 -22Q603 -22 567.0 -15.5Q531 -9 511 -2L517 -164V-334L689 -360V-484ZM643 110Q710 110 766.0 152.5Q822 195 855.5 293.0Q889 391 889 558Q889 664 874.0 739.5Q859 815 831.0 863.0Q803 911 765.5 933.5Q728 956 683 956Q646 956 613.5 945.5Q581 935 556.0 918.5Q531 902 517 884V152Q531 136 564.5 123.0Q598 110 643 110Z" fill="#4a1626"/><path d="M195 1140H517V-560L356 -420L195 -560Z" fill="#c9a24a"/></g><path transform="translate(4512 0)" d="M81 0V132L207 151V901L71 940V1090L472 1138H476L537 1096V150L658 132V0ZM343 1283Q259 1283 215.0 1335.5Q171 1388 171 1450Q171 1529 219.0 1585.0Q267 1641 361 1641H363Q447 1641 491.0 1591.0Q535 1541 535 1479Q535 1400 487.0 1341.5Q439 1283 345 1283Z" fill="#4a1626"/><path transform="translate(5193 0)" d="M406 -18Q274 -18 211.0 43.5Q148 105 148 232V944H26V1069Q51 1079 75.5 1086.5Q100 1094 120.5 1102.0Q141 1110 155 1123Q169 1137 179.0 1151.0Q189 1165 197.5 1183.0Q206 1201 215 1225Q226 1251 236.5 1281.5Q247 1312 257.5 1345.5Q268 1379 277 1412H466L478 1112H753V944H481V415Q481 311 488.5 263.0Q496 215 518.0 202.5Q540 190 582 190Q627 190 673.0 200.0Q719 210 750 221L793 96Q757 68 696.0 42.0Q635 16 560.0 -1.0Q485 -18 406 -18Z" fill="#4a1626"/><path transform="translate(5986 0)" d="M53 550Q53 700 98.5 811.0Q144 922 223.0 995.0Q302 1068 403.5 1104.0Q505 1140 618 1140Q784 1140 904.5 1072.5Q1025 1005 1090.5 877.5Q1156 750 1156 568Q1156 414 1110.5 302.5Q1065 191 986.0 119.0Q907 47 805.0 12.5Q703 -22 590 -22Q466 -22 367.0 16.0Q268 54 198.0 127.5Q128 201 90.5 307.5Q53 414 53 550ZM610 117Q674 117 716.0 162.0Q758 207 779.5 301.5Q801 396 801 544Q801 657 790.5 742.5Q780 828 757.0 885.5Q734 943 696.5 972.0Q659 1001 605 1001Q542 1001 498.0 956.0Q454 911 431.0 817.0Q408 723 408 574Q408 460 419.5 374.5Q431 289 455.5 232.0Q480 175 518.0 146.0Q556 117 610 117Z" fill="#4a1626"/></g></svg>
```

### 5.2 Nome para fundo vinho — `nome-fundo-vinho.svg`

"Púl" em branco e "pito" em dourado, com a fita. Fundo transparente: aplicar sobre `#4a1626`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7170 2440"><g transform="translate(0 1840) scale(1 -1)"><path transform="translate(0 0)" d="M231 153V1319L85 1347V1486H409Q455 1486 503.0 1489.0Q551 1492 609.5 1495.0Q668 1498 745 1497Q965 1497 1087.0 1445.0Q1209 1393 1258.5 1294.0Q1308 1195 1308 1052Q1308 883 1239.5 762.0Q1171 641 1038.0 576.5Q905 512 712 512Q684 512 655.0 513.0Q626 514 604.5 515.5Q583 517 574 518V153L837 132V0H79V132ZM573 656Q590 652 622.5 649.5Q655 647 704 647Q777 647 834.0 683.0Q891 719 924.5 806.0Q958 893 958 1045Q958 1157 930.0 1227.5Q902 1298 845.5 1331.0Q789 1364 703 1364Q667 1364 644.0 1362.0Q621 1360 605.0 1357.5Q589 1355 573 1352Z" fill="#ffffff"/><path transform="translate(1320 0)" d="M980 -20Q907 -20 875.5 12.0Q844 44 844 102V146Q814 105 760.5 66.5Q707 28 641.0 3.0Q575 -22 506 -22Q310 -22 227.0 75.0Q144 172 144 400V956L50 982V1110L426 1136H428L472 1108V392Q472 305 486.0 254.5Q500 204 532.0 182.0Q564 160 618 160Q666 160 702.5 173.0Q739 186 765.0 203.5Q791 221 806 236V956L680 986V1110L1078 1136H1084L1132 1108V138H1238V10Q1201 3 1133.5 -8.5Q1066 -20 980 -20ZM589 1268 477 1366 825 1797 1017 1626Q991 1581 939.0 1526.5Q887 1472 824.0 1419.0Q761 1366 699.5 1325.5Q638 1285 593 1268Z" fill="#ffffff"/><path transform="translate(2593 0)" d="M178 151V1444L37 1471V1592L438 1639H443L502 1597V150L632 132V0H50V132Z" fill="#ffffff"/><g transform="translate(3236 0)"><clipPath id="nc2"><rect x="517" y="-100" width="900" height="1400"/></clipPath><path clip-path="url(#nc2)" d="M75 -484V-360L195 -334V902L75 938V1094L433 1138H437L491 1096V988Q518 1024 563.5 1059.0Q609 1094 669.5 1117.0Q730 1140 801 1140Q920 1140 1018.5 1084.5Q1117 1029 1176.0 908.5Q1235 788 1235 592Q1235 471 1197.5 360.5Q1160 250 1084.5 163.5Q1009 77 897.5 27.5Q786 -22 637 -22Q603 -22 567.0 -15.5Q531 -9 511 -2L517 -164V-334L689 -360V-484ZM643 110Q710 110 766.0 152.5Q822 195 855.5 293.0Q889 391 889 558Q889 664 874.0 739.5Q859 815 831.0 863.0Q803 911 765.5 933.5Q728 956 683 956Q646 956 613.5 945.5Q581 935 556.0 918.5Q531 902 517 884V152Q531 136 564.5 123.0Q598 110 643 110Z" fill="#c9a24a"/><path d="M195 1140H517V-560L356 -420L195 -560Z" fill="#c9a24a"/></g><path transform="translate(4512 0)" d="M81 0V132L207 151V901L71 940V1090L472 1138H476L537 1096V150L658 132V0ZM343 1283Q259 1283 215.0 1335.5Q171 1388 171 1450Q171 1529 219.0 1585.0Q267 1641 361 1641H363Q447 1641 491.0 1591.0Q535 1541 535 1479Q535 1400 487.0 1341.5Q439 1283 345 1283Z" fill="#c9a24a"/><path transform="translate(5193 0)" d="M406 -18Q274 -18 211.0 43.5Q148 105 148 232V944H26V1069Q51 1079 75.5 1086.5Q100 1094 120.5 1102.0Q141 1110 155 1123Q169 1137 179.0 1151.0Q189 1165 197.5 1183.0Q206 1201 215 1225Q226 1251 236.5 1281.5Q247 1312 257.5 1345.5Q268 1379 277 1412H466L478 1112H753V944H481V415Q481 311 488.5 263.0Q496 215 518.0 202.5Q540 190 582 190Q627 190 673.0 200.0Q719 210 750 221L793 96Q757 68 696.0 42.0Q635 16 560.0 -1.0Q485 -18 406 -18Z" fill="#c9a24a"/><path transform="translate(5986 0)" d="M53 550Q53 700 98.5 811.0Q144 922 223.0 995.0Q302 1068 403.5 1104.0Q505 1140 618 1140Q784 1140 904.5 1072.5Q1025 1005 1090.5 877.5Q1156 750 1156 568Q1156 414 1110.5 302.5Q1065 191 986.0 119.0Q907 47 805.0 12.5Q703 -22 590 -22Q466 -22 367.0 16.0Q268 54 198.0 127.5Q128 201 90.5 307.5Q53 414 53 550ZM610 117Q674 117 716.0 162.0Q758 207 779.5 301.5Q801 396 801 544Q801 657 790.5 742.5Q780 828 757.0 885.5Q734 943 696.5 972.0Q659 1001 605 1001Q542 1001 498.0 956.0Q454 911 431.0 817.0Q408 723 408 574Q408 460 419.5 374.5Q431 289 455.5 232.0Q480 175 518.0 146.0Q556 117 610 117Z" fill="#c9a24a"/></g></svg>
```

### 5.3 Nome em uma cor — `nome-uma-cor.svg`

Tudo em vinho, sobre fundo claro.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7170 2440"><g transform="translate(0 1840) scale(1 -1)"><path transform="translate(0 0)" d="M231 153V1319L85 1347V1486H409Q455 1486 503.0 1489.0Q551 1492 609.5 1495.0Q668 1498 745 1497Q965 1497 1087.0 1445.0Q1209 1393 1258.5 1294.0Q1308 1195 1308 1052Q1308 883 1239.5 762.0Q1171 641 1038.0 576.5Q905 512 712 512Q684 512 655.0 513.0Q626 514 604.5 515.5Q583 517 574 518V153L837 132V0H79V132ZM573 656Q590 652 622.5 649.5Q655 647 704 647Q777 647 834.0 683.0Q891 719 924.5 806.0Q958 893 958 1045Q958 1157 930.0 1227.5Q902 1298 845.5 1331.0Q789 1364 703 1364Q667 1364 644.0 1362.0Q621 1360 605.0 1357.5Q589 1355 573 1352Z" fill="#4a1626"/><path transform="translate(1320 0)" d="M980 -20Q907 -20 875.5 12.0Q844 44 844 102V146Q814 105 760.5 66.5Q707 28 641.0 3.0Q575 -22 506 -22Q310 -22 227.0 75.0Q144 172 144 400V956L50 982V1110L426 1136H428L472 1108V392Q472 305 486.0 254.5Q500 204 532.0 182.0Q564 160 618 160Q666 160 702.5 173.0Q739 186 765.0 203.5Q791 221 806 236V956L680 986V1110L1078 1136H1084L1132 1108V138H1238V10Q1201 3 1133.5 -8.5Q1066 -20 980 -20ZM589 1268 477 1366 825 1797 1017 1626Q991 1581 939.0 1526.5Q887 1472 824.0 1419.0Q761 1366 699.5 1325.5Q638 1285 593 1268Z" fill="#4a1626"/><path transform="translate(2593 0)" d="M178 151V1444L37 1471V1592L438 1639H443L502 1597V150L632 132V0H50V132Z" fill="#4a1626"/><g transform="translate(3236 0)"><clipPath id="nc3"><rect x="517" y="-100" width="900" height="1400"/></clipPath><path clip-path="url(#nc3)" d="M75 -484V-360L195 -334V902L75 938V1094L433 1138H437L491 1096V988Q518 1024 563.5 1059.0Q609 1094 669.5 1117.0Q730 1140 801 1140Q920 1140 1018.5 1084.5Q1117 1029 1176.0 908.5Q1235 788 1235 592Q1235 471 1197.5 360.5Q1160 250 1084.5 163.5Q1009 77 897.5 27.5Q786 -22 637 -22Q603 -22 567.0 -15.5Q531 -9 511 -2L517 -164V-334L689 -360V-484ZM643 110Q710 110 766.0 152.5Q822 195 855.5 293.0Q889 391 889 558Q889 664 874.0 739.5Q859 815 831.0 863.0Q803 911 765.5 933.5Q728 956 683 956Q646 956 613.5 945.5Q581 935 556.0 918.5Q531 902 517 884V152Q531 136 564.5 123.0Q598 110 643 110Z" fill="#4a1626"/><path d="M195 1140H517V-560L356 -420L195 -560Z" fill="#4a1626"/></g><path transform="translate(4512 0)" d="M81 0V132L207 151V901L71 940V1090L472 1138H476L537 1096V150L658 132V0ZM343 1283Q259 1283 215.0 1335.5Q171 1388 171 1450Q171 1529 219.0 1585.0Q267 1641 361 1641H363Q447 1641 491.0 1591.0Q535 1541 535 1479Q535 1400 487.0 1341.5Q439 1283 345 1283Z" fill="#4a1626"/><path transform="translate(5193 0)" d="M406 -18Q274 -18 211.0 43.5Q148 105 148 232V944H26V1069Q51 1079 75.5 1086.5Q100 1094 120.5 1102.0Q141 1110 155 1123Q169 1137 179.0 1151.0Q189 1165 197.5 1183.0Q206 1201 215 1225Q226 1251 236.5 1281.5Q247 1312 257.5 1345.5Q268 1379 277 1412H466L478 1112H753V944H481V415Q481 311 488.5 263.0Q496 215 518.0 202.5Q540 190 582 190Q627 190 673.0 200.0Q719 210 750 221L793 96Q757 68 696.0 42.0Q635 16 560.0 -1.0Q485 -18 406 -18Z" fill="#4a1626"/><path transform="translate(5986 0)" d="M53 550Q53 700 98.5 811.0Q144 922 223.0 995.0Q302 1068 403.5 1104.0Q505 1140 618 1140Q784 1140 904.5 1072.5Q1025 1005 1090.5 877.5Q1156 750 1156 568Q1156 414 1110.5 302.5Q1065 191 986.0 119.0Q907 47 805.0 12.5Q703 -22 590 -22Q466 -22 367.0 16.0Q268 54 198.0 127.5Q128 201 90.5 307.5Q53 414 53 550ZM610 117Q674 117 716.0 162.0Q758 207 779.5 301.5Q801 396 801 544Q801 657 790.5 742.5Q780 828 757.0 885.5Q734 943 696.5 972.0Q659 1001 605 1001Q542 1001 498.0 956.0Q454 911 431.0 817.0Q408 723 408 574Q408 460 419.5 374.5Q431 289 455.5 232.0Q480 175 518.0 146.0Q556 117 610 117Z" fill="#4a1626"/></g></svg>
```

### 5.4 Versão horizontal (símbolo + nome)

Símbolo e nome lado a lado, com a mesma altura e alinhados pelo centro. Espaço entre os dois = 0,2 × a altura.

```html
<!-- Fundo claro -->
<span class="pulpito-logo" role="img" aria-label="Púlpito">
  <img src="assets/logo/simbolo.svg" alt="">
  <img src="assets/logo/nome.svg" alt="">
</span>

<!-- Fundo vinho -->
<span class="pulpito-logo" role="img" aria-label="Púlpito">
  <img src="assets/logo/simbolo-fundo-vinho.svg" alt="">
  <img src="assets/logo/nome-fundo-vinho.svg" alt="">
</span>

<!-- Uma cor só (fundo claro) -->
<span class="pulpito-logo" role="img" aria-label="Púlpito">
  <img src="assets/logo/simbolo-uma-cor.svg" alt="">
  <img src="assets/logo/nome-uma-cor.svg" alt="">
</span>
```

```css
.pulpito-logo {
  --altura: 68px;             /* mude aqui para escalar o logo inteiro */
  display: inline-flex;
  align-items: center;
  gap: calc(var(--altura) * 0.2);
}
.pulpito-logo img { height: var(--altura); width: auto; display: block; }
```

## 6. Tamanhos do ícone a gerar

Gerar PNGs a partir dos SVGs da seção 4 (por exemplo com `sharp`, `rsvg-convert` ou Inkscape).

| Uso | Origem | Tamanhos (px) |
|---|---|---|
| Favicon | `icone-app.svg` | 16, 32, 48 |
| PWA `purpose: any` | `icone-app.svg` | 192, 512 |
| PWA `purpose: maskable` | `icone-app-quadrado.svg` | 192, 512 |
| Apple touch icon | `icone-app-quadrado.svg` | 180 |
| Android (launcher) | `icone-app-quadrado.svg` | 48, 72, 96, 144, 192 |
| Lojas (App Store / Play) | `icone-app-quadrado.svg` | 1024 / 512 |

## 7. Regras de uso

- **Nunca** usar cruz, crucifixo ou forma que lembre uma cruz em nenhum elemento ligado ao logo. Também não usar pomba, peixe, chama, coroa de espinhos, mãos em oração, vitral ou figura humana.
- Sem degradê, sem sombra, sem contorno e sem efeitos no símbolo.
- Não mudar as proporções, não girar e não redesenhar as formas.
- A fita fica sempre na página direita, fora do centro. Não centralizá-la: fita no centro sob o livro forma um "T".
- Dourado só na fita (do símbolo e do "p" do nome) e no trecho "pito" sobre fundo vinho. Não escrever texto dourado sobre fundo claro (fica ilegível).
- Não alterar o desenho do nome: a fita no "p" faz parte do logo.
- Nome com menos de 120 px de largura: a fita quase não aparece; nesse tamanho, preferir o ícone de app ou só o símbolo.
- Área de respiro: deixar em volta do logo um espaço livre de pelo menos 1/4 da altura do símbolo.
- Tamanho mínimo do símbolo: 24 px. Abaixo de 32 px, preferir o ícone de app (com fundo vinho).
- Estilo geral do app: reverente e sereno, com cara de livro encadernado, não de aplicativo de tecnologia.
