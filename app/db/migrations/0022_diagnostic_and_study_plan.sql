-- ============================================================
-- IAH Educacional — Migration 0022: Diagnóstico por etapas e plano
-- semanal de estudos (1ª série do Ensino Médio)
--
-- Decisão: docs/DECISIONS.md D-054 e
-- docs/reformulacao/08-diagnostico-e-plano-semanal.md.
--
-- Reaproveita o banco de questões (0017–0020): cada ETAPA do diagnóstico
-- é uma lista `diagnostica` com habilidade-alvo; resposta, versão,
-- habilidade e acerto continuam em `practice_list_items` e
-- `attempt_answers` (acerto calculado pelo banco na entrega). Esta
-- migration só acrescenta:
--
-- 1. `content_sources.synthetic` — fonte de questões sintéticas/
--    demonstrativas. Diagnóstico com qualquer questão dessas fontes é
--    DEMONSTRATIVO: a marca é calculada pelo banco, nunca pelo cliente.
-- 2. `diagnostics` e `diagnostic_blocks` — o diagnóstico da turma e suas
--    etapas (uma lista por habilidade). Só o professor da turma cria e
--    publica; o aluno da turma lê o que está publicado.
-- 3. `study_plans`, `study_plan_items`, `study_plan_events` — o plano
--    semanal do aluno: disponibilidade informada, atividades com motivo,
--    e o HISTÓRICO de cada alteração (só inserção). O banco recusa
--    atividade em dia não disponível e soma de minutos acima do
--    informado para o dia. Aluno ajusta o próprio plano; o professor da
--    turma ajusta o plano dos seus alunos.
--
-- Só adições; nenhum dado inserido; nenhum DELETE para `iah_app`.
-- Idempotente. Reversão manual no fim do arquivo.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fonte sintética / demonstrativa
-- ------------------------------------------------------------
alter table content_sources add column if not exists synthetic boolean not null default false;

-- ------------------------------------------------------------
-- 2. Diagnóstico por etapas
-- ------------------------------------------------------------
create table if not exists diagnostics (
  id                      text primary key,
  institution_id          text not null references institutions (id),
  classroom_id            text not null references classrooms (id),
  title                   text not null check (length(btrim(title)) between 1 and 160),
  grade_code              text check (grade_code in ('em1', 'em2', 'em3')),
  status                  text not null default 'rascunho'
    check (status in ('rascunho', 'publicado', 'encerrado')),
  -- Calculados pelo banco (trigger): verdadeiro se alguma questão vem de
  -- fonte sintética / se alguma etapa usa currículo provisório.
  demonstrative           boolean not null default true,
  curriculum_provisional  boolean not null default true,
  created_by              text not null references users (id),
  created_at              timestamptz not null default now(),
  published_at            timestamptz,
  unique (id, institution_id)
);
create index if not exists diagnostics_classroom_idx on diagnostics (classroom_id, status);
create index if not exists diagnostics_institution_idx on diagnostics (institution_id);
create index if not exists diagnostics_created_by_idx on diagnostics (created_by);

create table if not exists diagnostic_blocks (
  id              text primary key,
  institution_id  text not null,
  diagnostic_id   text not null,
  position        integer not null check (position between 1 and 12),
  list_id         text not null unique,
  skill_id        text not null references curriculum_skills (id),
  unique (diagnostic_id, position),
  unique (diagnostic_id, skill_id),
  foreign key (diagnostic_id, institution_id) references diagnostics (id, institution_id),
  foreign key (list_id, institution_id) references practice_lists (id, institution_id)
);
create index if not exists diagnostic_blocks_institution_idx on diagnostic_blocks (institution_id);
create index if not exists diagnostic_blocks_skill_idx on diagnostic_blocks (skill_id);

