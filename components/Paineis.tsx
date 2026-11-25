'use client';
// Painéis que sobem do rodapé na leitura da Bíblia: nota, referências cruzadas,
// estudos das apostilas e "usar na mensagem".
import { useEffect, useMemo, useState } from 'react';
import { formatarRef, limparVerso, LIVROS, type BibliaDados } from '@/lib/biblia';
import { CORES, type Traco, type Trecho } from '@/lib/tipos';
import { carregarRefs, type RefCruzada } from '@/lib/cliente/bibliaDados';
import { novaMensagem, salvarMensagem, salvarNota, useDados } from '@/lib/cliente/dados';
import { gravar, ler } from '@/lib/cliente/local';
import { supa } from '@/lib/cliente/supabase';
import { ir, useApp } from './contexto';
import { IcoFechar } from './Icones';
import { Lousa } from './Lousa';

export function Painel({ titulo, sub, fechar, children }: { titulo: string; sub?: string; fechar: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fundo-painel" onClick={fechar} aria-hidden="true" />
      <section className="painel" role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="mb-4 flex items-start justify-between gap-3">
          <div><p className="rot m-0">{sub}</p><h2 className="tit mt-1">{titulo}</h2></div>
          <button type="button" className="redondo" onClick={fechar} aria-label="Fechar"><IcoFechar /></button>
        </header>
        {children}
      </section>
    </>
  );
}

/** Nota de um versículo: digitada e/ou escrita à mão. */
export function PainelNota({ chave, rotulo, fechar }: { chave: string; rotulo: string; fechar: () => void }) {
  const dados = useDados();
  const { avisar } = useApp();
  const atual = dados.notas[chave];
  const [texto, setTexto] = useState(atual?.texto || '');
  const [tracos, setTracos] = useState<Traco[]>(atual?.tracos || []);
  const [altura, setAltura] = useState(700);
  const [aba, setAba] = useState<'digitar' | 'mao'>(() => (!atual?.texto?.trim() && atual?.tracos?.length ? 'mao' : 'digitar'));
  const salvar = () => { salvarNota(chave, texto, tracos); avisar(texto.trim() || tracos.length ? 'Nota salva' : 'Nota removida'); fechar(); };
  return (
    <Painel titulo="Anotação" sub={rotulo} fechar={salvar}>
      <div className="mb-3 flex gap-2" role="group" aria-label="Como anotar">
        <button type="button" className="chip flex-1" aria-pressed={aba === 'digitar'} onClick={() => setAba('digitar')}>Digitar{texto.trim() ? ' •' : ''}</button>
        <button type="button" className="chip flex-1" aria-pressed={aba === 'mao'} onClick={() => setAba('mao')}>Escrever{tracos.length ? ' •' : ''}</button>
      </div>
      {aba === 'digitar' ? (
        <textarea id="notaTexto" className="campo" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O que este texto diz, no contexto" aria-label="Anotação digitada" />
      ) : (
        <Lousa tracos={tracos} altura={altura} mudar={(t, a) => { setTracos(t); setAltura(a); }} rotulo={`Nota à mão de ${rotulo}`} />
      )}
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn btn-perigo flex-1" onClick={() => { salvarNota(chave, '', []); avisar('Nota removida'); fechar(); }}>Apagar</button>
        <button type="button" className="btn btn-pri flex-1" onClick={salvar}>Salvar nota</button>
      </div>
    </Painel>
  );
}

