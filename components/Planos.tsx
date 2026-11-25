'use client';
// Planos de leitura: cronológico (Bíblia toda ou só AT), Evangelhos em harmonia e "Meu plano" (questionário).
// O andamento fica guardado no aparelho.
import { useEffect, useMemo, useState } from 'react';
import { limparVerso, LIVROS } from '@/lib/biblia';
import { BASE, useBiblia } from '@/lib/cliente/bibliaDados';
import { CAPITULOS, useLeitura } from '@/lib/cliente/leitura';
import { pref } from '@/lib/cliente/local';
import { supa } from '@/lib/cliente/supabase';
import { Cabecalho, Carregando, Confirmar } from './Cabecalho';
import { ir, useApp } from './contexto';

type Dia = [string[], string];                                 // capítulos "l.c" (c a partir de 1) e título
type Secao = { titulo: string; passagens: [number, number, number, number][] };
export type PlanoAtivo = { id: string; nome: string; inicio: string; feitos: number[]; dias?: Dia[] };

export const PLANOS = [
  { id: 'cronologico', nome: 'Bíblia em ordem cronológica', desc: 'A Bíblia inteira na ordem em que os fatos aconteceram, em 365 dias.', arquivo: 'cronologico' },
  { id: 'evangelhos', nome: 'Os Evangelhos em harmonia', desc: 'A vida de Jesus em ordem, com as passagens iguais de Mateus, Marcos, Lucas e João uma depois da outra.', arquivo: 'evangelhos' },
  { id: 'antigo', nome: 'Antigo Testamento em ordem cronológica', desc: 'Da Criação a Malaquias na ordem dos acontecimentos, em 365 dias.', arquivo: 'antigo-cronologico' },
  { id: 'novo', nome: 'Novo Testamento em ordem cronológica', desc: 'Os Evangelhos em ordem, Atos com as cartas encaixadas no tempo em que foram escritas, até o Apocalipse. 130 dias, 2 capítulos por dia.', arquivo: 'novo-cronologico' },
];

// O plano fica na conta (tabela planos_leitura) e uma cópia no aparelho para abrir sem internet.
const chave = (uid: string) => `plano:${uid}`;
type Guardado = { p: PlanoAtivo | null; quando: string; pendente?: boolean };
const lerLocal = (uid: string): Guardado => {
  const v = pref.ler<Guardado | PlanoAtivo | null>(chave(uid), null);
  return v && 'quando' in v ? v : { p: (v as PlanoAtivo | null) || null, quando: '1970-01-01T00:00:00Z', pendente: !!v };
};
export const lerPlano = (uid: string) => lerLocal(uid).p;
async function enviarPlano(uid: string, g: Guardado) {
  const { error } = await supa().from('planos_leitura').upsert({ usuario_id: uid, plano: g.p, atualizado_em: g.quando });
  if (!error) pref.gravar(chave(uid), { ...g, pendente: false });
}
const gravarPlano = (uid: string, p: PlanoAtivo | null) => {
  const g = { p, quando: new Date().toISOString(), pendente: true };
  pref.gravar(chave(uid), g);
  void enviarPlano(uid, g).catch(() => {});
};
/** Traz o plano da conta (vale o mais recente entre o aparelho e a conta). */
export async function sincronizarPlano(uid: string): Promise<PlanoAtivo | null> {
  const local = lerLocal(uid);
  try {
    const { data, error } = await supa().from('planos_leitura').select('plano, atualizado_em').eq('usuario_id', uid).maybeSingle();
    if (error) return local.p;
    if (data && (!local.pendente || data.atualizado_em > local.quando)) {
      pref.gravar(chave(uid), { p: data.plano as PlanoAtivo | null, quando: data.atualizado_em, pendente: false });
      return data.plano as PlanoAtivo | null;
    }
    if (local.pendente) await enviarPlano(uid, local);
  } catch { /* sem internet */ }
  return local.p;
}
const rotulo = (k: string) => { const [l, c] = k.split('.').map(Number); return `${LIVROS[l]} ${c}`; };
/** Junta capítulos seguidos do mesmo livro: "Gênesis 1-3, Jó 1". */
export function resumoCaps(caps: string[]) {
  const out: string[] = [];
  let i = 0;
  while (i < caps.length) {
    const [l, c] = caps[i].split('.').map(Number);
    let j = i;
    while (j + 1 < caps.length) { const [l2, c2] = caps[j + 1].split('.').map(Number); if (l2 === l && c2 === c + (j + 1 - i)) j++; else break; }
    out.push(j > i ? `${LIVROS[l]} ${c}-${c + (j - i)}` : `${LIVROS[l]} ${c}`);
    i = j + 1;
  }
  return out.join(', ');
}

