-- ============================================================
-- IAH Educacional — Migration 0018: Catálogo IAH (questões comuns a
-- todas as escolas), figuras, Matriz do Enem e BNCC sugerida
--
-- Ver DECISIONS.md D-050 e docs/reformulacao/03-catalogo-iah-e-enem.md.
--
-- 1. CATÁLOGO IAH = um inquilino especial (`institutions.kind =
--    'catalogo'`). É dono das questões do Enem importadas como
--    "licenciado" e, depois, das questões inéditas IAH. Reaproveita
--    TODO o fluxo editorial da 0017 (autor ≠ revisor, conferência,
--    direitos verificados pela gestão — aqui, a gestão IAH).
--    Escolas: leem só versões APROVADAS do catálogo e as usam em listas;
--    nunca escrevem nele. Listas, tentativas e respostas continuam
--    sempre da escola.
-- 2. FIGURAS (`question_assets`): recortes do formato híbrido, sob a
--    mesma visibilidade da versão; imutáveis depois do envio à revisão.
-- 3. MARCAÇÃO: `question_versions.content_format` distingue texto puro
--    de `marcacao_v1` (<sub>, <sup>, <em>, <strong>, <small> e
--    {{figura:N}}), renderizada por lista de permissão na aplicação.
-- 4. RESOLUÇÃO: passa a ser exigida NA APROVAÇÃO (e não ao criar o
--    gabarito) — itens importados entram como rascunho sem resolução e
--    não chegam a aluno até a equipe escrevê-la.
-- 5. MATRIZ DO ENEM: novo framework de habilidade `enem_matriz`
--    (referência comum, sem institution_id).
-- 6. BNCC SUGERIDA (`question_skill_suggestions`): correspondência
--    proposta (IA ou equipe) com confiança e motivo; só vale como
--    "confirmada" depois de revisão humana. Não substitui a habilidade
--    oficial da questão.
-- 7. PROCEDÊNCIA EXTERNA: `questions.external_ref` (ano, dia, caderno,
--    posição, código INEP, parâmetros TRI oficiais com fonte) e chave
--    única por inquilino — reimportar não duplica.
--
-- Só adições/afrouxamentos controlados; nenhum dado inserido aqui; nenhum
-- DELETE para `iah_app`. Idempotente onde o Postgres permite.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Catálogo
-- ------------------------------------------------------------
alter table institutions add column if not exists kind text not null default 'escola'
  check (kind in ('escola', 'catalogo'));

create or replace function public.iah_is_catalog(target_institution text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from institutions where id = target_institution and kind = 'catalogo'); $$;

revoke all on function public.iah_is_catalog(text) from public;
revoke execute on function public.iah_is_catalog(text) from anon, authenticated;
grant execute on function public.iah_is_catalog(text) to iah_app;

-- Versão do catálogo liberada para a equipe das escolas? (aprovada, ou
-- já aprovada e depois substituída — listas antigas continuam legíveis)
create or replace function public.iah_catalog_version_released(target_version text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from question_versions v
     where v.id = target_version and v.status in ('aprovada', 'substituida')
       and public.iah_is_catalog(v.institution_id)
  );
$$;
revoke all on function public.iah_catalog_version_released(text) from public;
revoke execute on function public.iah_catalog_version_released(text) from anon, authenticated;
grant execute on function public.iah_catalog_version_released(text) to iah_app;

-- ------------------------------------------------------------
-- 2. Matriz do Enem como framework de habilidade
-- ------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.curriculum_skills'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%framework%'
  loop
    execute format('alter table public.curriculum_skills drop constraint %I', c.conname);
  end loop;
end $$;

alter table curriculum_skills add constraint curriculum_skills_framework_check
  check (framework in ('bncc', 'enem_matriz', 'escola'));
alter table curriculum_skills add constraint curriculum_skills_framework_owner_check
  check ((framework in ('bncc', 'enem_matriz')) = (institution_id is null));
alter table curriculum_skills add column if not exists competency_code text;

-- ------------------------------------------------------------
-- 3. Marcação, procedência externa, resolução na aprovação
-- ------------------------------------------------------------
alter table question_versions add column if not exists content_format text not null default 'texto'
  check (content_format in ('texto', 'marcacao_v1'));

alter table questions add column if not exists external_ref jsonb;
create unique index if not exists questions_external_ref_uq
  on questions (institution_id, (external_ref ->> 'chave'))
  where external_ref ? 'chave';

alter table question_version_keys alter column resolution drop not null;
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.question_version_keys'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%resolution%'
  loop
    execute format('alter table public.question_version_keys drop constraint %I', c.conname);
  end loop;
end $$;
alter table question_version_keys add constraint question_version_keys_resolution_check
  check (resolution is null or length(btrim(resolution)) > 0);