/** Referências cruzadas de um versículo, com o texto e o contexto de cada uma. */
export function PainelRefs({ l, c, v, biblia, fechar }: { l: number; c: number; v: number; biblia: BibliaDados; fechar: () => void }) {
  const [refs, setRefs] = useState<RefCruzada[] | null | 'erro'>(null);
  const [aberto, setAberto] = useState<number | null>(null);
  useEffect(() => {
    let vivo = true;
    carregarRefs(l).then((d) => { if (vivo) setRefs(d[`${c + 1}.${v}`] || []); }).catch(() => { if (vivo) setRefs('erro'); });
    return () => { vivo = false; };
  }, [l, c, v]);

  const grupos = useMemo(() => {
    if (!Array.isArray(refs)) return [];
    const at = refs.filter((r) => r[0] < 39), nt = refs.filter((r) => r[0] >= 39);
    // primeiro o outro testamento: é a ligação que mais interessa mostrar
    return (l >= 39 ? [['Antigo Testamento', at], ['Novo Testamento', nt]] : [['Novo Testamento', nt], ['Antigo Testamento', at]]) as [string, RefCruzada[]][];
  }, [refs, l]);

  return (
    <Painel titulo="Referências cruzadas" sub={formatarRef({ l, c, v })} fechar={fechar}>
      {refs === null ? <p className="text-mute">Carregando…</p>
        : refs === 'erro' ? <p className="text-mute">Não foi possível carregar as referências. Abra este livro uma vez com internet para guardá-las no aparelho.</p>
        : !refs.length ? <p className="text-mute">Não há referências cruzadas para este versículo.</p>
        : grupos.filter(([, lista]) => lista.length).map(([nome, lista]) => (
          <div key={nome} className="mb-5">
            <p className="rot mb-2">{nome} · {lista.length}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {lista.map((r) => {
                const [rl, rc, rv, rv2] = r, cap = biblia[rl]?.[2]?.[rc - 1] || [], fim = rv2 || rv, id = refs.indexOf(r);
                const texto = cap.slice(rv - 1, fim).map((t, i) => `${fim > rv ? rv + i + ' ' : ''}${limparVerso(t)}`).join(' ');
                const antes = cap.slice(Math.max(0, rv - 3), rv - 1), depois = cap.slice(fim, fim + 2);
                return (
                  <li key={id} className="cartao !p-3.5">
                    <p className="m-0 font-bold">{LIVROS[rl]} {rc}:{rv}{rv2 ? `-${rv2}` : ''}</p>
                    {aberto === id ? (
                      <p className="m-0 mt-1 text-[15px] leading-relaxed">
                        {antes.map((t, i) => <span key={'a' + i} className="text-mute"><sup>{Math.max(1, rv - 2) + i}</sup> {limparVerso(t)} </span>)}
                        <span className="rounded bg-sel px-0.5">{texto} </span>
                        {depois.map((t, i) => <span key={'d' + i} className="text-mute"><sup>{fim + 1 + i}</sup> {limparVerso(t)} </span>)}
                      </p>
                    ) : <p className="m-0 mt-1 text-[15px] leading-relaxed">{texto || 'Texto não disponível.'}</p>}
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="btn btn-mini" onClick={() => setAberto(aberto === id ? null : id)}>{aberto === id ? 'Só o versículo' : 'Ver o contexto'}</button>
                      <button type="button" className="btn btn-mini" onClick={() => { fechar(); ir(`/biblia/${rl}/${rc - 1}/${rv}`); }}>Abrir</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      <p className="ajuda">Ligações entre passagens reunidas pelo projeto OpenBible.info (licença CC BY). O app mostra o texto e o contexto de cada uma, sem interpretação.</p>
    </Painel>
  );
}

/** Trechos das apostilas da ICM que citam o capítulo aberto. */
/** O trecho cita o versículo v do capítulo c (ex.: "3:16", "3.14-18")? */
function citaVerso(texto: string, c: number, v: number) {
  for (const m of texto.matchAll(/(\d+)\s*[:.]\s*(\d+)(?:\s*[-–]\s*(\d+))?/g)) {
    const cc = Number(m[1]), v1 = Number(m[2]), v2 = m[3] ? Number(m[3]) : v1;
    if (cc === c && v >= v1 && v <= v2) return true;
  }
  return false;
}

export function PainelEstudos({ l, c, v, fechar }: { l: number; c: number; v?: number; fechar: () => void }) {
  const { online } = useApp();
  const [trechos, setTrechos] = useState<Trecho[] | null | 'erro'>(null);
  const [aberto, setAberto] = useState<number | null>(null);
  useEffect(() => {
    let vivo = true;
    const chave = `estudos:${l}:${c}`;
    (async () => {
      const local = await ler<Trecho[] | null>(chave, null);
      if (local && vivo) setTrechos(local);
      if (!online) { if (!local && vivo) setTrechos('erro'); return; }
      const { data, error } = await supa().from('apostila_trechos').select('id, titulo, texto, apostilas(nome)').contains('refs', [`${l}:${c + 1}`]).limit(40);
      if (!vivo) return;
      if (error) { if (!local) setTrechos('erro'); return; }
      const lista = (data || []).map((t) => ({ id: t.id as number, titulo: t.titulo as string, texto: t.texto as string, apostila: ((t.apostilas as unknown as { nome: string } | null)?.nome) || 'Apostila' }));
      setTrechos(lista);
      void gravar(chave, lista);
    })();
    return () => { vivo = false; };
  }, [l, c, online]);

  return (
    <Painel titulo="Nas apostilas" sub={`${LIVROS[l]} ${c + 1}`} fechar={fechar}>
      {trechos === null ? <p className="text-mute">Procurando…</p>
        : trechos === 'erro' ? <p className="text-mute">Sem internet. Os estudos deste capítulo aparecem depois de abertos uma vez com conexão.</p>
        : !trechos.length ? <p className="text-mute">Nenhuma apostila do acervo cita este capítulo.</p>
        : (
          (() => {
            const doVerso = v ? trechos.filter((t) => citaVerso(t.texto, c + 1, v)) : [];
            const doCap = trechos.filter((t) => !doVerso.includes(t));
            const item = (t: Trecho) => (
              <li key={t.id} className="cartao !p-3.5">
                <p className="rot m-0">{t.apostila}</p>
                {t.titulo ? <p className="m-0 mt-1 font-bold">{t.titulo}</p> : null}
                <p className="m-0 mt-1 whitespace-pre-line text-[15px] leading-relaxed">{aberto === t.id || t.texto.length < 420 ? t.texto : t.texto.slice(0, 380).replace(/\s\S*$/, '') + '…'}</p>
                {t.texto.length >= 420 ? <button type="button" className="btn btn-mini mt-2" onClick={() => setAberto(aberto === t.id ? null : t.id)}>{aberto === t.id ? 'Mostrar menos' : 'Ler o trecho inteiro'}</button> : null}
              </li>
            );
            return (
              <>
                {v ? <p className="rot mb-2">{doVerso.length ? `Citam o versículo ${v}` : `Nenhum trecho cita o versículo ${v}`}</p> : null}
                {doVerso.length ? <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">{doVerso.map(item)}</ul> : null}
                {doCap.length ? <p className="rot mb-2">{v ? `Falam do capítulo ${c + 1}` : ''}</p> : null}
                <ul className="m-0 flex list-none flex-col gap-2 p-0">{doCap.map(item)}</ul>
              </>
            );
          })()
        )}
      <p className="ajuda">Trechos das apostilas da Igreja Cristã Maranata enviadas pelo administrador, mostrados como estão escritos.</p>
    </Painel>
  );
}
/** Acrescenta os versículos selecionados a uma mensagem (nova ou existente). */
export function PainelUsar({ refChave, rotulo, fechar }: { refChave: string; rotulo: string; fechar: () => void }) {
  const { perfil, avisar } = useApp();
  const dados = useDados();
  const [cor, setCor] = useState('am');
  const minhas = dados.mensagens.filter((m) => m.autor_id === perfil.id).slice(0, 30);
  const usar = (id: string | null) => {
    const base = id ? minhas.find((m) => m.id === id) : novaMensagem(perfil.id, { titulo: `Mensagem sobre ${rotulo}` });
    if (!base) return;
    const refs = [...base.conteudo.refs.filter((r) => r.ref !== refChave), { ref: refChave, cor }];
    salvarMensagem({ ...base, conteudo: { ...base.conteudo, refs } });
    avisar(id ? 'Texto acrescentado à mensagem' : 'Mensagem criada com este texto');
    fechar();
    ir(`/mensagens/${base.id}`);
  };
  return (
    <Painel titulo="Usar na mensagem" sub={rotulo} fechar={fechar}>
      <p className="rotulo">Cor do marca-texto deste texto</p>
      <div className="mb-4 flex gap-2">
        {Object.entries(CORES).map(([k, c]) => <button key={k} type="button" aria-label={k} aria-pressed={cor === k} onClick={() => setCor(k)} className="h-9 w-9 rounded-full border-2" style={{ background: c, borderColor: cor === k ? 'var(--ink)' : 'transparent' }} />)}
      </div>
      <button type="button" className="btn btn-pri w-full" onClick={() => usar(null)}>+ Nova mensagem com este texto</button>
      {minhas.length ? <p className="rotulo mt-5">Ou acrescentar a uma mensagem</p> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {minhas.map((m) => (
          <li key={m.id}><button type="button" className="cartao w-full !p-3.5 text-left" onClick={() => usar(m.id)}>
            <b className="block">{m.titulo || 'Sem título'}</b>{m.tema ? <span className="text-[14px] text-mute">{m.tema}</span> : null}
          </button></li>
        ))}
      </ul>
    </Painel>
  );
}