-- Marcas calculadas a partir das etapas: nenhuma etapa conta como
-- demonstrativo e provisório (não há o que liberar).
create or replace function public.iah_diagnostic_flags(target_diagnostic text, out demonstrative boolean, out provisional boolean)
language sql stable security definer set search_path = public
as $$
  select
    not exists (select 1 from diagnostic_blocks b where b.diagnostic_id = target_diagnostic)
      or exists (
        select 1 from diagnostic_blocks b
          join practice_list_items i on i.list_id = b.list_id
          join question_versions v on v.id = i.question_version_id
          join content_sources s on s.id = v.source_id
         where b.diagnostic_id = target_diagnostic and s.synthetic
      ),
    not exists (select 1 from diagnostic_blocks b where b.diagnostic_id = target_diagnostic)
      or exists (
        select 1 from diagnostic_blocks b join practice_lists l on l.id = b.list_id
         where b.diagnostic_id = target_diagnostic and l.curriculum_provisional
      );
$$;
revoke all on function public.iah_diagnostic_flags(text) from public;
revoke execute on function public.iah_diagnostic_flags(text) from anon, authenticated;

create or replace function public.iah_check_diagnostic() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  flags record;
begin
  if not exists (select 1 from classrooms where id = new.classroom_id and institution_id = new.institution_id) then
    raise exception 'Turma de outra instituição.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'rascunho' then
      raise exception 'Diagnóstico nasce como rascunho.' using errcode = '23514';
    end if;
    new.published_at := null;
  else
    if new.classroom_id <> old.classroom_id or new.institution_id <> old.institution_id
       or new.created_by <> old.created_by then
      raise exception 'Turma e autoria do diagnóstico não mudam.' using errcode = '23514';
    end if;
    if old.status = 'encerrado' and new.status <> 'encerrado' then
      raise exception 'Diagnóstico encerrado não reabre.' using errcode = '23514';
    end if;
    if old.status = 'publicado' and new.status = 'rascunho' then
      raise exception 'Diagnóstico publicado não volta a rascunho.' using errcode = '23514';
    end if;
    if new.status = 'publicado' and old.status = 'rascunho' then
      if not exists (select 1 from diagnostic_blocks where diagnostic_id = new.id) then
        raise exception 'Diagnóstico sem etapas não é publicado.' using errcode = '23514';
      end if;
      if exists (
        select 1 from diagnostic_blocks b join practice_lists l on l.id = b.list_id
         where b.diagnostic_id = new.id and l.status <> 'publicada'
      ) then
        raise exception 'Publique as listas das etapas antes do diagnóstico.' using errcode = '23514';
      end if;
      new.published_at := now();
    elsif new.status = old.status then
      new.published_at := old.published_at;
    end if;
  end if;
  -- As marcas nunca vêm do cliente.
  flags := public.iah_diagnostic_flags(new.id);
  new.demonstrative := flags.demonstrative;
  new.curriculum_provisional := flags.provisional;
  return new;
end;
$$;
drop trigger if exists diagnostics_check on diagnostics;
create trigger diagnostics_check before insert or update on diagnostics
  for each row execute function public.iah_check_diagnostic();
revoke all on function public.iah_check_diagnostic() from public;

create or replace function public.iah_check_diagnostic_block() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  l record;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Etapa do diagnóstico não muda; crie outro diagnóstico.' using errcode = '23514';
  end if;
  select classroom_id, institution_id, status into d from diagnostics where id = new.diagnostic_id;
  select classroom_id, institution_id, kind, target_skill_id into l from practice_lists where id = new.list_id;
  if d.status <> 'rascunho' then
    raise exception 'Etapas só entram com o diagnóstico em rascunho.' using errcode = '23514';
  end if;
  if l.institution_id <> d.institution_id or l.classroom_id <> d.classroom_id then
    raise exception 'Lista de outra turma.' using errcode = '42501';
  end if;
  if l.kind <> 'diagnostica' or l.target_skill_id is distinct from new.skill_id then
    raise exception 'A etapa é uma lista diagnóstica da mesma habilidade.' using errcode = '23514';
  end if;
  if exists (
    select 1 from practice_list_items i where i.list_id = new.list_id and i.skill_id <> new.skill_id
  ) then
    raise exception 'Todas as questões da etapa são da habilidade da etapa.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists diagnostic_blocks_check on diagnostic_blocks;
create trigger diagnostic_blocks_check before insert or update on diagnostic_blocks
  for each row execute function public.iah_check_diagnostic_block();
revoke all on function public.iah_check_diagnostic_block() from public;