-- Revisão: mesma regra da 0017 + resolução obrigatória para aprovar.
create or replace function public.iah_apply_question_review() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v record;
  src record;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Revisão é registro permanente; registre uma nova.' using errcode = '42501';
  end if;

  select id, question_id, status, created_by, source_id into v
    from question_versions where id = new.version_id for update;
  if v.status <> 'em_revisao' then
    raise exception 'Só versões em revisão recebem decisão.' using errcode = '23514';
  end if;
  if new.reviewer_id = v.created_by then
    raise exception 'Quem escreveu a versão não pode revisá-la.' using errcode = '42501';
  end if;

  if new.decision = 'aprovada' then
    if not (
      coalesce((new.checklist ->> 'gabarito')::boolean, false)
      and coalesce((new.checklist ->> 'habilidade')::boolean, false)
      and coalesce((new.checklist ->> 'direitos')::boolean, false)
      and coalesce((new.checklist ->> 'linguagem')::boolean, false)
    ) then
      raise exception 'Aprovação exige todos os itens da conferência.' using errcode = '23514';
    end if;
    select rights_status into src from content_sources where id = v.source_id;
    if src.rights_status <> 'verificado' then
      raise exception 'Fonte sem direitos verificados não pode ser aprovada.' using errcode = '23514';
    end if;
    if not exists (
      select 1 from question_version_keys
       where version_id = v.id and resolution is not null and length(btrim(resolution)) > 0
    ) then
      raise exception 'Versão sem gabarito e resolução comentada não pode ser aprovada.' using errcode = '23514';
    end if;

    perform set_config('iah.trusted', 'on', true);
    update question_versions set status = 'substituida'
     where question_id = v.question_id and status = 'aprovada' and id <> v.id;
    update question_versions
       set status = 'aprovada', decided_at = now(), decided_by = new.reviewer_id
     where id = v.id;
    perform set_config('iah.trusted', '', true);
  else
    if coalesce(btrim(new.comment), '') = '' then
      raise exception 'Devolução exige comentário para o autor.' using errcode = '23514';
    end if;
    perform set_config('iah.trusted', 'on', true);
    update question_versions
       set status = 'devolvida', decided_at = now(), decided_by = new.reviewer_id
     where id = v.id;
    perform set_config('iah.trusted', '', true);
  end if;
  new.created_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 4. Itens de lista podem apontar para versão do catálogo
-- ------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.practice_list_items'::regclass and contype = 'f'
       and pg_get_constraintdef(oid) ilike '%question_version_id%'
  loop
    execute format('alter table public.practice_list_items drop constraint %I', c.conname);
  end loop;
end $$;
alter table practice_list_items add constraint practice_list_items_question_version_fkey
  foreign key (question_version_id) references question_versions (id);

create or replace function public.iah_check_practice_list_item() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  lst record;
  v record;
begin
  select status into lst from practice_lists where id = new.list_id;
  if lst.status <> 'rascunho' then
    raise exception 'Itens só mudam enquanto a lista é rascunho.' using errcode = '23514';
  end if;
  select qv.status, qv.institution_id, q.skill_id into v
    from question_versions qv join questions q on q.id = qv.question_id
   where qv.id = new.question_version_id;
  -- Versão da própria escola OU do catálogo IAH — nunca de outra escola.
  if v.institution_id <> new.institution_id and not public.iah_is_catalog(v.institution_id) then
    raise exception 'Questão de outra instituição.' using errcode = '42501';
  end if;
  if v.status <> 'aprovada' then
    raise exception 'Só versões aprovadas na revisão entram em lista.' using errcode = '23514';
  end if;
  new.skill_id := v.skill_id;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 5. Figuras
-- ------------------------------------------------------------
create table if not exists question_assets (
  id              text primary key,
  institution_id  text not null,
  version_id      text not null,
  n               integer not null check (n between 1 and 60),
  mime            text not null default 'image/png' check (mime in ('image/png')),
  content         bytea not null check (octet_length(content) between 1 and 2097152),
  width           integer,
  height          integer,
  alt_text        text,
  sha256          text not null,
  created_at      timestamptz not null default now(),
  unique (version_id, n),
  foreign key (version_id, institution_id) references question_versions (id, institution_id)
);
create index if not exists question_assets_institution_idx on question_assets (institution_id);

create or replace function public.iah_check_question_asset() returns trigger
language plpgsql security definer set search_path = public
as $$
declare v record;
begin
  select status into v from question_versions where id = new.version_id;
  if v.status <> 'rascunho' then
    raise exception 'Figuras de versão enviada à revisão não mudam; crie uma nova versão.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.version_id <> old.version_id or new.n <> old.n) then
    raise exception 'Identidade da figura não muda.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists question_assets_check on question_assets;
create trigger question_assets_check before insert or update on question_assets
  for each row execute function public.iah_check_question_asset();
revoke all on function public.iah_check_question_asset() from public;