function useDadosPlano(id: string | null): { dias?: Dia[]; secoes?: Secao[] } | null | 'erro' {
  const [d, setD] = useState<{ id: string; v: { dias?: Dia[]; secoes?: Secao[] } | 'erro' } | null>(null);
  useEffect(() => {
    const p = PLANOS.find((x) => x.id === id);
    if (!p) return;
    let vivo = true;
    fetch(`${BASE}/dados/planos/${p.arquivo}.json`).then((r) => r.json()).then((v) => { if (vivo) setD({ id: id!, v }); }).catch(() => { if (vivo) setD({ id: id!, v: 'erro' }); });
    return () => { vivo = false; };
  }, [id]);
  return d && d.id === id ? d.v : null;
}

/** Próximo dia ainda não feito. */
export const proximoDia = (p: PlanoAtivo, total: number) => { for (let i = 0; i < total; i++) if (!p.feitos.includes(i)) return i; return total; };

export function Planos() {
  const { perfil } = useApp();
  const [plano, setPlano] = useState<PlanoAtivo | null>(() => lerPlano(perfil.id));
  useEffect(() => { void sincronizarPlano(perfil.id).then(setPlano); }, [perfil.id]);
  const [quiz, setQuiz] = useState(false);
  const [trocar, setTrocar] = useState<null | (() => void)>(null);
  const salvar = (p: PlanoAtivo | null) => { setPlano(p); gravarPlano(perfil.id, p); };
  const comecar = (p: PlanoAtivo) => { const f = () => { salvar(p); setQuiz(false); window.scrollTo(0, 0); }; if (plano) setTrocar(() => f); else f(); };

  if (quiz) return <Questionario aoCancelar={() => setQuiz(false)} aoCriar={(dias) => comecar({ id: 'meu', nome: 'Meu plano', inicio: new Date().toISOString(), feitos: [], dias })} />;
  return (
    <>
      <Cabecalho titulo="Planos de leitura" sub={plano ? `Lendo: ${plano.nome}` : 'Escolha como ler'} />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-8 pt-3 md:max-w-3xl">
        {plano ? <PlanoEmAndamento plano={plano} salvar={salvar} /> : null}
        <button type="button" className="destaque-vidro text-left" onClick={() => setQuiz(true)}>
          <p className="rot m-0 !text-ouro">5 minutos</p>
          <h2 className="destaque-tit !text-[32px]">Monte o seu plano</h2>
          <p className="m-0 mt-2 text-[15px] text-[#f6e9ec]">Responda algumas perguntas sobre o seu tempo e os temas de que você gosta, e o Púlpito monta um cronograma para você.</p>
          <span className="destaque-btn">Responder o questionário <span aria-hidden="true">→</span></span>
        </button>
        {PLANOS.map((p) => (
          <section key={p.id} className="cartao">
            <p className="rot m-0">Plano pronto</p>
            <h2 className="tit mt-1">{p.nome}</h2>
            <p className="m-0 mt-1 text-[15px]">{p.desc}</p>
            <button type="button" className="btn btn-pri mt-3 w-full" disabled={plano?.id === p.id} onClick={() => comecar({ id: p.id, nome: p.nome, inicio: new Date().toISOString(), feitos: [] })}>{plano?.id === p.id ? 'Você está neste plano' : 'Começar este plano'}</button>
          </section>
        ))}
      </main>
      {trocar ? <Confirmar titulo="Trocar de plano?" texto={`Você está no plano “${plano?.nome}”. Ao trocar, o andamento dele é apagado.`} acao="Trocar" onNao={() => setTrocar(null)} onSim={() => { trocar(); setTrocar(null); }} /> : null}
    </>
  );
}