-- Recalcula as marcas do diagnóstico depois de cada etapa nova.
create or replace function public.iah_refresh_diagnostic_flags() returns trigger
language plpgsql security definer set search_path = public
as $$
declare flags record;
begin
  flags := public.iah_diagnostic_flags(new.diagnostic_id);
  update diagnostics
     set demonstrative = flags.demonstrative, curriculum_provisional = flags.provisional
   where id = new.diagnostic_id;
  return null;
end;
$$;
drop trigger if exists diagnostic_blocks_refresh on diagnostic_blocks;
create trigger diagnostic_blocks_refresh after insert on diagnostic_blocks
  for each row execute function public.iah_refresh_diagnostic_flags();
revoke all on function public.iah_refresh_diagnostic_flags() from public;

create or replace function public.iah_reaches_diagnostic(target_diagnostic text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from diagnostics d
     where d.id = target_diagnostic
       and d.institution_id = public.iah_actor_institution()
       and (
         (public.iah_is_staff() and public.iah_reaches_classroom(d.classroom_id))
         or (d.status in ('publicado', 'encerrado') and public.iah_enrolled(d.classroom_id))
       )
  );
$$;
create or replace function public.iah_teaches_diagnostic(target_diagnostic text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from diagnostics d
     where d.id = target_diagnostic
       and d.institution_id = public.iah_actor_institution()
       and public.iah_actor_role() = 'professor'
       and public.iah_teaches(d.classroom_id)
  );
$$;
revoke all on function public.iah_reaches_diagnostic(text) from public;
revoke all on function public.iah_teaches_diagnostic(text) from public;
revoke execute on function public.iah_reaches_diagnostic(text) from anon, authenticated;
revoke execute on function public.iah_teaches_diagnostic(text) from anon, authenticated;
grant execute on function public.iah_reaches_diagnostic(text) to iah_app;
grant execute on function public.iah_teaches_diagnostic(text) to iah_app;

-- ------------------------------------------------------------
-- 3. Plano semanal
-- ------------------------------------------------------------
create table if not exists study_plans (
  id               text primary key,
  institution_id   text not null references institutions (id),
  classroom_id     text not null references classrooms (id),
  student_id       text not null references students (id),
  -- Segunda-feira da semana do plano.
  week_start       date not null check (extract(isodow from week_start) = 1),
  -- Dias disponíveis: 1 = segunda … 7 = domingo.
  available_days   smallint[] not null
    check (cardinality(available_days) between 1 and 7 and available_days <@ array[1,2,3,4,5,6,7]::smallint[]),
  minutes_per_day  integer not null check (minutes_per_day between 10 and 240),
  rule_version     text not null check (length(btrim(rule_version)) > 0),
  created_by       text not null references users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (student_id, classroom_id, week_start),
  unique (id, institution_id)
);
create index if not exists study_plans_classroom_idx on study_plans (classroom_id, week_start);
create index if not exists study_plans_institution_idx on study_plans (institution_id);
create index if not exists study_plans_created_by_idx on study_plans (created_by);

create table if not exists study_plan_items (
  id              text primary key,
  institution_id  text not null,
  plan_id         text not null,
  student_id      text not null references students (id),
  classroom_id    text not null references classrooms (id),
  day             date not null,
  kind            text not null
    check (kind in ('diagnostico', 'lista', 'missao', 'revisao', 'circuito', 'orientacao')),
  -- Lista, missão ou etapa a que a atividade leva (quando houver).
  ref_id          text,
  skill_id        text references curriculum_skills (id),
  title           text not null check (length(btrim(title)) between 1 and 200),
  minutes         integer not null check (minutes between 5 and 120),
  -- Por que a atividade foi recomendada (mostrado ao aluno).
  reason          text not null check (length(btrim(reason)) between 1 and 600),
  rule            text not null default '',
  origin          text not null check (origin in ('regra', 'aluno', 'professor')),
  status          text not null default 'planejada'
    check (status in ('planejada', 'concluida', 'adiada', 'removida')),
  created_by      text not null references users (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, institution_id),
  foreign key (plan_id, institution_id) references study_plans (id, institution_id)
);
-- Nada de atividade duplicada em aberto no mesmo plano.
create unique index if not exists study_plan_items_open_uidx
  on study_plan_items (plan_id, kind, coalesce(ref_id, ''), coalesce(skill_id, ''))
  where status in ('planejada', 'adiada');
