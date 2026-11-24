-- =====================================================================
-- Púlpito — esquema do banco (Supabase / Postgres) — etapa 1 (sem IA)
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
-- Pode ser rodado de novo sem perder dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------

-- Perfil de cada usuário (1 linha por conta de login)
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nome text not null default '',
  cargo text not null default 'Outros'
    check (cargo in ('Pastor','Ungido','Diácono','Obreiro','Jovem','Senhora','Outros')),
  igreja text not null default '',
  cidade text not null default '',
  versao text not null default 'blivre',     -- Bíblia preferida (código da versão no app)
  papel text not null default 'usuario' check (papel in ('admin','usuario')),
  bloqueado boolean not null default false,
  aceite_privacidade timestamptz,
  criado_em timestamptz not null default now()
);

-- Mensagens (anotações do pregador)
-- conteudo = { texto, refs: [{ref, cor}], paginas: [traços à mão] }
create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  autor_linha text not null default '',
  titulo text not null default '',
  tema text not null default '',
  serie text not null default '',
  situacao text not null default 'rascunho' check (situacao in ('rascunho','pronta','pregada')),
  visibilidade text not null default 'privada' check (visibilidade in ('privada','publica')),
  conteudo jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists mensagens_autor_idx on public.mensagens (autor_id, atualizado_em desc);
create index if not exists mensagens_publicas_idx on public.mensagens (visibilidade) where visibilidade = 'publica';

-- Registro de pregações (várias por mensagem)
create table if not exists public.pregacoes (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.mensagens (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  data date not null,
  igreja text not null default '',
  ocasiao text not null default '',
  criado_em timestamptz not null default now()
);
create index if not exists pregacoes_mensagem_idx on public.pregacoes (mensagem_id, data desc);

-- Versículos destacados (marca-texto)
create table if not exists public.destaques (
  usuario_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  ref text not null,           -- "livro.capitulo.versiculo" (livro 0-65, capítulo a partir de 0)
  cor text not null,
  primary key (usuario_id, ref)
);

-- Notas por versículo (digitadas e/ou escritas à mão)
create table if not exists public.notas (
  usuario_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  ref text not null,
  texto text not null default '',
  tracos jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, ref)
);

-- Meus documentos: pastas e documentos salvos (comentários, comparações). Só o dono vê.
create table if not exists public.pastas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  criado_em timestamptz not null default now()
);
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  pasta_id uuid references public.pastas (id) on delete set null,
  titulo text not null default '' check (char_length(titulo) <= 200),
  tipo text not null default 'comentario' check (tipo in ('comentario', 'comparacao', 'anotacao')),
  conteudo jsonb not null default '{}'::jsonb check (pg_column_size(conteudo) < 1000000),
  drive_id text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Acervo de apostilas da ICM: trechos mostrados ao lado das passagens
create table if not exists public.apostilas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  trechos int not null default 0,
  criado_em timestamptz not null default now()
);
create table if not exists public.apostila_trechos (
  id bigint generated always as identity primary key,
  apostila_id uuid not null references public.apostilas (id) on delete cascade,
  titulo text not null default '',
  texto text not null,
  refs text[] not null default '{}'   -- "livro:capitulo" citados no trecho (capítulo a partir de 1)
);
create index if not exists apostila_trechos_refs_idx on public.apostila_trechos using gin (refs);

-- ---------------------------------------------------------------------
-- 2. Funções de apoio
-- ---------------------------------------------------------------------

-- O usuário atual é administrador?
create or replace function public.sou_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin' and not bloqueado);
$$;

-- O usuário atual pode usar o app (existe e não está bloqueado)?
create or replace function public.posso_usar() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and not bloqueado);
$$;

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

