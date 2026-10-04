-- ============================================================
-- IAH Educacional — Migration 0019: Circuito adaptativo por habilidade
--
-- Ver DECISIONS.md D-051 e docs/reformulacao/04-circuito-adaptativo.md.
--
-- Escolhas do Founder (03/10/2026): modo HÍBRIDO (reforço na mesma
-- habilidade é automático; avançar de habilidade exige o professor),
-- ritmo CONTÍNUO (terminou a rodada, pode pedir a próxima), erro típico
-- por alternativa fica para depois.
--
-- 1. RODADA = lista curta pessoal (`practice_lists.kind = 'circuito'`,
--    com `target_student_id` e `target_skill_id`; listas do professor
--    também guardam a habilidade-alvo escolhida). Reaproveita tudo da
--    0017/0018: correção no banco, gabarito só depois da entrega, figuras,
--    catálogo IAH. Só o próprio aluno alcança a rodada dele.
-- 2. CIRCUITO da turma (`adaptive_circuits`), ligado pelo professor.
-- 3. LIBERAÇÕES (`adaptive_unlocks`): o professor libera cada habilidade
--    para cada aluno (registro permanente). É a trava do "híbrido".
-- 4. `iah_circuit_next_round`: o aluno pede a rodada; o BANCO escolhe as
--    questões (o aluno não enxerga o banco), conferindo: circuito ativo,
--    aluno da turma, habilidade liberada para ele e no planejamento da
--    turma, só versões APROVADAS (da escola ou do catálogo) com vínculo
--    OFICIAL ou CONFIRMADO por revisão humana (sugestão não revisada não
--    entra em rodada automática), nunca uma questão que o aluno já viu.
--    Rodada aberta é devolvida em vez de criar outra (idempotente).
--
-- Nenhuma nota nem proficiência é gravada: o estado por habilidade é
-- calculado na aplicação, por regra explícita, a partir das respostas.
-- Só adições; nenhum dado inserido; nenhum DELETE para `iah_app`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rodada como lista pessoal
-- ------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.practice_lists'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.practice_lists drop constraint %I', c.conname);
  end loop;
end $$;
alter table practice_lists add constraint practice_lists_kind_check
  check (kind in ('diagnostica', 'periodica', 'revisao', 'circuito'));

alter table practice_lists add column if not exists target_student_id text references students (id);
alter table practice_lists add column if not exists target_skill_id text references curriculum_skills (id);
do $$ begin
  alter table practice_lists add constraint practice_lists_circuit_target_check
    check ((kind = 'circuito') = (target_student_id is not null)
           and (kind <> 'circuito' or target_skill_id is not null));
exception when duplicate_object then null; end $$;
create index if not exists practice_lists_target_student_idx on practice_lists (target_student_id) where target_student_id is not null;
create index if not exists practice_lists_target_skill_idx on practice_lists (target_skill_id) where target_skill_id is not null;

-- Rodada só nasce pela função do circuito; alvo nunca muda. Lista do
-- professor também pode registrar a habilidade-alvo (a que ele escolheu
-- na tela), usada como evidência do circuito.
create or replace function public.iah_check_circuit_list() returns trigger
language plpgsql security definer set search_path = public
as $$
declare sk record;
begin
  if new.target_skill_id is not null then
    select institution_id into sk from curriculum_skills where id = new.target_skill_id;
    if sk.institution_id is not null and sk.institution_id <> new.institution_id then
      raise exception 'Habilidade de outra instituição.' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'INSERT' and new.kind = 'circuito' and not public.iah_trusted() then
    raise exception 'Rodada do circuito só é criada pelo próprio circuito.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (
       new.target_student_id is distinct from old.target_student_id
    or new.target_skill_id is distinct from old.target_skill_id
    or (new.kind = 'circuito') <> (old.kind = 'circuito')
  ) then
    raise exception 'Alvo da rodada não muda.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists practice_lists_circuit_check on practice_lists;
create trigger practice_lists_circuit_check before insert or update on practice_lists
  for each row execute function public.iah_check_circuit_list();
revoke all on function public.iah_check_circuit_list() from public;