create index if not exists study_plan_items_plan_idx on study_plan_items (plan_id, day);
create index if not exists study_plan_items_student_idx on study_plan_items (student_id);
create index if not exists study_plan_items_classroom_idx on study_plan_items (classroom_id);
create index if not exists study_plan_items_institution_idx on study_plan_items (institution_id);
create index if not exists study_plan_items_created_by_idx on study_plan_items (created_by);
create index if not exists study_plan_items_skill_idx on study_plan_items (skill_id);

create table if not exists study_plan_events (
  id              text primary key,
  institution_id  text not null,
  plan_id         text not null,
  item_id         text,
  student_id      text not null references students (id),
  classroom_id    text not null references classrooms (id),
  action          text not null check (action in (
    'gerado', 'regerado', 'disponibilidade', 'concluido', 'adiado', 'reagendado',
    'removido', 'adicionado', 'reaberto'
  )),
  from_day        date,
  to_day          date,
  note            text not null default '' check (length(note) <= 600),
  actor_user_id   text not null references users (id),
  actor_role      text not null check (actor_role in ('aluno', 'professor')),
  created_at      timestamptz not null default now(),
  foreign key (plan_id, institution_id) references study_plans (id, institution_id),
  foreign key (item_id, institution_id) references study_plan_items (id, institution_id)
);
create index if not exists study_plan_events_plan_idx on study_plan_events (plan_id, created_at);
create index if not exists study_plan_events_item_idx on study_plan_events (item_id, institution_id);
create index if not exists study_plan_events_student_idx on study_plan_events (student_id);
create index if not exists study_plan_events_classroom_idx on study_plan_events (classroom_id);
create index if not exists study_plan_events_institution_idx on study_plan_events (institution_id);
create index if not exists study_plan_events_actor_idx on study_plan_events (actor_user_id);

create or replace function public.iah_check_study_plan() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from enrollments e
     where e.classroom_id = new.classroom_id and e.student_id = new.student_id
       and e.institution_id = new.institution_id and e.status = 'active'
  ) then
    raise exception 'Aluno fora da turma do plano.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.student_id <> old.student_id or new.classroom_id <> old.classroom_id
       or new.institution_id <> old.institution_id or new.week_start <> old.week_start
       or new.created_by <> old.created_by then
      raise exception 'Aluno, turma e semana do plano não mudam.' using errcode = '23514';
    end if;
    -- Nova disponibilidade não pode deixar atividades em aberto fora dela.
    if exists (
      select 1 from study_plan_items i
       where i.plan_id = new.id and i.status in ('planejada', 'concluida')
         and not (extract(isodow from i.day)::smallint = any (new.available_days))
    ) then
      raise exception 'Há atividades em dias que deixariam de estar disponíveis; reagende-as antes.'
        using errcode = '23514';
    end if;
    if exists (
      select 1 from study_plan_items i
       where i.plan_id = new.id and i.status in ('planejada', 'concluida')
       group by i.day having sum(i.minutes) > new.minutes_per_day
    ) then
      raise exception 'Há dias com mais atividades do que os novos minutos disponíveis; ajuste-os antes.'
        using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists study_plans_check on study_plans;
create trigger study_plans_check before insert or update on study_plans
  for each row execute function public.iah_check_study_plan();
revoke all on function public.iah_check_study_plan() from public;

-- Atividade: coerente com o plano, em dia disponível da semana e dentro
-- dos minutos do dia. O bloqueio da linha do plano serializa gravações
-- concorrentes no mesmo plano (dois cliques não estouram o orçamento).
create or replace function public.iah_check_study_plan_item() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  p record;
  used integer;
  role text := public.iah_actor_role();