-- Preenche a linha do autor de cada mensagem e protege autoria e data de criação
create or replace function public.preparar_mensagem() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.perfis;
begin
  if tg_op = 'UPDATE' then
    new.autor_id := old.autor_id;
    new.criado_em := old.criado_em;
  end if;
  select * into p from public.perfis where id = new.autor_id;
  new.autor_linha := concat_ws(' · ',
    nullif(case when p.cargo <> 'Outros' and p.nome <> '' then p.nome || ' (' || p.cargo || ')' else p.nome end, ''),
    nullif(p.igreja, ''));
  if new.atualizado_em is null then new.atualizado_em := now(); end if;
  return new;
end;
$$;
drop trigger if exists ao_gravar_mensagem on public.mensagens;
create trigger ao_gravar_mensagem before insert or update on public.mensagens
  for each row execute function public.preparar_mensagem();

-- Torna alguém administrador pelo e-mail.
-- Uso (no SQL Editor):  select public.tornar_admin('seu-email@exemplo.com');
create or replace function public.tornar_admin(email_alvo text) returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.perfis set papel = 'admin', bloqueado = false
   where lower(email) = lower(trim(email_alvo));
  get diagnostics n = row_count;
  if n = 0 then
    return 'Nenhum usuário com esse e-mail. Cadastre-se no app primeiro e rode de novo.';
  end if;
  return 'Pronto: ' || email_alvo || ' agora é administrador.';
end;
$$;