-- O aluno alcança a lista: além da 0017, rodada só do próprio aluno.
create or replace function public.iah_student_reaches_list(target_list text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from practice_lists l
     where l.id = target_list
       and l.institution_id = public.iah_actor_institution()
       and l.status in ('publicada', 'encerrada')
       and public.iah_enrolled(l.classroom_id)
       and (l.target_student_id is null or l.target_student_id = public.iah_actor_student())
  );
$$;

drop policy if exists iah_app_lists_read on practice_lists;
create policy iah_app_lists_read on practice_lists for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
      or (status in ('publicada', 'encerrada') and public.iah_enrolled(classroom_id)
          and (target_student_id is null or target_student_id = public.iah_actor_student()))
    )
  );

-- ------------------------------------------------------------
-- 2. Circuito da turma e liberações
-- ------------------------------------------------------------
create table if not exists adaptive_circuits (
  id              text primary key,
  institution_id  text not null references institutions (id),
  classroom_id    text not null references classrooms (id),
  round_size      integer not null default 3 check (round_size between 2 and 5),
  status          text not null default 'ativo' check (status in ('ativo', 'pausado')),
  created_by      text not null references users (id),
  created_at      timestamptz not null default now(),
  unique (classroom_id),
  unique (id, institution_id)
);
create index if not exists adaptive_circuits_institution_idx on adaptive_circuits (institution_id);
create index if not exists adaptive_circuits_created_by_idx on adaptive_circuits (created_by);

create table if not exists adaptive_unlocks (
  id              text primary key,
  institution_id  text not null,
  circuit_id      text not null,
  student_id      text not null references students (id),
  skill_id        text not null references curriculum_skills (id),
  reason          text not null check (reason in ('inicio', 'avanco')),
  unlocked_by     text not null references users (id),
  unlocked_at     timestamptz not null default now(),
  unique (circuit_id, student_id, skill_id),
  foreign key (circuit_id, institution_id) references adaptive_circuits (id, institution_id)
);
create index if not exists adaptive_unlocks_institution_idx on adaptive_unlocks (institution_id);
create index if not exists adaptive_unlocks_student_idx on adaptive_unlocks (student_id);
create index if not exists adaptive_unlocks_skill_idx on adaptive_unlocks (skill_id);
create index if not exists adaptive_unlocks_unlocked_by_idx on adaptive_unlocks (unlocked_by);

-- Habilidade está no planejamento da turma (ano letivo + série; turma sem
-- série aceita qualquer série do ano)? Devolve o componente planejado.
create or replace function public.iah_planned_component(target_classroom text, target_skill text)
returns text language sql stable security definer set search_path = public
as $$
  select p.component_id
    from school_curriculum_plans p
    join classrooms cl on cl.id = target_classroom
   where p.institution_id = cl.institution_id
     and p.academic_year_id = cl.academic_year_id
     and p.skill_id = target_skill
     and (cl.grade_code is null or p.grade_code = cl.grade_code)
   order by p.period_order
   limit 1;
$$;
revoke all on function public.iah_planned_component(text, text) from public;
revoke execute on function public.iah_planned_component(text, text) from anon, authenticated;

create or replace function public.iah_check_adaptive_circuit() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from classrooms where id = new.classroom_id and institution_id = new.institution_id) then
    raise exception 'Turma de outra instituição.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.classroom_id <> old.classroom_id or new.institution_id <> old.institution_id
                           or new.created_by <> old.created_by) then
    raise exception 'Turma e autoria do circuito não mudam.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists adaptive_circuits_check on adaptive_circuits;
create trigger adaptive_circuits_check before insert or update on adaptive_circuits
  for each row execute function public.iah_check_adaptive_circuit();
revoke all on function public.iah_check_adaptive_circuit() from public;

create or replace function public.iah_check_adaptive_unlock() returns trigger
language plpgsql security definer set search_path = public
as $$
declare c record;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Liberação é registro permanente.' using errcode = '42501';
  end if;
  select classroom_id into c from adaptive_circuits where id = new.circuit_id and institution_id = new.institution_id;
  if not exists (
    select 1 from enrollments e
     where e.classroom_id = c.classroom_id and e.student_id = new.student_id and e.status = 'active'
  ) then
    raise exception 'Aluno fora da turma do circuito.' using errcode = '42501';
  end if;
  if public.iah_planned_component(c.classroom_id, new.skill_id) is null then
    raise exception 'Habilidade fora do planejamento da turma.' using errcode = '23514';
  end if;
  new.unlocked_at := now();
  return new;