begin
  select * into p from study_plans where id = new.plan_id for update;
  if p.institution_id <> new.institution_id or p.student_id <> new.student_id
     or p.classroom_id <> new.classroom_id then
    raise exception 'Atividade fora do plano.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (
       new.plan_id <> old.plan_id or new.kind <> old.kind
       or new.ref_id is distinct from old.ref_id or new.skill_id is distinct from old.skill_id
       or new.origin <> old.origin or new.created_by <> old.created_by
     ) then
    raise exception 'A atividade só muda de dia, duração ou situação.' using errcode = '23514';
  end if;
  -- Quem cria responde pela origem: professor só cria "professor"; aluno, "regra" ou "aluno".
  if tg_op = 'INSERT' and role <> '' then
    if (role = 'professor') <> (new.origin = 'professor') then
      raise exception 'Origem da atividade incompatível com quem a cria.' using errcode = '42501';
    end if;
  end if;
  if new.status in ('planejada', 'concluida') then
    if new.day < p.week_start or new.day > p.week_start + 6 then
      raise exception 'Dia fora da semana do plano.' using errcode = '23514';
    end if;
    if not (extract(isodow from new.day)::smallint = any (p.available_days)) then
      raise exception 'Dia não disponível no plano.' using errcode = '23514';
    end if;
    select coalesce(sum(minutes), 0) into used from study_plan_items
     where plan_id = new.plan_id and day = new.day and status in ('planejada', 'concluida')
       and id <> new.id;
    if used + new.minutes > p.minutes_per_day then
      raise exception 'Ultrapassa os % minutos disponíveis no dia.', p.minutes_per_day using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists study_plan_items_check on study_plan_items;
create trigger study_plan_items_check before insert or update on study_plan_items
  for each row execute function public.iah_check_study_plan_item();
revoke all on function public.iah_check_study_plan_item() from public;

create or replace function public.iah_check_study_plan_event() returns trigger
language plpgsql security definer set search_path = public
as $$
declare p record;
begin
  if tg_op <> 'INSERT' then
    raise exception 'O histórico do plano não muda.' using errcode = '42501';
  end if;
  select * into p from study_plans where id = new.plan_id;
  if p.institution_id <> new.institution_id or p.student_id <> new.student_id
     or p.classroom_id <> new.classroom_id then
    raise exception 'Registro fora do plano.' using errcode = '42501';
  end if;
  if new.item_id is not null and not exists (
    select 1 from study_plan_items i where i.id = new.item_id and i.plan_id = new.plan_id
  ) then
    raise exception 'Atividade de outro plano.' using errcode = '42501';
  end if;
  if public.iah_actor_user() <> '' and (
       new.actor_user_id <> public.iah_actor_user() or new.actor_role <> public.iah_actor_role()
     ) then
    raise exception 'O histórico registra quem fez a alteração.' using errcode = '42501';
  end if;
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists study_plan_events_check on study_plan_events;
create trigger study_plan_events_check before insert or update on study_plan_events
  for each row execute function public.iah_check_study_plan_event();
revoke all on function public.iah_check_study_plan_event() from public;

create or replace function public.iah_reaches_study_plan(target_plan text, for_write boolean)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from study_plans p
     where p.id = target_plan
       and p.institution_id = public.iah_actor_institution()
       and (
         (p.student_id = public.iah_actor_student() and public.iah_enrolled(p.classroom_id))
         or (for_write and public.iah_actor_role() = 'professor' and public.iah_teaches(p.classroom_id))
         or (not for_write and public.iah_is_staff() and public.iah_reaches_classroom(p.classroom_id))
       )
  );
$$;
revoke all on function public.iah_reaches_study_plan(text, boolean) from public;
revoke execute on function public.iah_reaches_study_plan(text, boolean) from anon, authenticated;
grant execute on function public.iah_reaches_study_plan(text, boolean) to iah_app;

-- ------------------------------------------------------------
-- 4. RLS e grants
-- ------------------------------------------------------------
alter table diagnostics        enable row level security;
alter table diagnostic_blocks  enable row level security;
alter table study_plans        enable row level security;
alter table study_plan_items   enable row level security;
alter table study_plan_events  enable row level security;

revoke all on diagnostics, diagnostic_blocks, study_plans, study_plan_items, study_plan_events
  from anon, authenticated;
grant select, insert, update, delete on diagnostics, diagnostic_blocks, study_plans,
  study_plan_items, study_plan_events to service_role;
grant select, insert, update on diagnostics to iah_app;
grant select, insert on diagnostic_blocks to iah_app;
grant select, insert, update on study_plans, study_plan_items to iah_app;
grant select, insert on study_plan_events to iah_app;

