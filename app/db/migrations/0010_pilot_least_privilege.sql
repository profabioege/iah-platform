-- ============================================================
-- IAH Educacional — Migration 0010: menor privilégio do piloto
--
-- Contexto (auditoria de 18/09/2026): até aqui TODA consulta do servidor
-- usava a `service_role`, que ignora RLS. As 31 tabelas tinham RLS
-- habilitado e ZERO policies — ou seja, negavam por padrão para anon e
-- authenticated, mas o caminho real da aplicação passava por cima. O
-- isolamento entre escolas dependia exclusivamente do filtro por
-- `institution_id` no código.
--
-- Esta migration cria a camada que faltava, compatível com a
-- autenticação que existe (Auth.js Credentials — NÃO Supabase Auth, logo
-- `auth.uid()` não reconhece ninguém aqui):
--
--   Auth.js (sessão JWT do Next) → claims do ator → JWT curto assinado
--   com o segredo do PostgREST → PostgREST assume o papel `iah_app` →
--   policies leem `request.jwt.claims` → banco decide.
--
-- A `service_role` continua existindo, mas passa a ser exclusiva de
-- operações administrativas (autenticação, provisionamento, recuperação
-- assistida). As telas e ações pedagógicas usam `iah_app`.
--
-- `iah_app` NÃO recebe delete em nenhuma tabela, NÃO enxerga `users`,
-- `profiles` nem `iah_jobs`, e só lê/escreve dentro da instituição
-- declarada na claim — que vem da sessão, nunca do cliente.
--
-- Idempotente: papéis, funções e policies são recriados sem erro.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Papel da aplicação
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'iah_app') then
    create role iah_app nologin;
  end if;
end $$;

grant usage on schema public to iah_app;

-- ------------------------------------------------------------
-- 2. Leitura das claims (o que o banco sabe sobre o ator)
--
-- `request.jwt.claims` é preenchido pelo PostgREST a partir do JWT.
-- `true` no segundo argumento de current_setting evita erro quando a
-- sessão não tem claims (ex.: psql administrativo) — nesse caso as
-- funções devolvem NULL e as policies negam.
-- ------------------------------------------------------------
create or replace function public.iah_claim(claim text)
returns text
language sql
stable
as $$
  select nullif(
    coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> claim,
    ''
  );
$$;

create or replace function public.iah_actor_institution() returns text
language sql stable as $$ select public.iah_claim('institution_id'); $$;

create or replace function public.iah_actor_role() returns text
language sql stable as $$ select public.iah_claim('actor_role'); $$;

create or replace function public.iah_actor_student() returns text
language sql stable as $$ select public.iah_claim('student_id'); $$;

create or replace function public.iah_actor_teacher() returns text
language sql stable as $$ select public.iah_claim('teacher_id'); $$;

-- Vínculo professor↔turma conferido NO BANCO, não na claim: a claim diz
-- quem é o professor; quais turmas são dele é fato do banco. `security
-- definer` evita recursão de policy (a policy de `classrooms` não pode
-- depender de uma consulta que passe pela própria policy).
create or replace function public.iah_teaches(target_classroom text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from classroom_teachers ct
     where ct.classroom_id = target_classroom
       and ct.teacher_id = public.iah_actor_teacher()
       and ct.institution_id = public.iah_actor_institution()
  );
$$;

create or replace function public.iah_enrolled(target_classroom text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from enrollments e
     where e.classroom_id = target_classroom
       and e.student_id = public.iah_actor_student()
       and e.institution_id = public.iah_actor_institution()
       and e.status = 'active'
  );
$$;

-- O ator alcança a turma? (gestor: toda a instituição; professor: as
-- suas; aluno: aquelas em que está matriculado.)
create or replace function public.iah_reaches_classroom(target_classroom text)
returns boolean
language sql
stable
as $$
  select case public.iah_actor_role()
    when 'administrador' then true
    when 'admin_iah'     then true
    when 'professor'     then public.iah_teaches(target_classroom)
    when 'aluno'         then public.iah_enrolled(target_classroom)
    else false
  end;