end;
$$;
drop trigger if exists adaptive_unlocks_check on adaptive_unlocks;
create trigger adaptive_unlocks_check before insert or update on adaptive_unlocks
  for each row execute function public.iah_check_adaptive_unlock();
revoke all on function public.iah_check_adaptive_unlock() from public;

create or replace function public.iah_teaches_circuit(target_circuit text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from adaptive_circuits c
     where c.id = target_circuit
       and c.institution_id = public.iah_actor_institution()
       and public.iah_teaches(c.classroom_id)
  );
$$;
create or replace function public.iah_staff_reaches_circuit(target_circuit text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from adaptive_circuits c
     where c.id = target_circuit
       and c.institution_id = public.iah_actor_institution()
       and public.iah_is_staff()
       and public.iah_reaches_classroom(c.classroom_id)
  );
$$;
revoke all on function public.iah_teaches_circuit(text) from public;
revoke all on function public.iah_staff_reaches_circuit(text) from public;
revoke execute on function public.iah_teaches_circuit(text) from anon, authenticated;
revoke execute on function public.iah_staff_reaches_circuit(text) from anon, authenticated;
grant execute on function public.iah_teaches_circuit(text) to iah_app;
grant execute on function public.iah_staff_reaches_circuit(text) to iah_app;

-- ------------------------------------------------------------
-- 3. Próxima rodada (o aluno pede; o banco escolhe e confere)
-- ------------------------------------------------------------
create or replace function public.iah_circuit_next_round(p_circuit text, p_skill text, p_level text default 'regular')
returns text language plpgsql security definer set search_path = public
as $$
declare
  st      text := public.iah_actor_student();
  c       record;
  comp    text;
  aberta  text;
  ids     text[];
  codigo  text;
  provis  boolean;
  n       integer;
  lista   text;
begin
  if public.iah_actor_role() <> 'aluno' or st is null then
    raise exception 'Apenas alunos pedem rodadas do circuito.' using errcode = '42501';
  end if;
  if p_level not in ('apoio', 'regular', 'desafio') then
    raise exception 'Nível de rodada inválido.' using errcode = '22023';
  end if;
  select * into c from adaptive_circuits where id = p_circuit and institution_id = public.iah_actor_institution();
  if not found or not public.iah_enrolled(c.classroom_id) then
    raise exception 'Circuito fora do seu alcance.' using errcode = '42501';
  end if;
  if c.status <> 'ativo' then
    raise exception 'O circuito da turma está pausado.' using errcode = '23514';
  end if;

  -- Rodada ainda não entregue: devolve a mesma (o aluno termina antes).
  select l.id into aberta
    from practice_lists l
   where l.kind = 'circuito' and l.target_student_id = st and l.classroom_id = c.classroom_id
     and l.status = 'publicada'
     and not exists (select 1 from list_attempts a where a.list_id = l.id and a.status = 'entregue')
   order by l.created_at desc
   limit 1;
  if aberta is not null then
    return aberta;
  end if;

  if not exists (
    select 1 from adaptive_unlocks u where u.circuit_id = c.id and u.student_id = st and u.skill_id = p_skill
  ) then
    raise exception 'Habilidade ainda não liberada pelo professor.' using errcode = '42501';
  end if;
  comp := public.iah_planned_component(c.classroom_id, p_skill);
  if comp is null then
    raise exception 'Habilidade fora do planejamento da turma.' using errcode = '23514';
  end if;

  select array_agg(x.id order by x.ordem, x.sorteio) into ids
    from (
      select v.id,
             case p_level
               when 'apoio'   then case v.editorial_difficulty when 'facil' then 0 when 'media' then 1 when 'dificil' then 3 else 2 end
               when 'desafio' then case v.editorial_difficulty when 'dificil' then 0 when 'media' then 1 when 'facil' then 3 else 2 end
               else                case v.editorial_difficulty when 'media' then 0 when 'facil' then 1 when 'dificil' then 1 else 2 end
             end as ordem,
             md5(st || ':' || v.id) as sorteio
        from question_versions v
        join questions q on q.id = v.question_id
       where v.status = 'aprovada'
         and q.retired_at is null
         and (v.institution_id = c.institution_id or public.iah_is_catalog(v.institution_id))
         and (
           q.skill_id = p_skill
           or exists (
             select 1 from question_skill_suggestions s
              where s.question_id = q.id and s.skill_id = p_skill and s.status = 'confirmada'
           )
         )
         -- Nunca uma questão (em qualquer versão) que o aluno já recebeu.
         and not exists (
           select 1
             from practice_list_items i
             join question_versions v2 on v2.id = i.question_version_id
             join practice_lists l on l.id = i.list_id
            where v2.question_id = q.id
              and (l.target_student_id = st
                   or exists (select 1 from list_attempts a where a.list_id = l.id and a.student_id = st))
         )
       order by ordem, sorteio
       limit c.round_size
    ) x;

  if ids is null or array_length(ids, 1) = 0 then
    raise exception 'Sem questões novas aprovadas para esta habilidade — o professor precisa ampliar o banco.'
      using errcode = 'P0002', hint = 'banco_esgotado';
  end if;

  select code into codigo from curriculum_skills where id = p_skill;
  select not exists (
    select 1 from school_curriculum_plans p join classrooms cl on cl.id = c.classroom_id
     where p.institution_id = cl.institution_id and p.academic_year_id = cl.academic_year_id
       and p.skill_id = p_skill and p.status = 'approved'
       and (cl.grade_code is null or p.grade_code = cl.grade_code)
  ) into provis;
  select count(*) + 1 into n from practice_lists
   where kind = 'circuito' and target_student_id = st and classroom_id = c.classroom_id;
  lista := 'circ:' || c.id || ':' || st || ':' || n;

  perform set_config('iah.trusted', 'on', true);
  insert into practice_lists (id, institution_id, classroom_id, component_id, kind, title, instructions,
                              curriculum_provisional, created_by, target_student_id, target_skill_id)
  values (lista, c.institution_id, c.classroom_id, comp, 'circuito',
          'Circuito · ' || codigo || ' · rodada ' || n,
          'Rodada do circuito adaptativo. Ao entregar, você vê a correção e a resolução.',
          provis, public.iah_actor_user(), st, p_skill);
  insert into practice_list_items (id, institution_id, list_id, position, question_version_id)
  select lista || ':' || ord, c.institution_id, lista, ord, vid
    from unnest(ids) with ordinality as t(vid, ord);
  update practice_lists set status = 'publicada' where id = lista;
  perform set_config('iah.trusted', '', true);
  return lista;
