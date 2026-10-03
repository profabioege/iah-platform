-- ============================================================
-- IAH Educacional — Migration 0015: índices cobrindo FKs quentes no
-- ensaio de carga do piloto Beryon (27/09).
--
-- Causa: o ensaio de 45 alunos (leituraMissao/gravacao) reprovou por
-- LATÊNCIA (nao mais por erro -- erros=0 apos a correcao de
-- mission-id e do stub Knowledge Engine, ver
-- docs/operations/retomada-homologacao.md):
--   p95LeituraMissaoMs: 1798ms (limite 1000ms)
--   p95GravacaoMs:      3191ms (limite 1500ms)
--
-- `mcp__Supabase__get_advisors` (performance) apontou 19 foreign keys
-- sem índice de cobertura. Esta migration cria APENAS os índices das
-- FKs realmente exercitadas pelos caminhos de leitura/gravação deste
-- ensaio (RLS -- iah_reaches_classroom/iah_enrolled/iah_teaches --
-- e os inserts de producao/reflexao/progresso): nao inclui as FKs de
-- knowledge_* nem iah_jobs, que este ensaio nao exercita.
--
-- Reversível (DROP INDEX). Não altera RLS, políticas, grants ou
-- dados -- apenas acelera os JOINs/lookups já existentes.
-- ============================================================

create index if not exists mission_assignments_lesson_id_idx
  on mission_assignments (lesson_id);

create index if not exists mission_assignments_mission_id_idx
  on mission_assignments (mission_id);

create index if not exists mission_progress_mission_id_idx
  on mission_progress (mission_id);

create index if not exists mission_progress_student_id_idx
  on mission_progress (student_id);

create index if not exists productions_mission_id_idx
  on productions (mission_id);

create index if not exists reflections_mission_id_idx
  on reflections (mission_id);

create index if not exists enrollments_student_id_idx
  on enrollments (student_id);

create index if not exists classroom_teachers_teacher_id_idx
  on classroom_teachers (teacher_id);

create index if not exists teachers_user_id_idx
  on teachers (user_id);

create index if not exists mission_reviews_mission_id_idx
  on mission_reviews (mission_id);

create index if not exists mission_reviews_student_id_idx
  on mission_reviews (student_id);

create index if not exists mission_reviews_reviewer_id_idx
  on mission_reviews (reviewer_id);