$$;

create or replace function public.iah_is_staff() returns boolean
language sql stable as $$
  select public.iah_actor_role() in ('professor', 'administrador', 'admin_iah');
$$;

revoke all on function public.iah_claim(text) from public;
revoke all on function public.iah_actor_institution() from public;
revoke all on function public.iah_actor_role() from public;
revoke all on function public.iah_actor_student() from public;
revoke all on function public.iah_actor_teacher() from public;
revoke all on function public.iah_teaches(text) from public;
revoke all on function public.iah_enrolled(text) from public;
revoke all on function public.iah_reaches_classroom(text) from public;
revoke all on function public.iah_is_staff() from public;

grant execute on function public.iah_claim(text) to iah_app;
grant execute on function public.iah_actor_institution() to iah_app;
grant execute on function public.iah_actor_role() to iah_app;
grant execute on function public.iah_actor_student() to iah_app;
grant execute on function public.iah_actor_teacher() to iah_app;
grant execute on function public.iah_teaches(text) to iah_app;
grant execute on function public.iah_enrolled(text) to iah_app;
grant execute on function public.iah_reaches_classroom(text) to iah_app;
grant execute on function public.iah_is_staff() to iah_app;

-- ------------------------------------------------------------
-- 3. Grants: só o necessário para o percurso do piloto.
--    Nenhum DELETE. Nenhum acesso a users/profiles/iah_jobs.
-- ------------------------------------------------------------
grant select on institutions, academic_years, subjects, classrooms,
                classroom_teachers, students, enrollments, missions to iah_app;

grant select, insert, update on lessons, mission_assignments,
                                mission_progress, productions,
                                reflections, mission_reviews to iah_app;

-- ------------------------------------------------------------
-- 4. Policies — tudo ancorado na instituição da claim
-- ------------------------------------------------------------
drop policy if exists iah_app_institutions_read on institutions;
create policy iah_app_institutions_read on institutions for select to iah_app
  using (id = public.iah_actor_institution());

drop policy if exists iah_app_academic_years_read on academic_years;
create policy iah_app_academic_years_read on academic_years for select to iah_app
  using (institution_id = public.iah_actor_institution());

drop policy if exists iah_app_subjects_read on subjects;
create policy iah_app_subjects_read on subjects for select to iah_app
  using (institution_id = public.iah_actor_institution());

drop policy if exists iah_app_missions_read on missions;
create policy iah_app_missions_read on missions for select to iah_app
  using (true); -- catálogo do produto, sem institution_id (migration 0001)

drop policy if exists iah_app_classrooms_read on classrooms;
create policy iah_app_classrooms_read on classrooms for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_reaches_classroom(id)
  );

drop policy if exists iah_app_classroom_teachers_read on classroom_teachers;
create policy iah_app_classroom_teachers_read on classroom_teachers for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (public.iah_is_staff() or public.iah_enrolled(classroom_id))
  );

-- Aluno enxerga apenas a própria matrícula; equipe, as das turmas que alcança.
drop policy if exists iah_app_enrollments_read on enrollments;
create policy iah_app_enrollments_read on enrollments for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      student_id = public.iah_actor_student()
      or (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
    )
  );

-- Aluno enxerga apenas o próprio cadastro (nome de colega não é dado dele).
drop policy if exists iah_app_students_read on students;
create policy iah_app_students_read on students for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      id = public.iah_actor_student()
      or (
        public.iah_is_staff()
        and exists (
          select 1 from enrollments e
           where e.student_id = students.id
             and e.institution_id = students.institution_id
             and public.iah_reaches_classroom(e.classroom_id)
        )
      )
    )
  );

