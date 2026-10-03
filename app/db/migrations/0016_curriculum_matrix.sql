-- ============================================================
-- IAH Educacional — Migration 0016: matriz curricular do Ensino Médio
--
-- Primeiro incremento da reformulação do IAH como SaaS escolar para a
-- 1ª, 2ª e 3ª séries do Ensino Médio, nas QUATRO áreas (Linguagens,
-- Matemática, Ciências da Natureza, Ciências Humanas e Sociais
-- Aplicadas). Ver docs/reformulacao/01-matriz-e-banco-de-questoes.md e
-- DECISIONS.md D-049.
--
-- Modelo:
--   curriculum_areas        catálogo de referência (sem institution_id)
--   curriculum_components   referência comum (institution_id NULL) ou
--                           componente próprio da escola
--   curriculum_skills       habilidade BNCC (institution_id NULL) ou
--                           habilidade própria da escola
--   school_curriculum_plans distribuição da habilidade por escola ×
--                           ano letivo × série × período × componente
--
-- A BNCC fornece as habilidades do Ensino Médio POR ÁREA; quem decide
-- em que série, período e componente cada uma é trabalhada é o
-- planejamento curricular de cada escola. Por isso a série NÃO é campo
-- da habilidade: é campo do planejamento.
--
-- REGRAS (mesmas das anteriores):
--  * NENHUM dado é inserido aqui — nem o catálogo BNCC. O recorte
--    demonstrativo (provisório) é carregado por script explícito.
--  * Só adições: nenhuma coluna existente muda de tipo, nenhuma tabela
--    é removida, nenhum dado é apagado.
--  * RLS habilitada em toda tabela nova; `iah_app` lê o que é comum e
--    o que é da própria instituição; só a gestão escreve o planejamento.
--  * Nenhum DELETE para `iah_app` (padrão do piloto): retirar é status.
--
-- Idempotente onde o Postgres permite (if not exists / drop policy if
-- exists / create or replace).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Quem é o usuário do ator (claim já emitida desde a 0010)
-- ------------------------------------------------------------
create or replace function public.iah_actor_user() returns text
language sql stable set search_path = public
as $$ select public.iah_claim('user_id'); $$;

revoke all on function public.iah_actor_user() from public;
revoke execute on function public.iah_actor_user() from anon, authenticated;
grant execute on function public.iah_actor_user() to iah_app;

-- ------------------------------------------------------------
-- 2. Série da turma em forma normalizada (coluna nova, opcional)
--
-- `classrooms.grade` continua texto livre (ex.: "1ª série E.M."). O
-- planejamento precisa de um código estável para cruzar turma × série.
-- ------------------------------------------------------------
alter table classrooms add column if not exists grade_code text
  check (grade_code in ('em1', 'em2', 'em3'));

-- ------------------------------------------------------------
-- 3. Catálogo
-- ------------------------------------------------------------
create table if not exists curriculum_areas (
  id          text primary key,             -- 'lgg' | 'mat' | 'cnt' | 'chs'
  code        text not null unique,         -- 'LGG' | 'MAT' | 'CNT' | 'CHS'
  name        text not null,
  stage       text not null default 'ensino_medio' check (stage in ('ensino_medio')),
  created_at  timestamptz not null default now()
);

create table if not exists curriculum_components (
  id              text primary key,
  institution_id  text references institutions (id),   -- NULL = referência comum
  area_id         text not null references curriculum_areas (id),
  name            text not null check (length(btrim(name)) > 0),
  status          text not null default 'active' check (status in ('active', 'retired')),
  created_at      timestamptz not null default now()
);
create unique index if not exists curriculum_components_name_uq
  on curriculum_components (coalesce(institution_id, ''), area_id, lower(name));
create index if not exists curriculum_components_area_idx on curriculum_components (area_id);
create index if not exists curriculum_components_institution_idx on curriculum_components (institution_id);

