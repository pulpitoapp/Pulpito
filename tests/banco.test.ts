// Testa as regras de acesso (RLS) do arquivo supabase/schema.sql num Postgres
// de verdade, rodando em memória (PGlite). Aqui se confere a visibilidade das
// mensagens: privada × pública, e que as orientações internas nunca vazam.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const ANA = '11111111-1111-1111-1111-111111111111';
const BETO = '22222222-2222-2222-2222-222222222222';
const CAIO = '33333333-3333-3333-3333-333333333333';
const MSG_PRIVADA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MSG_PUBLICA = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

let db: PGlite;

/** Roda um comando como se fosse o usuário logado (ou visitante, se uid vazio). */
async function como<T = Record<string, unknown>>(uid: string, sql: string): Promise<T[]> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid}', true);`);
    const r = await tx.query<T>(sql);
    return r.rows.length || !r.affectedRows ? r.rows : (Array.from({ length: r.affectedRows }, () => ({})) as T[]);
  });
}
const falha = async (uid: string, sql: string) => expect(como(uid, sql)).rejects.toThrow();

beforeAll(async () => {
  db = new PGlite();
  // imitação mínima do ambiente do Supabase
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
  `);
  await db.exec(readFileSync('supabase/schema.sql', 'utf8'));
  await db.exec(readFileSync('supabase/schema.sql', 'utf8')); // pode rodar duas vezes sem erro
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ANA}', 'ana@teste.com', '{"nome":"Ana"}'), ('${BETO}', 'beto@teste.com', '{"full_name":"Beto"}'), ('${CAIO}', 'caio@teste.com', '{}');
    update public.perfis set cargo = 'Pastor', igreja = 'ICM Central' where id = '${ANA}';
  `);
  await como(ANA, `insert into mensagens (id, titulo, visibilidade) values ('${MSG_PRIVADA}', 'Privada da Ana', 'privada'), ('${MSG_PUBLICA}', 'Pública da Ana', 'publica')`);
  await como(ANA, `insert into notas (ref, texto) values ('42.2.16', 'nota particular da Ana')`);
  await como(ANA, `insert into pregacoes (mensagem_id, data, igreja) values ('${MSG_PUBLICA}', '2026-01-04', 'ICM Central')`);
});

describe('cadastro e perfis', () => {
  it('cria o perfil automaticamente no cadastro, como usuário comum', async () => {
    const r = await db.query<{ nome: string; papel: string }>(`select nome, papel from perfis order by email`);
    expect(r.rows).toEqual([{ nome: 'Ana', papel: 'usuario' }, { nome: 'Beto', papel: 'usuario' }, { nome: '', papel: 'usuario' }]);
  });
  it('provisório: o e-mail já sai confirmado no cadastro', async () => {
    const r = await db.query<{ n: number }>(`select count(*)::int as n from auth.users where email_confirmed_at is null`);
    expect(r.rows[0].n).toBe(0);
  });
  it('cada um vê só o próprio perfil', async () => {
    expect((await como(BETO, 'select id from perfis')).map((r) => r.id)).toEqual([BETO]);
    expect(await como('', 'select 1').catch(() => 'ok')).toBeTruthy();
    await falha('', 'select id from perfis');
  });
  it('o usuário edita seus dados, mas não consegue virar administrador nem se desbloquear', async () => {
    await como(BETO, `update perfis set igreja = 'ICM Norte' where id = '${BETO}'`);
    await falha(BETO, `update perfis set papel = 'admin' where id = '${BETO}'`);
    await falha(BETO, `update perfis set bloqueado = false where id = '${BETO}'`);
    await falha(BETO, `select public.tornar_admin('beto@teste.com')`);
    expect(await como(BETO, `update perfis set nome = 'x' where id = '${ANA}' returning id`)).toHaveLength(0);
  });
});