function PlanoEmAndamento({ plano, salvar }: { plano: PlanoAtivo; salvar: (p: PlanoAtivo | null) => void }) {
  const dados = useDadosPlano(plano.id === 'meu' ? null : plano.id);
  const [aberto, setAberto] = useState<number | null>(null);
  const [parar, setParar] = useState(false);
  const pt = useBiblia('blivre');
  const dias: Dia[] | undefined = plano.id === 'meu' ? plano.dias : dados && dados !== 'erro' ? dados.dias : undefined;
  const secoes = dados && dados !== 'erro' ? dados.secoes : undefined;
  const total = dias?.length ?? secoes?.length ?? 0;
  if (plano.id !== 'meu' && dados === null) return <Carregando />;
  if (dados === 'erro') return <p className="aviso">Não foi possível abrir o plano. Abra uma vez com internet.</p>;
  const prox = proximoDia(plano, total);
  const alternar = (i: number) => salvar({ ...plano, feitos: plano.feitos.includes(i) ? plano.feitos.filter((x) => x !== i) : [...plano.feitos, i] });
  const unidade = secoes ? 'leitura' : 'dia';
  const mostrar = aberto ?? prox;

  const conteudo = (i: number) => {
    if (dias) {
      const [caps, titulo] = dias[i];
      return (
        <>
          <p className="m-0 font-bold">{titulo}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {caps.map((k) => { const [l, c] = k.split('.').map(Number); return <button key={k} type="button" className="chip" onClick={() => ir(`/biblia/${l}/${c - 1}`)}>{rotulo(k)}</button>; })}
          </div>
        </>
      );
    }
    const s = secoes![i];
    return (
      <>
        <p className="m-0 font-bold">{s.titulo}</p>
        {s.passagens.map(([l, c, v1, v2], j) => (
          <div key={j} className="mt-3 rounded-xl border border-line p-3">
            <button type="button" className="rot !text-[11.5px] underline" onClick={() => ir(`/biblia/${l}/${c - 1}/${v1}`)}>{LIVROS[l]} {c}:{v1}{v2 > v1 ? `-${v2}` : ''}</button>
            <p className="m-0 mt-1.5 text-[15.5px] leading-relaxed">
              {Array.isArray(pt) ? (pt[l]?.[2]?.[c - 1] || []).slice(v1 - 1, v2).map((t, k) => <span key={k}><sup className="text-mute">{v1 + k}</sup> {limparVerso(t)} </span>) : 'Carregando…'}
            </p>
          </div>
        ))}
        {s.passagens.length > 1 ? <p className="ajuda">As passagens paralelas aparecem uma depois da outra para você comparar.</p> : null}
      </>
    );
  };

  return (
    <section className="cartao convite">
      <p className="rot m-0">{plano.nome}</p>
      <h2 className="tit mt-1">{prox >= total ? 'Plano concluído! 🎉' : `${unidade === 'dia' ? 'Dia' : 'Leitura'} ${mostrar + 1} de ${total}`}</h2>
      <span className="progresso-barra mt-2"><span style={{ width: `${Math.max(1, (plano.feitos.length / Math.max(1, total)) * 100)}%` }} /></span>
      <p className="ajuda !mt-1">{plano.feitos.length} de {total} {unidade === 'dia' ? 'dias feitos' : 'leituras feitas'}</p>
      {mostrar < total ? (
        <div className="mt-3">
          {conteudo(mostrar)}
          <button type="button" className={`btn mt-3 w-full ${plano.feitos.includes(mostrar) ? '' : 'btn-pri'}`} onClick={() => { alternar(mostrar); setAberto(null); }}>{plano.feitos.includes(mostrar) ? 'Desmarcar' : 'Marcar como feito'}</button>
        </div>
      ) : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-[15px] underline">Ver todos os {unidade === 'dia' ? 'dias' : 'leituras'}</summary>
        <ol className="m-0 mt-2 flex max-h-[50vh] list-none flex-col gap-1 overflow-auto p-0">
          {Array.from({ length: total }, (_, i) => (
            <li key={i}>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[14.5px] hover:bg-folha" onClick={() => { setAberto(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <span className={`grid h-6 w-6 flex-none place-items-center rounded-full border text-[11px] ${plano.feitos.includes(i) ? 'border-escuro bg-escuro text-white' : 'border-line'}`}>{plano.feitos.includes(i) ? '✓' : i + 1}</span>
                <span className="flex-1">{dias ? `${dias[i][1]} · ${resumoCaps(dias[i][0])}` : secoes![i].titulo}</span>
              </button>
            </li>
          ))}
        </ol>
      </details>
      <button type="button" className="ajuda mt-3 underline" onClick={() => setParar(true)}>Parar este plano</button>
      {parar ? <Confirmar titulo="Parar o plano?" texto="O andamento deste plano será apagado. A sua leitura da Bíblia (capítulos lidos) continua guardada." acao="Parar" perigo onNao={() => setParar(false)} onSim={() => { salvar(null); setParar(false); }} /> : null}
    </section>
  );
}

// ---------- questionário ----------
const TEMAS: Record<string, { nome: string; livros: number[] }> = {
  fe: { nome: 'Fé e confiança em Deus', livros: [57, 44, 0, 58] },
  esperanca: { nome: 'Esperança e consolo', livros: [18, 22, 46, 59] },
  oracao: { nome: 'Oração e comunhão', livros: [18, 39, 15, 26] },
  volta: { nome: 'A volta de Jesus', livros: [51, 52, 39, 65, 26] },
  jesus: { nome: 'A vida de Jesus', livros: [40, 42, 41, 39] },
  sabedoria: { nome: 'Sabedoria para o dia a dia', livros: [19, 58, 20] },
  santidade: { nome: 'Vida santa e obediência', livros: [48, 50, 47, 61] },
  historias: { nome: 'Histórias do Antigo Testamento', livros: [0, 1, 5, 6, 8, 26] },
  igreja: { nome: 'A igreja e o Espírito Santo', livros: [43, 45, 48, 55] },
};
type Respostas = { tempo: number; escopo: string; ordem: string; temas: string[]; dias: number; pular: boolean };

function gerarPlano(r: Respostas, lidos: Record<string, { v: number }>): Dia[] {
  const intervalo = r.escopo === 'nt' ? [39, 65] : r.escopo === 'at' ? [0, 38] : r.escopo === 'evangelhos' ? [39, 42] : r.escopo === 'poeticos' ? [17, 21] : [0, 65];
  let livros = Array.from({ length: intervalo[1] - intervalo[0] + 1 }, (_, i) => intervalo[0] + i);
  if (r.ordem === 'temas') {
    const prioridade: number[] = [];
    for (const t of r.temas) for (const l of TEMAS[t]?.livros || []) if (livros.includes(l) && !prioridade.includes(l)) prioridade.push(l);
    livros = [...prioridade, ...livros.filter((l) => !prioridade.includes(l))];
  }
  let caps = livros.flatMap((l) => Array.from({ length: CAPITULOS[l] }, (_, c) => `${l}.${c + 1}`));
  if (r.pular) caps = caps.filter((k) => { const [l, c] = k.split('.').map(Number); return !((lidos[`${l}.${c - 1}`]?.v || 0) > 0); });
  const dias: Dia[] = [];
  for (let i = 0; i < caps.length; i += r.tempo) { const parte = caps.slice(i, i + r.tempo); dias.push([parte, resumoCaps(parte)]); }
  return dias;
}

function Questionario({ aoCancelar, aoCriar }: { aoCancelar: () => void; aoCriar: (dias: Dia[]) => void }) {
  const l = useLeitura();
  const [passo, setPasso] = useState(0);
  const [agora] = useState(() => Date.now());
  const [r, setR] = useState<Respostas>({ tempo: 3, escopo: 'biblia', ordem: 'canonica', temas: [], dias: 7, pular: false });
  const perguntas: { titulo: string; ajuda?: string; campo: keyof Respostas; opcoes: [string | number | boolean, string, string?][]; multipla?: boolean }[] = [
    { titulo: 'Quanto tempo por dia você quer dedicar à leitura?', campo: 'tempo', opcoes: [[1, 'Uns 5 minutos', '1 capítulo por dia'], [2, 'Uns 10 minutos', '2 capítulos'], [3, 'Uns 15 minutos', '3 capítulos'], [4, '20 minutos ou mais', '4 capítulos'], [5, 'Meia hora', '5 capítulos']] },
    { titulo: 'O que você quer ler?', campo: 'escopo', opcoes: [['biblia', 'A Bíblia inteira'], ['nt', 'O Novo Testamento'], ['at', 'O Antigo Testamento'], ['evangelhos', 'Os quatro Evangelhos'], ['poeticos', 'Jó, Salmos, Provérbios, Eclesiastes e Cânticos']] },
    { titulo: 'Quais temas mais falam ao seu coração agora?', ajuda: 'Pode escolher mais de um.', campo: 'temas', multipla: true, opcoes: Object.entries(TEMAS).map(([k, t]) => [k, t.nome] as [string, string]) },
    { titulo: 'Em que ordem prefere ler?', campo: 'ordem', opcoes: [['temas', 'Começar pelos livros dos temas que escolhi'], ['canonica', 'Na ordem da Bíblia, livro por livro']] },
    { titulo: 'Quantos dias por semana você consegue ler?', ajuda: 'Serve para calcular a data em que o plano termina.', campo: 'dias', opcoes: [[7, 'Todos os dias'], [6, '6 dias'], [5, '5 dias'], [3, '3 dias']] },
    { titulo: 'Quer pular os capítulos que você já leu no Púlpito?', campo: 'pular', opcoes: [[false, 'Não, quero ler tudo'], [true, 'Sim, pular o que já li']] },
  ];
  const fim = passo >= perguntas.length;
  const dias = useMemo(() => (fim ? gerarPlano(r, l.lidos) : []), [fim, r, l.lidos]);
  const semanas = dias.length / r.dias;
  const termino = new Date(agora + semanas * 7 * 86400000);

  return (
    <>
      <Cabecalho titulo="Monte o seu plano" sub={fim ? 'Seu cronograma' : `Pergunta ${passo + 1} de ${perguntas.length}`} />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-8 pt-3 md:max-w-3xl">
        <span className="progresso-barra"><span style={{ width: `${(Math.min(passo, perguntas.length) / perguntas.length) * 100}%` }} /></span>
        {!fim ? (() => {
          const q = perguntas[passo];
          const valor = r[q.campo];
          return (
            <section className="cartao">
              <h2 className="tit">{q.titulo}</h2>
              {q.ajuda ? <p className="ajuda !mt-1">{q.ajuda}</p> : null}
              <div className="mt-3 flex flex-col gap-2">
                {q.opcoes.map(([v, t, sub]) => {
                  const marcado = q.multipla ? (valor as string[]).includes(v as string) : valor === v;
                  return (
                    <button key={String(v)} type="button" className={`opcao-quiz ${marcado ? 'marcada' : ''}`} aria-pressed={marcado} onClick={() => {
                      if (q.multipla) { const lst = valor as string[]; setR({ ...r, temas: marcado ? lst.filter((x) => x !== v) : [...lst, v as string] }); }
                      else { setR({ ...r, [q.campo]: v }); setPasso(passo + 1); }
                    }}>
                      <b>{t}</b>{sub ? <span>{sub}</span> : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn flex-1" onClick={() => (passo ? setPasso(passo - 1) : aoCancelar())}>{passo ? 'Voltar' : 'Cancelar'}</button>
                {q.multipla ? <button type="button" className="btn btn-pri flex-1" onClick={() => setPasso(passo + 1)}>{(valor as string[]).length ? 'Continuar' : 'Pular'}</button> : null}
              </div>
            </section>
          );
        })() : (
          <section className="cartao convite">
            <p className="rot m-0">Seu cronograma</p>
            {dias.length ? (
              <>
                <h2 className="tit mt-1">{dias.length} dias de leitura</h2>
                <p className="m-0 mt-1 text-[15px]">{r.tempo} {r.tempo === 1 ? 'capítulo' : 'capítulos'} por dia, {r.dias} dias por semana. Previsão de término: <b>{termino.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</b>.</p>
                {r.ordem === 'temas' && r.temas.length ? <p className="m-0 mt-2 text-[15px]">Começa pelos livros sobre: {r.temas.map((t) => TEMAS[t].nome).join('; ')}.</p> : null}
                <p className="rot mt-4">Primeiros dias</p>
                <ol className="m-0 flex list-none flex-col gap-1 p-0 text-[15px]">{dias.slice(0, 5).map((d, i) => <li key={i}><b>Dia {i + 1}:</b> {d[1]}</li>)}</ol>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="btn flex-1" onClick={() => setPasso(0)}>Refazer</button>
                  <button type="button" className="btn btn-pri flex-1" onClick={() => aoCriar(dias)}>Começar</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="tit mt-1">Você já leu tudo isso! 🎉</h2>
                <p className="m-0 mt-1">Escolha outra parte da Bíblia ou não pule os capítulos já lidos.</p>
                <button type="button" className="btn mt-3 w-full" onClick={() => setPasso(0)}>Refazer</button>
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
}
