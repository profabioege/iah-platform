-- ============================================================
-- IAH Educacional — Migration 0014: grant/policy faltante em `teachers`
-- para o papel de menor privilégio `iah_app` (migration 0010 concedeu
-- select em institutions/academic_years/subjects/classrooms/
-- classroom_teachers/students/enrollments/missions, mas esqueceu a
-- tabela `teachers` propriamente dita — só a tabela de vínculo
-- classroom_teachers foi liberada). Sem isso, toda leitura de
-- `teachers.listByInstitution` (tela /gestor) falha com
-- "permission denied for table teachers" — erro de GRANT, anterior a
-- qualquer policy de RLS (confirmado em .homolog-run-server.log).
--
-- Mesma regra já usada para students_read: só quem é staff da própria
-- instituição enxerga o roster (iah_is_staff() já inclui professor,
-- administrador e admin_iah — mesmo padrão do restante da migration
-- 0010; hoje só a tela do gestor lê esta tabela).
-- ============================================================

grant select on teachers to iah_app;

drop policy if exists iah_app_teachers_read on teachers;
create policy iah_app_teachers_read on teachers for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_is_staff()
  );