end;
$$;
revoke all on function public.iah_circuit_next_round(text, text, text) from public;
revoke execute on function public.iah_circuit_next_round(text, text, text) from anon, authenticated;
grant execute on function public.iah_circuit_next_round(text, text, text) to iah_app;

-- ------------------------------------------------------------
-- 4. RLS e grants
-- ------------------------------------------------------------
alter table adaptive_circuits enable row level security;
alter table adaptive_unlocks  enable row level security;

revoke all on adaptive_circuits, adaptive_unlocks from anon, authenticated;
grant select, insert, update, delete on adaptive_circuits, adaptive_unlocks to service_role;
grant select, insert, update on adaptive_circuits to iah_app;
grant select, insert on adaptive_unlocks to iah_app;

drop policy if exists iah_app_circuits_read on adaptive_circuits;
create policy iah_app_circuits_read on adaptive_circuits for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and ((public.iah_is_staff() and public.iah_reaches_classroom(classroom_id)) or public.iah_enrolled(classroom_id))
  );

drop policy if exists iah_app_circuits_insert on adaptive_circuits;
create policy iah_app_circuits_insert on adaptive_circuits for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
    and created_by = public.iah_actor_user()
  );

drop policy if exists iah_app_circuits_update on adaptive_circuits;
create policy iah_app_circuits_update on adaptive_circuits for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  )
  with check (institution_id = public.iah_actor_institution() and public.iah_teaches(classroom_id));

drop policy if exists iah_app_unlocks_read on adaptive_unlocks;
create policy iah_app_unlocks_read on adaptive_unlocks for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (student_id = public.iah_actor_student() or public.iah_staff_reaches_circuit(circuit_id))
  );

drop policy if exists iah_app_unlocks_insert on adaptive_unlocks;
create policy iah_app_unlocks_insert on adaptive_unlocks for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches_circuit(circuit_id)
    and unlocked_by = public.iah_actor_user()
  );