-- Bloquear ou liberar um usuário (só o administrador consegue)
create or replace function public.admin_bloquear(alvo uuid, bloquear boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_admin() then raise exception 'Área restrita ao administrador.'; end if;
  if alvo = auth.uid() then raise exception 'Você não pode bloquear a si mesmo.'; end if;
  update public.perfis set bloqueado = bloquear where id = alvo;
end;
$$;

revoke all on function public.tornar_admin(text) from public, anon, authenticated;
revoke all on function public.criar_perfil() from public, anon, authenticated;
revoke all on function public.preparar_mensagem() from public, anon, authenticated;
revoke all on function public.admin_bloquear(uuid, boolean) from public, anon;
grant execute on function public.admin_bloquear(uuid, boolean) to authenticated;
grant execute on function public.tornar_admin(text) to service_role;

-- ---------------------------------------------------------------------
-- 3. Regras de acesso (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.mensagens enable row level security;
alter table public.pregacoes enable row level security;
alter table public.destaques enable row level security;
alter table public.notas enable row level security;
alter table public.apostilas enable row level security;
alter table public.apostila_trechos enable row level security;

-- Quem não entrou (anon) não acessa nada.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.perfis, public.mensagens, public.pregacoes, public.destaques, public.notas,
  public.apostilas, public.apostila_trechos to authenticated;
grant insert, update, delete on public.mensagens, public.pregacoes, public.destaques, public.notas to authenticated;
grant insert, delete on public.apostilas, public.apostila_trechos to authenticated;   -- as regras abaixo só deixam o admin
-- O usuário só altera estes campos do próprio perfil (nunca "papel" nem "bloqueado"):
grant update (nome, cargo, igreja, cidade, versao, aceite_privacidade) on public.perfis to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- perfis: cada um vê e edita o seu; admin vê todos
drop policy if exists perfis_ver on public.perfis;
create policy perfis_ver on public.perfis for select to authenticated
  using (id = auth.uid() or public.sou_admin());
drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- mensagens: o autor faz tudo; as públicas são só para leitura dos demais
drop policy if exists mensagens_ver on public.mensagens;
create policy mensagens_ver on public.mensagens for select to authenticated
  using (autor_id = auth.uid() or (visibilidade = 'publica' and public.posso_usar()));
drop policy if exists mensagens_criar on public.mensagens;
create policy mensagens_criar on public.mensagens for insert to authenticated
  with check (autor_id = auth.uid() and public.posso_usar());
drop policy if exists mensagens_editar on public.mensagens;
create policy mensagens_editar on public.mensagens for update to authenticated
  using (autor_id = auth.uid() and public.posso_usar()) with check (autor_id = auth.uid());
drop policy if exists mensagens_apagar on public.mensagens;
create policy mensagens_apagar on public.mensagens for delete to authenticated
  using (autor_id = auth.uid());

-- pregações: só o autor
drop policy if exists pregacoes_dono on public.pregacoes;
create policy pregacoes_dono on public.pregacoes for all to authenticated
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid()
    and exists (select 1 from public.mensagens m where m.id = mensagem_id and m.autor_id = auth.uid()));

-- destaques e notas: cada um os seus
drop policy if exists destaques_dono on public.destaques;
create policy destaques_dono on public.destaques for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists notas_dono on public.notas;
create policy notas_dono on public.notas for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- apostilas: todos os usuários leem; só o administrador envia e apaga
drop policy if exists apostilas_ver on public.apostilas;
create policy apostilas_ver on public.apostilas for select to authenticated using (public.posso_usar());
drop policy if exists apostilas_criar on public.apostilas;
create policy apostilas_criar on public.apostilas for insert to authenticated with check (public.sou_admin());
drop policy if exists apostilas_apagar on public.apostilas;
create policy apostilas_apagar on public.apostilas for delete to authenticated using (public.sou_admin());
drop policy if exists trechos_ver on public.apostila_trechos;
create policy trechos_ver on public.apostila_trechos for select to authenticated using (public.posso_usar());
drop policy if exists trechos_criar on public.apostila_trechos;
create policy trechos_criar on public.apostila_trechos for insert to authenticated with check (public.sou_admin());
drop policy if exists trechos_apagar on public.apostila_trechos;
create policy trechos_apagar on public.apostila_trechos for delete to authenticated using (public.sou_admin());

-- ---------------------------------------------------------------------
-- 4. PROVISÓRIO: cadastro sem confirmação por e-mail
-- ---------------------------------------------------------------------
-- Marca o e-mail como confirmado no momento do cadastro. Qualquer pessoa pode
-- criar conta com qualquer e-mail, sem provar que é dela.
-- Para voltar a exigir a confirmação, rode:
--   drop trigger if exists confirmar_email_automatico on auth.users;
create or replace function public.confirmar_email_automatico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end;
$$;
revoke all on function public.confirmar_email_automatico() from public, anon, authenticated;
drop trigger if exists confirmar_email_automatico on auth.users;
create trigger confirmar_email_automatico before insert on auth.users
  for each row execute function public.confirmar_email_automatico();

-- Meus documentos: índices, acesso e regras (só o dono)
create index if not exists documentos_usuario on public.documentos (usuario_id, atualizado_em desc);
create index if not exists pastas_usuario on public.pastas (usuario_id);
alter table public.pastas enable row level security;
alter table public.documentos enable row level security;
grant select, insert, update, delete on public.pastas, public.documentos to authenticated;
drop policy if exists pastas_dono on public.pastas;
create policy pastas_dono on public.pastas for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and public.posso_usar());
drop policy if exists documentos_dono on public.documentos;
create policy documentos_dono on public.documentos for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and public.posso_usar()
    and (pasta_id is null or exists (select 1 from public.pastas p where p.id = pasta_id and p.usuario_id = auth.uid())));
-- Leitura: capítulos lidos (quantas vezes) e tempo de uso por dia. Só o dono vê.
create table if not exists public.leituras (
  usuario_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  ref text not null check (ref ~ '^[0-9]{1,2}\.[0-9]{1,3}$'),     -- "livro.capítulo" (capítulo a partir de 0)
  vezes integer not null default 1 check (vezes between 0 and 100000),
  ultima timestamptz not null default now(),
  primary key (usuario_id, ref)
);
create table if not exists public.uso_diario (
  usuario_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  dia date not null,
  segundos integer not null default 0 check (segundos between 0 and 86400),
  primary key (usuario_id, dia)
);
alter table public.leituras enable row level security;
alter table public.uso_diario enable row level security;
grant select, insert, update, delete on public.leituras, public.uso_diario to authenticated;
drop policy if exists leituras_dono on public.leituras;
create policy leituras_dono on public.leituras for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and public.posso_usar());
drop policy if exists uso_dono on public.uso_diario;
create policy uso_dono on public.uso_diario for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and public.posso_usar());
