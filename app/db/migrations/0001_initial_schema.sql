-- ============================================================
-- IAH Educacional — Migration 0001: schema inicial multi-tenant
-- Banco alvo: PostgreSQL (Supabase). Ver docs/PERSISTENCE.md.
--
-- REGRAS:
--  * Toda tabela operacional carrega institution_id (isolamento
--    lógico por tenant — não há bancos separados por escola).
--  * NENHUM dado é inserido aqui. Seeds de demonstração vivem em
--    app/src/modules/platform/seeds/ e nunca entram no banco real.
--  * Indicadores NÃO têm tabela: são projeção calculada
--    (docs/DOMAIN_MODEL.md), nunca fonte de verdade.
--  * RLS (Row Level Security) será ativada junto com a autenticação
--    real (políticas dependem de haver usuários autenticados).
-- ============================================================

create table institutions (
  id          text primary key,
  name        text not null,
  status      text not null default 'active' check (status in ('active', 'suspended')),
  created_at  timestamptz not null default now()
);

create table academic_years (
  id              text primary key,
  institution_id  text not null references institutions (id),
  label           text not null,
  starts_on       date not null,
  ends_on         date not null,
  status          text not null default 'planned' check (status in ('planned', 'active', 'closed')),
  unique (institution_id, label)
);
create index academic_years_institution_idx on academic_years (institution_id);

create table teachers (
  id              text primary key,
  institution_id  text not null references institutions (id),
  name            text not null,
  email           text not null,
  unique (institution_id, email)
);
create index teachers_institution_idx on teachers (institution_id);

create table classrooms (
  id                text primary key,
  institution_id    text not null references institutions (id),
  academic_year_id  text not null references academic_years (id),
  name              text not null,
  grade             text
);
create index classrooms_institution_idx on classrooms (institution_id);
create index classrooms_academic_year_idx on classrooms (academic_year_id);

-- Docência: professor <-> turma (N:N)
create table classroom_teachers (
  institution_id  text not null references institutions (id),
  classroom_id    text not null references classrooms (id),
  teacher_id      text not null references teachers (id),
  primary key (classroom_id, teacher_id)
);
create index classroom_teachers_institution_idx on classroom_teachers (institution_id);

create table students (
  id              text primary key,
  institution_id  text not null references institutions (id),
  name            text not null,
  -- E-mail é a chave de reconciliação entre origens de importação
  -- (docs/IMPORT_ARCHITECTURE.md); nullable para alunos sem e-mail.
  email           text,
  unique (institution_id, email)
);
create index students_institution_idx on students (institution_id);

-- Matrícula: aluno <-> turma, com estado próprio (docs/DOMAIN_MODEL.md)
create table enrollments (
  id              text primary key,
  institution_id  text not null references institutions (id),
  classroom_id    text not null references classrooms (id),
  student_id      text not null references students (id),
  status          text not null default 'active' check (status in ('active', 'transferred', 'completed')),
  enrolled_at     timestamptz not null default now(),
  unique (classroom_id, student_id)
);
create index enrollments_institution_idx on enrollments (institution_id);
create index enrollments_classroom_idx on enrollments (classroom_id);

-- Registro de metadados de Missão (integridade referencial).
-- O conteúdo pedagógico continua em arquivo (src/content/missions/*);
-- esta tabela é sincronizada a partir dos arquivos, não editada à mão.
-- Missões são catálogo global IAH — sem institution_id de propósito.
create table missions (
  id      text primary key,
  number  integer not null,
  title   text not null,
  module  text not null,
  status  text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  version integer not null default 1
);

create table mission_progress (
  id              text primary key,
  institution_id  text not null references institutions (id),
  classroom_id    text not null references classrooms (id),
  student_id      text not null references students (id),
  mission_id      text not null references missions (id),
  status          text not null check (status in (
    'nao_acessou', 'visualizou', 'investigando', 'produzindo',
    'rascunho', 'entregue', 'reflexao', 'concluiu'
  )),
  last_access_at  timestamptz,
  unique (classroom_id, student_id, mission_id)
);
create index mission_progress_institution_idx on mission_progress (institution_id);
create index mission_progress_classroom_mission_idx on mission_progress (classroom_id, mission_id);

create table productions (
  id              text primary key,
  institution_id  text not null references institutions (id),
  classroom_id    text not null references classrooms (id),
  student_id      text not null references students (id),
  mission_id      text not null references missions (id),
  content         text not null,
  status          text not null default 'draft' check (status in ('draft', 'delivered')),
  delivered_at    timestamptz,
  updated_at      timestamptz not null default now()
);
create index productions_institution_idx on productions (institution_id);
create index productions_student_idx on productions (student_id);

-- Reflexões são append-only (docs/DOMAIN_MODEL.md): sem update em uso
-- normal; a aplicação só insere.
create table reflections (
  id              text primary key,
  institution_id  text not null references institutions (id),
  classroom_id    text not null references classrooms (id),
  student_id      text not null references students (id),
  mission_id      text not null references missions (id),
  text            text not null,
  visibility      text not null default 'private' check (visibility in ('private', 'shared_with_teacher')),
  recorded_at     timestamptz not null default now()
);
create index reflections_institution_idx on reflections (institution_id);
create index reflections_student_idx on reflections (student_id);

create table classroom_integrations (
  id                  text primary key,
  institution_id      text not null references institutions (id),
  provider            text not null check (provider in ('manual', 'csv', 'google', 'microsoft', 'moodle', 'api')),
  status              text not null default 'active' check (status in ('active', 'revoked')),
  -- Mapeamento turma externa -> turma interna (id externo -> classrooms.id)
  external_course_map jsonb not null default '{}'::jsonb,
  last_sync_at        timestamptz
);
create index classroom_integrations_institution_idx on classroom_integrations (institution_id);