create table if not exists curriculum_skills (
  id                text primary key,
  institution_id    text references institutions (id),   -- NULL = BNCC
  framework         text not null check (framework in ('bncc', 'escola')),
  area_id           text not null references curriculum_areas (id),
  -- Na BNCC do EM a maioria das habilidades é da área; Língua Portuguesa
  -- é a exceção com componente próprio. Habilidade da escola pode
  -- nascer já ligada a um componente.
  component_id      text references curriculum_components (id),
  code              text not null check (length(btrim(code)) > 0),
  description       text not null check (length(btrim(description)) > 0),
  -- De onde veio o texto (documento, versão, data da conferência).
  source_reference  text not null,
  status            text not null default 'active' check (status in ('active', 'retired')),
  created_at        timestamptz not null default now(),
  -- BNCC é referência comum; habilidade própria pertence a uma escola.
  check ((framework = 'bncc') = (institution_id is null))
);
create unique index if not exists curriculum_skills_code_uq
  on curriculum_skills (coalesce(institution_id, ''), code);
create index if not exists curriculum_skills_area_idx on curriculum_skills (area_id);
create index if not exists curriculum_skills_component_idx on curriculum_skills (component_id);
create index if not exists curriculum_skills_institution_idx on curriculum_skills (institution_id);

-- ------------------------------------------------------------
-- 4. Planejamento curricular da escola
-- ------------------------------------------------------------
create table if not exists school_curriculum_plans (
  id                text primary key,
  institution_id    text not null references institutions (id),
  academic_year_id  text not null references academic_years (id),
  grade_code        text not null check (grade_code in ('em1', 'em2', 'em3')),
  period_order      integer not null check (period_order between 1 and 12),
  period_label      text not null check (length(btrim(period_label)) > 0),
  component_id      text not null references curriculum_components (id),
  skill_id          text not null references curriculum_skills (id),
  -- 'provisional' = recorte demonstrativo/ainda não validado pela escola.
  status            text not null default 'provisional'
    check (status in ('provisional', 'approved', 'retired')),
  notes             text,
  created_by        text references users (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (institution_id, academic_year_id, grade_code, period_order, component_id, skill_id)
);
create index if not exists school_curriculum_plans_lookup_idx
  on school_curriculum_plans (institution_id, academic_year_id, grade_code, period_order);
create index if not exists school_curriculum_plans_skill_idx on school_curriculum_plans (skill_id);
create index if not exists school_curriculum_plans_component_idx on school_curriculum_plans (component_id);
create index if not exists school_curriculum_plans_academic_year_idx on school_curriculum_plans (academic_year_id);
create index if not exists school_curriculum_plans_created_by_idx on school_curriculum_plans (created_by);

-- ------------------------------------------------------------
-- 5. Coerência de escopo (vale para QUALQUER papel, inclusive
--    service_role): o planejamento de uma escola só referencia ano
--    letivo dela e componente/habilidade comuns ou dela; habilidade de
--    escola só aponta componente comum ou da mesma escola.
--    `security definer`: a conferência precisa enxergar a linha real
--    mesmo quando a RLS a esconderia do ator — uma linha invisível
--    viraria NULL e passaria pelas comparações. A função só lê e recusa;
--    não devolve nada ao chamador.
-- ------------------------------------------------------------
create or replace function public.iah_check_skill_scope() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  comp record;
begin
  if new.component_id is not null then
    select institution_id, area_id into comp from curriculum_components where id = new.component_id;
    if comp.area_id is distinct from new.area_id then
      raise exception 'Habilidade e componente de áreas diferentes.' using errcode = '23514';
    end if;
    if comp.institution_id is not null and comp.institution_id is distinct from new.institution_id then
      raise exception 'Componente de outra instituição.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists curriculum_skills_scope on curriculum_skills;
create trigger curriculum_skills_scope before insert or update on curriculum_skills
  for each row execute function public.iah_check_skill_scope();

create or replace function public.iah_check_plan_scope() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  comp record;
  sk record;
begin
  if not exists (
    select 1 from academic_years
     where id = new.academic_year_id and institution_id = new.institution_id
  ) then
    raise exception 'Ano letivo de outra instituição.' using errcode = '42501';
  end if;

  select institution_id, area_id into comp from curriculum_components where id = new.component_id;
  select institution_id, area_id, component_id into sk from curriculum_skills where id = new.skill_id;

  if comp.institution_id is not null and comp.institution_id <> new.institution_id then
    raise exception 'Componente de outra instituição.' using errcode = '42501';
  end if;
  if sk.institution_id is not null and sk.institution_id <> new.institution_id then
    raise exception 'Habilidade de outra instituição.' using errcode = '42501';
  end if;
  if comp.area_id <> sk.area_id then
    raise exception 'Habilidade e componente de áreas diferentes.' using errcode = '23514';
  end if;
  if sk.component_id is not null and sk.component_id <> new.component_id then
    raise exception 'Habilidade vinculada a outro componente.' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists school_curriculum_plans_scope on school_curriculum_plans;
create trigger school_curriculum_plans_scope before insert or update on school_curriculum_plans
  for each row execute function public.iah_check_plan_scope();

revoke all on function public.iah_check_skill_scope() from public;
revoke all on function public.iah_check_plan_scope() from public;

-- ------------------------------------------------------------
-- 6. RLS + grants
-- ------------------------------------------------------------
alter table curriculum_areas         enable row level security;
alter table curriculum_components    enable row level security;
alter table curriculum_skills        enable row level security;
alter table school_curriculum_plans  enable row level security;

-- O Supabase hospedado concede privilégios padrão a anon/authenticated
-- em tabelas novas (achado da 0013). Revogar explicitamente.
revoke all on curriculum_areas, curriculum_components, curriculum_skills,
              school_curriculum_plans from anon, authenticated;

grant select, insert, update, delete on curriculum_areas, curriculum_components,
  curriculum_skills, school_curriculum_plans to service_role;

grant select on curriculum_areas to iah_app;
grant select, insert, update on curriculum_components, curriculum_skills,
                                school_curriculum_plans to iah_app;

drop policy if exists iah_app_curriculum_areas_read on curriculum_areas;
create policy iah_app_curriculum_areas_read on curriculum_areas for select to iah_app
  using (true); -- catálogo de referência

drop policy if exists iah_app_curriculum_components_read on curriculum_components;
create policy iah_app_curriculum_components_read on curriculum_components for select to iah_app
  using (institution_id is null or institution_id = public.iah_actor_institution());

-- Componente/habilidade PRÓPRIOS: só a gestão da escola cria e altera,
-- e só dentro da própria instituição (a referência comum é
-- administrativa, via service_role).
drop policy if exists iah_app_curriculum_components_insert on curriculum_components;
create policy iah_app_curriculum_components_insert on curriculum_components for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'administrador'
  );

