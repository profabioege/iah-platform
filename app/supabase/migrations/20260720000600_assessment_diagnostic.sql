-- ============================================================
-- IAH Educacional — Migration 0006: Sondagem diagnóstica
-- Templates versionados, publicação por turma, prazos, respostas,
-- correção supervisionada e liberação coletiva.
-- Nenhum dado demonstrativo é inserido nesta migration.
-- ============================================================

create table lesson_assessments (
  id              text primary key,
  institution_id  text not null references institutions (id),
  author_id       text not null references users (id),
  title           text not null,
  instructions    text not null default '',
  kind            text not null default 'diagnostic' check (kind = 'diagnostic'),
  lesson_id       text references lessons (id),
  mission_id      text references missions (id),
  competency_ids  jsonb not null default '[]'::jsonb,
  version         integer not null default 1 check (version > 0),
  status          text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (num_nonnulls(lesson_id, mission_id) <= 1)
);
create index lesson_assessments_institution_idx on lesson_assessments (institution_id);
create index lesson_assessments_lesson_idx on lesson_assessments (lesson_id);
create index lesson_assessments_mission_idx on lesson_assessments (mission_id);

create table assessment_questions (
  id              text primary key,
  institution_id  text not null references institutions (id),
  assessment_id   text not null references lesson_assessments (id) on delete cascade,
  position        integer not null check (position between 1 and 5),
  question_type   text not null
    check (question_type in ('multiple_choice', 'true_false', 'essay')),
  prompt          text not null,
  points          numeric(6,2) not null check (points >= 0),
  options         jsonb not null default '[]'::jsonb,
  correct_answer  jsonb,
  justification   text not null default '',
  rubric          jsonb not null default '[]'::jsonb,
  unique (assessment_id, position)
);
create index assessment_questions_institution_idx on assessment_questions (institution_id);
create index assessment_questions_assessment_idx on assessment_questions (assessment_id);

create table assessment_assignments (
  id                        text primary key,
  institution_id            text not null references institutions (id),
  classroom_id              text not null references classrooms (id),
  assessment_id             text not null references lesson_assessments (id),
  starts_at                 timestamptz not null,
  ends_at                   timestamptz not null,
  timezone                  text not null,
  allow_late_submission     boolean not null default false,
  auto_correction_enabled   boolean not null default true,
  answer_key_policy         text not null default 'manual'
    check (answer_key_policy in ('after_submission', 'after_end', 'scheduled', 'manual', 'never')),
  answer_key_release_at     timestamptz,
  publication_status        text not null default 'draft'
    check (publication_status in ('draft', 'published', 'archived')),
  published_at              timestamptz,
  results_released_at       timestamptz,
  results_released_by       text references users (id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (ends_at > starts_at),
  check (answer_key_policy <> 'scheduled' or answer_key_release_at is not null)
);
create index assessment_assignments_institution_idx on assessment_assignments (institution_id);
create index assessment_assignments_classroom_idx on assessment_assignments (classroom_id);
create index assessment_assignments_assessment_idx on assessment_assignments (assessment_id);

create table assessment_deadline_extensions (
  id                text primary key,
  institution_id    text not null references institutions (id),
  assignment_id     text not null references assessment_assignments (id) on delete cascade,
  student_id        text references students (id),
  original_ends_at  timestamptz not null,
  new_ends_at       timestamptz not null,
  reason            text,
  created_by        text not null references users (id),
  created_at        timestamptz not null default now(),
  check (new_ends_at > original_ends_at)
);
create index assessment_extensions_institution_idx on assessment_deadline_extensions (institution_id);
create index assessment_extensions_assignment_idx on assessment_deadline_extensions (assignment_id);
create index assessment_extensions_student_idx on assessment_deadline_extensions (student_id);

create table assessment_submissions (
  id                text primary key,
  institution_id    text not null references institutions (id),
  assignment_id     text not null references assessment_assignments (id) on delete cascade,
  student_id        text not null references students (id),
  status            text not null default 'draft'
    check (status in ('draft', 'submitted', 'validated')),
  auto_score        numeric(7,2),
  final_score       numeric(7,2),
  auto_feedback     text,
  teacher_feedback  text,
  started_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  validated_at      timestamptz,
  validated_by      text references users (id),
  reopened_at       timestamptz,
  updated_at        timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index assessment_submissions_institution_idx on assessment_submissions (institution_id);
create index assessment_submissions_assignment_idx on assessment_submissions (assignment_id);
create index assessment_submissions_student_idx on assessment_submissions (student_id);

create table assessment_answers (
  id                text primary key,
  institution_id    text not null references institutions (id),
  submission_id     text not null references assessment_submissions (id) on delete cascade,
  question_id       text not null references assessment_questions (id),
  answer_value      jsonb,
  auto_score        numeric(6,2),
  final_score       numeric(6,2),
  auto_feedback     text,
  teacher_feedback  text,
  flagged           boolean not null default false,
  unique (submission_id, question_id)
);
create index assessment_answers_institution_idx on assessment_answers (institution_id);
create index assessment_answers_submission_idx on assessment_answers (submission_id);

-- A aplicação acessa o banco apenas pelo servidor com service role.
-- Sem políticas permissivas, anon/authenticated permanecem deny-by-default.
alter table lesson_assessments              enable row level security;
alter table assessment_questions            enable row level security;
alter table assessment_assignments          enable row level security;
alter table assessment_deadline_extensions  enable row level security;
alter table assessment_submissions          enable row level security;
alter table assessment_answers              enable row level security;

-- Rollback manual, na ordem das dependências:
-- drop table assessment_answers;
-- drop table assessment_submissions;
-- drop table assessment_deadline_extensions;
-- drop table assessment_assignments;
-- drop table assessment_questions;
-- drop table lesson_assessments;
