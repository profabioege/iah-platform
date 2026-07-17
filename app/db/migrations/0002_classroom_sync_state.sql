-- ============================================================
-- IAH Educacional — Migration 0002: estado de sincronização de Turmas
-- Ver docs/GOOGLE_CLASSROOM_INTEGRATION.md.
--
-- Mesmas regras da 0001: multi-tenant por institution_id, nenhum INSERT
-- (dados de demonstração vivem em modules/platform/seeds, em memória).
--
-- Uma Turma criada manualmente simplesmente não tem linha aqui — o
-- estado de sincronização vive AO LADO da Turma, não dentro dela.
-- ============================================================

create table classroom_sync_states (
  id                 text primary key,
  institution_id     text not null references institutions (id),
  classroom_id       text not null references classrooms (id),
  provider           text not null check (provider in ('manual', 'csv', 'google', 'microsoft', 'moodle', 'api')),
  -- Id da turma na origem (ex.: courseId do Google Classroom)
  external_course_id text not null,
  status             text not null default 'never_synced' check (status in ('never_synced', 'synced', 'out_of_date', 'failed')),
  last_sync_at       timestamptz,
  student_count      integer not null default 0,
  assignment_count   integer not null default 0,
  last_error         text,
  unique (institution_id, provider, external_course_id)
);
create index classroom_sync_states_institution_idx on classroom_sync_states (institution_id);
create index classroom_sync_states_classroom_idx on classroom_sync_states (classroom_id);
