'use client';
// Minha leitura: relatório (progresso, tempo de uso, marcações, mensagens) e a edição do que já foi lido.
import { useState } from 'react';
import { LIVROS } from '@/lib/biblia';
import { useDados } from '@/lib/cliente/dados';
import { CAPITULOS, definirLidos, hoje, porcento, resumo, TOTAL_CAPITULOS, useLeitura } from '@/lib/cliente/leitura';
import { Cabecalho, Carregando, Confirmar } from './Cabecalho';
import { useApp } from './contexto';

const horas = (s: number) => (s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
const pct = porcento;

export function Leitura() {
  const { perfil } = useApp();
  const l = useLeitura();
  const dados = useDados();
  const [aba, setAba] = useState<'relatorio' | 'marcar'>('relatorio');
  if (!l.pronto) return <Carregando />;
  return (
    <>
      <Cabecalho titulo="Minha leitura" sub="Relatório e progresso" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-8 pt-3 lg:max-w-4xl">
        <div className="flex gap-2" role="group" aria-label="Relatório ou marcar leitura">
          <button type="button" className="chip flex-1" aria-pressed={aba === 'relatorio'} onClick={() => setAba('relatorio')}>Relatório</button>
          <button type="button" className="chip flex-1" aria-pressed={aba === 'marcar'} onClick={() => setAba('marcar')}>Marcar o que li</button>
        </div>
        {aba === 'relatorio' ? <Relatorio lidos={l.lidos} uso={l.uso} dados={dados} uid={perfil.id} /> : <Marcar lidos={l.lidos} />}
      </main>
    </>
  );
}

function Relatorio({ lidos, uso, dados, uid }: { lidos: ReturnType<typeof useLeitura>['lidos']; uso: Record<string, number>; dados: ReturnType<typeof useDados>; uid: string }) {
  const r = resumo(lidos);
  const capsAT = r.porLivro.slice(0, 39).reduce((a, b) => a + b, 0), totAT = CAPITULOS.slice(0, 39).reduce((a, b) => a + b, 0);
  const capsNT = r.caps - capsAT, totNT = TOTAL_CAPITULOS - totAT;
  // tempo de uso
  const d = new Date();
  const dia = (n: number) => { const x = new Date(d); x.setDate(d.getDate() - n); return x.toLocaleDateString('sv-SE'); };
  const semana = Array.from({ length: 7 }, (_, i) => dia(6 - i));
  const somaEntre = (f: (k: string) => boolean) => Object.entries(uso).filter(([k]) => f(k)).reduce((a, [, s]) => a + s, 0);
  const mes = hoje().slice(0, 7), ano = hoje().slice(0, 4);
  const maxSemana = Math.max(60, ...semana.map((k) => uso[k] || 0));
  // números do app
  const minhas = dados.mensagens.filter((m) => m.autor_id === uid && (m.titulo.trim() || m.conteudo.texto.trim() || m.conteudo.refs.length || m.conteudo.tracos.length));
  const maisLidos = Object.entries(lidos).filter(([, x]) => x.v > 0).sort((a, b) => b[1].v - a[1].v).slice(0, 5);

  return (
    <>
      <section className="cartao relatorio-progresso">
        <div className="anel" style={{ ['--p' as string]: `${r.pct * 360}deg` }} aria-hidden="true"><span>{pct(r.pct)}</span></div>
        <div className="flex-1">
          <p className="rot m-0">Bíblia lida</p>
          <p className="m-0 mt-1 text-[17px]"><b>{r.caps}</b> de {TOTAL_CAPITULOS} capítulos</p>
          <p className="m-0 text-[17px]"><b>{r.livros}</b> de 66 livros completos</p>
          <div className="mt-3 grid gap-2 text-[13.5px]">
            <Barra rotulo="Antigo Testamento" valor={capsAT / totAT} />
            <Barra rotulo="Novo Testamento" valor={capsNT / totNT} />
          </div>
        </div>
      </section>

      <section className="cartao">
        <p className="rot m-0">Tempo no Púlpito</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Numero rotulo="Hoje" valor={horas(uso[hoje()] || 0)} />
          <Numero rotulo="7 dias" valor={horas(semana.reduce((a, k) => a + (uso[k] || 0), 0))} />
          <Numero rotulo="Este mês" valor={horas(somaEntre((k) => k.startsWith(mes)))} />
          <Numero rotulo="Este ano" valor={horas(somaEntre((k) => k.startsWith(ano)))} />
        </div>
        <div className="grafico-semana mt-4" aria-label="Tempo de uso nos últimos 7 dias">
          {semana.map((k) => (
            <div key={k} title={`${k.split('-').reverse().join('/')}: ${horas(uso[k] || 0)}`}>
              <span style={{ height: `${Math.max(3, ((uso[k] || 0) / maxSemana) * 100)}%` }} />
              <small>{new Date(k + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="cartao">
        <p className="rot m-0">No app</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Numero rotulo="Marcações" valor={String(Object.keys(dados.destaques).length)} />
          <Numero rotulo="Anotações" valor={String(Object.keys(dados.notas).length)} />
          <Numero rotulo="Mensagens preparadas" valor={String(minhas.length)} />
          <Numero rotulo="Vezes que preguei" valor={String(dados.pregacoes.length)} />
        </div>
      </section>

      {maisLidos.length ? (
        <section className="cartao">
          <p className="rot m-0">Capítulos que você mais leu</p>
          <ol className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
            {maisLidos.map(([k, x]) => { const [lv, c] = k.split('.').map(Number); return <li key={k}><a href={`#/biblia/${lv}/${c}`} className="flex justify-between rounded-xl border border-line px-3 py-2 no-underline"><span>{LIVROS[lv]} {c + 1}</span><b>{x.v} {x.v === 1 ? 'vez' : 'vezes'}</b></a></li>; })}
          </ol>
        </section>
      ) : null}
      <p className="ajuda text-center">Um capítulo conta como lido quando você chega a 75% dele. Dá para corrigir em “Marcar o que li”.</p>
    </>
  );
}

function Barra({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div>
      <div className="flex justify-between"><span>{rotulo}</span><b>{pct(valor)}</b></div>
      <span className="progresso-barra mt-1"><span style={{ width: `${Math.max(1, valor * 100)}%` }} /></span>
    </div>
  );
}
function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return <div className="numero"><b>{valor}</b><span>{rotulo}</span></div>;
}

function Marcar({ lidos }: { lidos: ReturnType<typeof useLeitura>['lidos'] }) {
  const r = resumo(lidos);
  const [aberto, setAberto] = useState<number | null>(null);
  const [desmarcar, setDesmarcar] = useState<number | null>(null);
  const livro = (lv: number) => {
    const n = CAPITULOS[lv], feitos = r.porLivro[lv];
    return (
      <li key={lv} className="cartao !p-0">
        <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={aberto === lv} onClick={() => setAberto(aberto === lv ? null : lv)}>
          <span className="flex-1"><b className="block text-[16px]">{LIVROS[lv]}</b><span className="progresso-barra mt-1.5"><span style={{ width: `${Math.max(1, (feitos / n) * 100)}%` }} /></span></span>
          <span className={`etiqueta ${feitos === n ? '!bg-escuro !text-white' : ''}`}>{feitos === n ? 'Concluído' : `${feitos}/${n}`}</span>
        </button>
        {aberto === lv ? (
          <div className="border-t border-line px-4 pb-4 pt-3">
            <p className="ajuda !mt-0">Toque num capítulo para marcar ou desmarcar.</p>
            <div className="grade-capitulos">
              {Array.from({ length: n }, (_, c) => {
                const v = lidos[`${lv}.${c}`]?.v || 0;
                return <button key={c} type="button" aria-pressed={v > 0} aria-label={`${LIVROS[lv]} ${c + 1}${v ? `, lido ${v} vezes` : ''}`} onClick={() => definirLidos([[lv, c]], v === 0)}>{c + 1}{v > 1 ? <sup>{v}</sup> : null}</button>;
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn btn-pri btn-mini btn-quebra flex-1" onClick={() => definirLidos(Array.from({ length: n }, (_, c) => [lv, c] as [number, number]), true)}>Marcar o livro todo</button>
              <button type="button" className="btn btn-mini btn-quebra flex-1" onClick={() => setDesmarcar(lv)}>Desmarcar o livro</button>
            </div>
          </div>
        ) : null}
      </li>
    );
  };
  return (
    <>
      <p className="ajuda !mt-0">Marque os livros e capítulos que você já leu antes de usar o Púlpito. O número pequeno mostra quantas vezes leu.</p>
      <p className="rot m-0">Antigo Testamento</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">{Array.from({ length: 39 }, (_, i) => livro(i))}</ul>
      <p className="rot m-0 mt-2">Novo Testamento</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">{Array.from({ length: 27 }, (_, i) => livro(39 + i))}</ul>
      {desmarcar !== null ? <Confirmar titulo="Desmarcar o livro?" texto={`Todos os capítulos de ${LIVROS[desmarcar]} voltam a ficar como não lidos, e a contagem de vezes é zerada.`} acao="Desmarcar" perigo
        onNao={() => setDesmarcar(null)} onSim={() => { definirLidos(Array.from({ length: CAPITULOS[desmarcar] }, (_, c) => [desmarcar, c] as [number, number]), false); setDesmarcar(null); }} /> : null}
    </>
  );
}

/** Mini painel da leitura (usado no Perfil e no Início): progresso, tempo da semana e o gráfico dos 7 dias. */
export function MiniLeitura() {
  const l = useLeitura();
  const r = resumo(l.lidos);
  const d = new Date();
  const semana = Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() - (6 - i)); return x.toLocaleDateString('sv-SE'); });
  const tempoSemana = semana.reduce((a, k) => a + (l.uso[k] || 0), 0);
  const max = Math.max(60, ...semana.map((k) => l.uso[k] || 0));
  const dias = 'DSTQQSS';
  const seguidos = (() => { let n = 0; for (let i = 6; i >= 0; i--) { if ((l.uso[semana[i]] || 0) > 0) n++; else if (i < 6) break; } return n; })();
  return (
    <a href="#/leitura" className="cartao mini-leitura block no-underline" aria-label="Minha leitura: abrir o relatório">
      <div className="flex items-center justify-between"><p className="rot m-0">Minha leitura</p><span className="text-[13px] text-mute">ver tudo →</span></div>
      <div className="mt-3 flex items-center gap-4">
        <div className="anel anel-mini" style={{ ['--p' as string]: `${r.pct * 360}deg` }} aria-hidden="true"><span>{pct(r.pct)}</span></div>
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          <div className="mini-num"><b>{r.caps}</b><span>capítulos</span></div>
          <div className="mini-num"><b>{r.livros}</b><span>livros</span></div>
          <div className="mini-num"><b>{horas(tempoSemana)}</b><span>na semana</span></div>
        </div>
      </div>
      <div className="mini-semana mt-3" aria-label={`Tempo de uso nos últimos 7 dias: ${horas(tempoSemana)}`}>
        {semana.map((k) => { const s = l.uso[k] || 0; const dt = new Date(k + 'T12:00'); return (
          <div key={k} title={`${dt.toLocaleDateString('pt-BR')}: ${horas(s)}`}><i style={{ height: `${Math.max(4, (s / max) * 100)}%`, opacity: s ? 1 : 0.35 }} /><span>{dias[dt.getDay()]}</span></div>
        ); })}
      </div>
      <p className="m-0 mt-2 text-[13.5px] text-mute">{seguidos > 1 ? `${seguidos} dias seguidos usando o Púlpito` : 'Marque o que já leu e acompanhe o seu progresso'}</p>
    </a>
  );
}