-- ------------------------------------------------------------
-- 6. BNCC sugerida
-- ------------------------------------------------------------
create table if not exists question_skill_suggestions (
  id              text primary key,
  institution_id  text not null,
  question_id     text not null,
  skill_id        text not null references curriculum_skills (id),
  origin          text not null check (origin in ('ia', 'equipe')),
  confidence      text not null check (confidence in ('alta', 'media', 'baixa')),
  rationale       text not null check (length(btrim(rationale)) > 0),
  status          text not null default 'sugerida' check (status in ('sugerida', 'confirmada', 'rejeitada')),
  reviewed_by     text references users (id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (question_id, skill_id),
  foreign key (question_id, institution_id) references questions (id, institution_id),
  check (status = 'sugerida' or (reviewed_by is not null and reviewed_at is not null))
);
create index if not exists question_skill_suggestions_skill_idx on question_skill_suggestions (skill_id, status);
create index if not exists question_skill_suggestions_institution_idx on question_skill_suggestions (institution_id);
create index if not exists question_skill_suggestions_reviewed_by_idx on question_skill_suggestions (reviewed_by);

create or replace function public.iah_check_skill_suggestion() returns trigger
language plpgsql security definer set search_path = public
as $$
declare sk record;
begin
  select institution_id into sk from curriculum_skills where id = new.skill_id;
  if sk.institution_id is not null and sk.institution_id <> new.institution_id then
    raise exception 'Habilidade de outra instituição.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.question_id <> old.question_id or new.skill_id <> old.skill_id
                           or new.origin <> old.origin or new.institution_id <> old.institution_id) then
    raise exception 'Só o status da sugestão muda.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists question_skill_suggestions_check on question_skill_suggestions;
create trigger question_skill_suggestions_check before insert or update on question_skill_suggestions
  for each row execute function public.iah_check_skill_suggestion();
revoke all on function public.iah_check_skill_suggestion() from public;

-- ------------------------------------------------------------
-- 7. RLS e grants
-- ------------------------------------------------------------
alter table question_assets            enable row level security;
alter table question_skill_suggestions enable row level security;

revoke all on question_assets, question_skill_suggestions from anon, authenticated;
grant select, insert, update, delete on question_assets, question_skill_suggestions to service_role;
grant select, insert, update on question_assets, question_skill_suggestions to iah_app;

-- 7.1 Catálogo legível pelas escolas (políticas ADICIONAIS às da 0017).
drop policy if exists iah_app_sources_catalog_read on content_sources;
create policy iah_app_sources_catalog_read on content_sources for select to iah_app
  using (public.iah_is_catalog(institution_id) and public.iah_is_staff());

drop policy if exists iah_app_questions_catalog_read on questions;
create policy iah_app_questions_catalog_read on questions for select to iah_app
  using (public.iah_is_catalog(institution_id) and public.iah_is_staff());

drop policy if exists iah_app_versions_catalog_read on question_versions;
create policy iah_app_versions_catalog_read on question_versions for select to iah_app
  using (
    public.iah_is_catalog(institution_id)
    and ((public.iah_is_staff() and status in ('aprovada', 'substituida')) or public.iah_student_sees_version(id))
  );

drop policy if exists iah_app_keys_catalog_read on question_version_keys;
create policy iah_app_keys_catalog_read on question_version_keys for select to iah_app
  using (
    public.iah_is_catalog(institution_id)
    and ((public.iah_is_staff() and public.iah_catalog_version_released(version_id))
         or public.iah_student_submitted_version(version_id))
  );

-- 7.2 Figuras: mesma visibilidade da versão.
drop policy if exists iah_app_assets_read on question_assets;
create policy iah_app_assets_read on question_assets for select to iah_app
  using (
    (institution_id = public.iah_actor_institution()
      and (public.iah_is_staff() or public.iah_student_sees_version(version_id)))
    or (public.iah_is_catalog(institution_id)
      and ((public.iah_is_staff() and public.iah_catalog_version_released(version_id))
           or public.iah_student_sees_version(version_id)))
  );

drop policy if exists iah_app_assets_insert on question_assets;
create policy iah_app_assets_insert on question_assets for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and exists (select 1 from question_versions v where v.id = version_id and v.created_by = public.iah_actor_user())
  );

drop policy if exists iah_app_assets_update on question_assets;
create policy iah_app_assets_update on question_assets for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and exists (select 1 from question_versions v where v.id = version_id and v.created_by = public.iah_actor_user())
  )
  with check (institution_id = public.iah_actor_institution());

-- 7.3 Sugestões: leitura como a questão; escrita pela equipe dona.
drop policy if exists iah_app_suggestions_read on question_skill_suggestions;
create policy iah_app_suggestions_read on question_skill_suggestions for select to iah_app
  using (
    public.iah_is_staff()
    and (institution_id = public.iah_actor_institution() or public.iah_is_catalog(institution_id))
  );

drop policy if exists iah_app_suggestions_insert on question_skill_suggestions;
create policy iah_app_suggestions_insert on question_skill_suggestions for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_is_staff()
    and status = 'sugerida'
  );

drop policy if exists iah_app_suggestions_update on question_skill_suggestions;
create policy iah_app_suggestions_update on question_skill_suggestions for update to iah_app
  using (institution_id = public.iah_actor_institution() and public.iah_is_staff())
  with check (
    institution_id = public.iah_actor_institution()
    and (reviewed_by is null or reviewed_by = public.iah_actor_user())
  );