drop policy if exists iah_app_diagnostics_read on diagnostics;
create policy iah_app_diagnostics_read on diagnostics for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
      or (status in ('publicado', 'encerrado') and public.iah_enrolled(classroom_id))
    )
  );
drop policy if exists iah_app_diagnostics_insert on diagnostics;
create policy iah_app_diagnostics_insert on diagnostics for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
    and created_by = public.iah_actor_user()
  );
drop policy if exists iah_app_diagnostics_update on diagnostics;
create policy iah_app_diagnostics_update on diagnostics for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  )
  with check (institution_id = public.iah_actor_institution() and public.iah_teaches(classroom_id));

drop policy if exists iah_app_diagnostic_blocks_read on diagnostic_blocks;
create policy iah_app_diagnostic_blocks_read on diagnostic_blocks for select to iah_app
  using (institution_id = public.iah_actor_institution() and public.iah_reaches_diagnostic(diagnostic_id));
drop policy if exists iah_app_diagnostic_blocks_insert on diagnostic_blocks;
create policy iah_app_diagnostic_blocks_insert on diagnostic_blocks for insert to iah_app
  with check (institution_id = public.iah_actor_institution() and public.iah_teaches_diagnostic(diagnostic_id));

drop policy if exists iah_app_study_plans_read on study_plans;
-- Colunas da própria linha (não a função): no INSERT … RETURNING a linha
-- nova ainda não é visível para uma consulta à tabela.
create policy iah_app_study_plans_read on study_plans for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      (student_id = public.iah_actor_student() and public.iah_enrolled(classroom_id))
      or (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
    )
  );
drop policy if exists iah_app_study_plans_insert on study_plans;
create policy iah_app_study_plans_insert on study_plans for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'aluno'
    and student_id = public.iah_actor_student()
    and public.iah_enrolled(classroom_id)
    and created_by = public.iah_actor_user()
  );
drop policy if exists iah_app_study_plans_update on study_plans;
create policy iah_app_study_plans_update on study_plans for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
    and public.iah_enrolled(classroom_id)
  )
  with check (institution_id = public.iah_actor_institution() and student_id = public.iah_actor_student());

drop policy if exists iah_app_study_plan_items_read on study_plan_items;
create policy iah_app_study_plan_items_read on study_plan_items for select to iah_app
  using (institution_id = public.iah_actor_institution() and public.iah_reaches_study_plan(plan_id, false));
drop policy if exists iah_app_study_plan_items_insert on study_plan_items;
create policy iah_app_study_plan_items_insert on study_plan_items for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_reaches_study_plan(plan_id, true)
    and created_by = public.iah_actor_user()
  );
drop policy if exists iah_app_study_plan_items_update on study_plan_items;
create policy iah_app_study_plan_items_update on study_plan_items for update to iah_app
  using (institution_id = public.iah_actor_institution() and public.iah_reaches_study_plan(plan_id, true))
  with check (institution_id = public.iah_actor_institution() and public.iah_reaches_study_plan(plan_id, true));

drop policy if exists iah_app_study_plan_events_read on study_plan_events;
create policy iah_app_study_plan_events_read on study_plan_events for select to iah_app
  using (institution_id = public.iah_actor_institution() and public.iah_reaches_study_plan(plan_id, false));
drop policy if exists iah_app_study_plan_events_insert on study_plan_events;
create policy iah_app_study_plan_events_insert on study_plan_events for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_reaches_study_plan(plan_id, true)
    and actor_user_id = public.iah_actor_user()
  );

-- Reversão manual (só se nenhum diagnóstico ou plano tiver sido gravado):
--   drop table study_plan_events, study_plan_items, study_plans, diagnostic_blocks, diagnostics;
--   drop function public.iah_reaches_study_plan(text, boolean), public.iah_check_study_plan_event(),
--     public.iah_check_study_plan_item(), public.iah_check_study_plan(), public.iah_teaches_diagnostic(text),
--     public.iah_reaches_diagnostic(text), public.iah_refresh_diagnostic_flags(),
--     public.iah_check_diagnostic_block(), public.iah_check_diagnostic(), public.iah_diagnostic_flags(text);
--   alter table content_sources drop column synthetic;