describe('visibilidade das mensagens', () => {
  it('o autor vê as suas duas mensagens, com a linha de autoria preenchida', async () => {
    const r = await como<{ titulo: string; autor_linha: string }>(ANA, 'select titulo, autor_linha from mensagens order by titulo');
    expect(r.map((m) => m.titulo)).toEqual(['Privada da Ana', 'Pública da Ana']);
    expect(r[0].autor_linha).toBe('Ana (Pastor) · ICM Central');
  });
  it('outro usuário vê só a pública', async () => {
    expect((await como(BETO, 'select titulo from mensagens')).map((m) => m.titulo)).toEqual(['Pública da Ana']);
  });
  it('visitante sem login não vê nada', async () => {
    await falha('', 'select titulo from mensagens');
  });
  it('outro usuário não edita nem apaga a mensagem pública', async () => {
    expect(await como(BETO, `update mensagens set titulo = 'pichada' where id = '${MSG_PUBLICA}' returning id`)).toHaveLength(0);
    expect(await como(BETO, `delete from mensagens where id = '${MSG_PUBLICA}' returning id`)).toHaveLength(0);
    expect((await como(ANA, `select titulo from mensagens where id = '${MSG_PUBLICA}'`))[0].titulo).toBe('Pública da Ana');
  });
  it('ninguém cria mensagem em nome de outra pessoa', async () => {
    await falha(BETO, `insert into mensagens (autor_id, titulo) values ('${ANA}', 'falsa')`);
  });
  it('as pregações e as notas de versículo do autor não aparecem para os outros', async () => {
    expect(await como(BETO, 'select * from pregacoes')).toHaveLength(0);
    expect(await como(BETO, 'select * from notas')).toHaveLength(0);
    expect(await como(ANA, 'select * from pregacoes')).toHaveLength(1);
    expect(await como(ANA, 'select * from notas')).toHaveLength(1);
    await falha(BETO, `insert into pregacoes (mensagem_id, data) values ('${MSG_PUBLICA}', '2026-02-01')`);
    await falha(BETO, `insert into notas (usuario_id, ref, texto) values ('${ANA}', '0.0.1', 'falsa')`);
  });
  it('a mensagem guarda título, tema, texto, textos usados e traços à mão', async () => {
    await como(ANA, `update mensagens set tema = 'O amor de Deus', conteudo = '{"texto":"corpo","refs":[{"ref":"42.2.16","cor":"am"}],"tracos":[{"c":"#000","e":3,"f":"caneta","p":[1,2,50,3,4,50]}],"altura":1400}' where id = '${MSG_PUBLICA}'`);
    const [m] = await como<{ tema: string; conteudo: { refs: { ref: string }[]; tracos: unknown[] } }>(BETO, `select tema, conteudo from mensagens where id = '${MSG_PUBLICA}'`);
    expect(m.tema).toBe('O amor de Deus');
    expect(m.conteudo.refs[0].ref).toBe('42.2.16');
    expect(m.conteudo.tracos).toHaveLength(1);
  });
  it('quem volta a mensagem para privada a esconde de novo', async () => {
    await como(ANA, `update mensagens set visibilidade = 'privada' where id = '${MSG_PUBLICA}'`);
    expect(await como(BETO, 'select titulo from mensagens')).toHaveLength(0);
    await como(ANA, `update mensagens set visibilidade = 'publica' where id = '${MSG_PUBLICA}'`);
  });
  it('usuário bloqueado não lê as públicas nem cria mensagens', async () => {
    await db.exec(`update perfis set bloqueado = true where id = '${CAIO}'`);
    expect(await como(CAIO, 'select titulo from mensagens')).toHaveLength(0);
    await falha(CAIO, `insert into mensagens (titulo) values ('bloqueado')`);
  });
});