drop policy if exists iah_app_lessons_read on lessons;
create policy iah_app_lessons_read on lessons for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_reaches_classroom(classroom_id)
  );

drop policy if exists iah_app_lessons_write on lessons;
create policy iah_app_lessons_write on lessons for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  );

drop policy if exists iah_app_lessons_update on lessons;
create policy iah_app_lessons_update on lessons for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  )
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_teaches(classroom_id)
  );

drop policy if exists iah_app_assignments_read on mission_assignments;
create policy iah_app_assignments_read on mission_assignments for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_reaches_classroom(classroom_id)
  );

drop policy if exists iah_app_assignments_insert on mission_assignments;
create policy iah_app_assignments_insert on mission_assignments for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  );

drop policy if exists iah_app_assignments_update on mission_assignments;
create policy iah_app_assignments_update on mission_assignments for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  )
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_teaches(classroom_id)
  );

-- ------------------------------------------------------------
-- 5. Trabalho do aluno: dele, sempre escopado por turma alcançada
-- ------------------------------------------------------------
drop policy if exists iah_app_progress_read on mission_progress;
create policy iah_app_progress_read on mission_progress for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      student_id = public.iah_actor_student()
      or (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
    )
  );

drop policy if exists iah_app_progress_insert on mission_progress;
create policy iah_app_progress_insert on mission_progress for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
    and public.iah_enrolled(classroom_id)
  );

drop policy if exists iah_app_progress_update on mission_progress;
create policy iah_app_progress_update on mission_progress for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
  )
  with check (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
  );

-- A devolutiva do professor move o progresso do aluno para "avaliado"
-- (learning-cycle-service). Por isso o professor da turma também escreve
-- aqui — restrito à própria turma, e só ele: aluno segue limitado às
-- próprias linhas, gestor não escreve nada.
drop policy if exists iah_app_progress_staff_insert on mission_progress;
create policy iah_app_progress_staff_insert on mission_progress for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  );

drop policy if exists iah_app_progress_staff_update on mission_progress;
create policy iah_app_progress_staff_update on mission_progress for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  )
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_teaches(classroom_id)
  );

drop policy if exists iah_app_productions_read on productions;
create policy iah_app_productions_read on productions for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      student_id = public.iah_actor_student()
      or (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
    )
  );

drop policy if exists iah_app_productions_insert on productions;
create policy iah_app_productions_insert on productions for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
    and public.iah_enrolled(classroom_id)
  );

drop policy if exists iah_app_productions_update on productions;
create policy iah_app_productions_update on productions for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
  )
  with check (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
  );

-- Reflexão é do aluno (docs/02_PRODUCT_PRINCIPLES.md): a equipe só lê o
-- que o produto marcou como compartilhado com o professor.
drop policy if exists iah_app_reflections_read on reflections;
create policy iah_app_reflections_read on reflections for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      student_id = public.iah_actor_student()
      or (
        public.iah_is_staff()
        and public.iah_reaches_classroom(classroom_id)
        and visibility = 'shared_with_teacher'
      )
    )
  );

drop policy if exists iah_app_reflections_insert on reflections;
create policy iah_app_reflections_insert on reflections for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
    and public.iah_enrolled(classroom_id)
  );

drop policy if exists iah_app_reflections_update on reflections;
create policy iah_app_reflections_update on reflections for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
  )
  with check (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
  );

-- Devolutiva: escreve só o professor da turma; o aluno lê a sua.
drop policy if exists iah_app_reviews_read on mission_reviews;
create policy iah_app_reviews_read on mission_reviews for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      student_id = public.iah_actor_student()
      or (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
    )
  );

drop policy if exists iah_app_reviews_insert on mission_reviews;
create policy iah_app_reviews_insert on mission_reviews for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  );

drop policy if exists iah_app_reviews_update on mission_reviews;
create policy iah_app_reviews_update on mission_reviews for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  )
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_teaches(classroom_id)
  );