drop policy if exists iah_app_curriculum_components_update on curriculum_components;
create policy iah_app_curriculum_components_update on curriculum_components for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'administrador'
  )
  with check (institution_id = public.iah_actor_institution());

drop policy if exists iah_app_curriculum_skills_read on curriculum_skills;
create policy iah_app_curriculum_skills_read on curriculum_skills for select to iah_app
  using (institution_id is null or institution_id = public.iah_actor_institution());

drop policy if exists iah_app_curriculum_skills_insert on curriculum_skills;
create policy iah_app_curriculum_skills_insert on curriculum_skills for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and framework = 'escola'
    and public.iah_actor_role() = 'administrador'
  );

drop policy if exists iah_app_curriculum_skills_update on curriculum_skills;
create policy iah_app_curriculum_skills_update on curriculum_skills for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'administrador'
  )
  with check (institution_id = public.iah_actor_institution() and framework = 'escola');

-- Planejamento: toda a equipe e os alunos da escola leem (o aluno verá o
-- plano semanal derivado dele em incremento futuro); só a gestão escreve.
drop policy if exists iah_app_curriculum_plans_read on school_curriculum_plans;
create policy iah_app_curriculum_plans_read on school_curriculum_plans for select to iah_app
  using (institution_id = public.iah_actor_institution());

drop policy if exists iah_app_curriculum_plans_insert on school_curriculum_plans;
create policy iah_app_curriculum_plans_insert on school_curriculum_plans for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'administrador'
    and created_by = public.iah_actor_user()
  );

drop policy if exists iah_app_curriculum_plans_update on school_curriculum_plans;
create policy iah_app_curriculum_plans_update on school_curriculum_plans for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'administrador'
  )
  with check (institution_id = public.iah_actor_institution());