describe('administrador e apostilas', () => {
  it('usuário comum não envia nem apaga apostilas, e não bloqueia ninguém', async () => {
    await falha(BETO, `insert into apostilas (nome) values ('invasão')`);
    await falha(BETO, `select public.admin_bloquear('${ANA}', true)`);
    await falha(BETO, `select public.tornar_admin('beto@teste.com')`);
  });
  it('tornar_admin promove pelo e-mail; o admin passa a ver todos os perfis', async () => {
    const r = await db.query<{ t: string }>(`select public.tornar_admin(' ANA@teste.com ') as t`);
    expect(r.rows[0].t).toContain('administrador');
    expect((await db.query<{ t: string }>(`select public.tornar_admin('ninguem@teste.com') as t`)).rows[0].t).toContain('Nenhum usuário');
    expect(await como(ANA, 'select id from perfis')).toHaveLength(3);
    // mesmo sendo admin, não lê mensagem privada nem nota de outro
    await como(BETO, `insert into mensagens (titulo) values ('Privada do Beto')`);
    await como(BETO, `insert into notas (ref, texto) values ('0.0.1', 'nota do Beto')`);
    expect((await como(ANA, 'select titulo from mensagens')).map((m) => m.titulo)).not.toContain('Privada do Beto');
    expect(await como(ANA, `select * from notas where texto = 'nota do Beto'`)).toHaveLength(0);
  });
  it('o admin envia apostilas com trechos; todos os usuários leem pelos capítulos citados', async () => {
    const [a] = await como<{ id: string }>(ANA, `insert into apostilas (nome, trechos) values ('Apostila de teste', 2) returning id`);
    await como(ANA, `insert into apostila_trechos (apostila_id, titulo, texto, refs) values
      ('${a.id}', 'A candeia', 'A candeia e o azeite.', '{39:25}'), ('${a.id}', 'O altar', 'O altar do sacrifício.', '{1:27}')`);
    const achados = await como<{ titulo: string }>(BETO, `select titulo from apostila_trechos where refs @> '{39:25}'`);
    expect(achados.map((t) => t.titulo)).toEqual(['A candeia']);
    expect(await como(BETO, `delete from apostila_trechos returning id`)).toHaveLength(0);
    expect(await como(BETO, `delete from apostilas returning id`)).toHaveLength(0);
    await falha(BETO, `insert into apostila_trechos (apostila_id, texto) values ('${a.id}', 'falso')`);
    await como(ANA, `delete from apostilas where id = '${a.id}'`);
    expect(await como(BETO, 'select id from apostila_trechos')).toHaveLength(0);
  });
  it('o admin bloqueia e libera usuários, mas não a si mesmo', async () => {
    await como(ANA, `select public.admin_bloquear('${BETO}', true)`);
    expect(await como(BETO, 'select titulo from mensagens where visibilidade = \'publica\'')).toHaveLength(0);
    await como(ANA, `select public.admin_bloquear('${BETO}', false)`);
    await falha(ANA, `select public.admin_bloquear('${ANA}', true)`);
  });
  it('destaques são de cada um', async () => {
    await como(BETO, `insert into destaques (ref, cor) values ('42.2.16', 'am')`);
    expect(await como(BETO, 'select ref from destaques')).toHaveLength(1);
    expect(await como(ANA, 'select ref from destaques')).toHaveLength(0);
  });
});

describe('meus documentos', () => {
  it('cada um vê e mexe só nas próprias pastas e documentos', async () => {
    await como(ANA, `insert into pastas (id, nome) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Estudos')`);
    await como(ANA, `insert into documentos (titulo, pasta_id, conteudo) values ('João 1:1', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"ref":"João 1:1"}')`);
    expect(await como(ANA, 'select titulo from documentos')).toEqual([{ titulo: 'João 1:1' }]);
    expect(await como(BETO, 'select titulo from documentos')).toEqual([]);
    expect(await como(BETO, 'select nome from pastas')).toEqual([]);
    expect(await como(BETO, `update documentos set titulo = 'x'`)).toEqual([]);
    expect(await como(BETO, `delete from pastas`)).toEqual([]);
  });
  it('não deixa guardar documento na pasta de outra pessoa nem em nome de outro', async () => {
    await falha(BETO, `insert into documentos (titulo, pasta_id) values ('intruso', 'cccccccc-cccc-cccc-cccc-cccccccccccc')`);
    await falha(BETO, `insert into documentos (usuario_id, titulo) values ('${ANA}', 'em nome da Ana')`);
  });
});
