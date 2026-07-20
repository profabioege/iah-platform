-- ============================================================
-- IAH Educacional — Migration 0005: Fundação de Produção (M22)
-- Persistência e autenticação reais. Ver docs/PERSISTENCE.md e
-- DECISIONS.md D-041.
--
-- REGRAS (mesmas das anteriores):
--  * NENHUM dado é inserido aqui. O seed de demonstração é um script
--    explícito e separado (app/db/seed/seed-demo.mjs), executado
--    deliberadamente só no ambiente de demonstração.
--  * Toda tabela operacional carrega institution_id.
--
-- POSTURA DE SEGURANÇA (D-041):
--  * O banco é acessado EXCLUSIVAMENTE pelo servidor da aplicação, com
--    a SERVICE ROLE KEY. Nenhum componente de cliente fala com o banco.
--  * RLS é habilitada em TODAS as tabelas SEM políticas permissivas —
--    "deny by default": as chaves anon/authenticated não leem nem
--    escrevem nada; a service role (servidor) bypassa RLS por design do
--    Postgres. A autorização por papel/tenant é aplicada na camada de
--    serviço (sessão Auth.js → institutionId/role → contratos que
--    exigem institutionId em todo método).
--  * Políticas RLS por tenant para acesso client-side entram apenas
--    quando (e se) houver acesso direto do navegador ao banco — hoje
--    não há, e política não exercida não é criada (D-023).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Identidade & Acesso — senha local (Auth.js Credentials)
-- ------------------------------------------------------------

-- Hash scrypt (formato "scrypt:1:salt:hash" — src/lib/password.ts).
-- NULL para identidades que só entram por provedor externo (Google).
alter table users add column password_hash text;
alter table users add column status text not null default 'active'
  check (status in ('active', 'inactive'));

-- Alunos ganham vínculo com a identidade autenticável (P1, DOMAIN_MODEL:
-- papel ≠ identidade; teachers.user_id já existia desde a 0003).
alter table students add column user_id text references users (id);
create index students_user_idx on students (user_id);

-- ------------------------------------------------------------
-- 2. Instituição — campos que o código já usa e o schema não tinha
-- ------------------------------------------------------------

alter table institutions add column colors jsonb;
alter table institutions add column timezone text not null default 'America/Sao_Paulo';

-- Disciplina ofertada pela Instituição (Workspace M15; ex.: IA & Humanidades).
create table subjects (
  id              text primary key,
  institution_id  text not null references institutions (id),
  name            text not null,
  unique (institution_id, name)
);
create index subjects_institution_idx on subjects (institution_id);

-- ------------------------------------------------------------
-- 3. Lesson — o Pedagogical Package do Professor (D-028, M12/M13)
-- ------------------------------------------------------------

create table lessons (
  id                              text primary key,
  institution_id                  text not null references institutions (id),
  author                          text not null,
  grade                           text not null default '',
  classroom_id                    text references classrooms (id),
  classroom_label                 text not null default '',
  estimated_minutes               integer,
  topic                           text not null default '',
  objective                       text not null default '',
  planning_axis                   text not null default '',
  bncc_competencies               jsonb not null default '[]'::jsonb,
  bncc_computacao_competencies    jsonb not null default '[]'::jsonb,
  format                          text check (format in (
    'investigacao', 'debate', 'estudo_de_caso', 'oficina',
    'projeto', 'laboratorio', 'producao'
  )),
  knowledge_document_ids          jsonb not null default '[]'::jsonb,
  mission_id                      text references missions (id),
  assessment_notes                text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  saved_at                        timestamptz
);
create index lessons_institution_idx on lessons (institution_id);
create index lessons_classroom_idx on lessons (classroom_id);

-- ------------------------------------------------------------
-- 4. Publicação de Mission (M17/M21 — a "Atividade" do DOMAIN_MODEL)
-- ------------------------------------------------------------

create table mission_assignments (
  id                      text primary key,
  institution_id          text not null references institutions (id),
  classroom_id            text not null references classrooms (id),
  mission_id              text not null references missions (id),
  lesson_id               text references lessons (id),
  mission_version         integer not null default 1,
  status                  text not null default 'published'
    check (status in ('draft', 'published', 'closed')),
  published_at            timestamptz not null default now(),
  due_at                  timestamptz,
  closed_at               timestamptz,
  external_assignment_id  text
);
create index mission_assignments_institution_idx on mission_assignments (institution_id);
create index mission_assignments_classroom_idx on mission_assignments (classroom_id);

-- ------------------------------------------------------------
-- 5. Avaliação e devolutiva do Professor (M21 — StudentWorkReview)
-- ------------------------------------------------------------

create table mission_reviews (
  id                text primary key,
  institution_id    text not null references institutions (id),
  classroom_id      text not null references classrooms (id),
  student_id        text not null references students (id),
  mission_id        text not null references missions (id),
  grade             text not null,
  observed_criteria jsonb not null default '[]'::jsonb,
  feedback          text not null,
  reviewer_id       text not null references users (id),
  reviewer_name     text not null,
  reviewed_at       timestamptz not null default now(),
  unique (classroom_id, student_id, mission_id)
);
create index mission_reviews_institution_idx on mission_reviews (institution_id);
create index mission_reviews_classroom_mission_idx on mission_reviews (classroom_id, mission_id);

-- ------------------------------------------------------------
-- 6. Ajustes nas tabelas de entrega existentes
-- ------------------------------------------------------------

-- O ciclo M21 introduziu o estado 'avaliado' (submitted -> reviewed).
alter table mission_progress drop constraint mission_progress_status_check;
alter table mission_progress add constraint mission_progress_status_check
  check (status in (
    'nao_acessou', 'visualizou', 'investigando', 'produzindo',
    'rascunho', 'entregue', 'reflexao', 'concluiu', 'avaliado'
  ));

-- Início explícito da investigação (StudentWork.startedAt).
alter table productions add column started_at timestamptz;

-- Reflexão em rascunho (autosave, StudentWork.reflection) precisa existir
-- como linha antes de ser "registrada" (StudentWork.reflectionRecordedAt) —
-- mesmo padrão de productions.delivered_at (nullable = ainda rascunho).
alter table reflections alter column recorded_at drop not null;
alter table reflections alter column recorded_at drop default;

-- Um registro de produção/reflexão por aluno×missão×turma (upsert).
alter table productions add constraint productions_unique_submission
  unique (classroom_id, student_id, mission_id);
alter table reflections add constraint reflections_unique_entry
  unique (classroom_id, student_id, mission_id);

-- ------------------------------------------------------------
-- 7. Row Level Security — deny by default em TODAS as tabelas
-- ------------------------------------------------------------

alter table institutions            enable row level security;
alter table academic_years          enable row level security;
alter table teachers                enable row level security;
alter table classrooms              enable row level security;
alter table classroom_teachers      enable row level security;
alter table students                enable row level security;
alter table enrollments             enable row level security;
alter table missions                enable row level security;
alter table mission_progress        enable row level security;
alter table productions             enable row level security;
alter table reflections             enable row level security;
alter table classroom_integrations  enable row level security;
alter table classroom_sync_states   enable row level security;
alter table users                   enable row level security;
alter table profiles                enable row level security;
alter table subjects                enable row level security;
alter table lessons                 enable row level security;
alter table mission_assignments     enable row level security;
alter table mission_reviews         enable row level security;
alter table knowledge_sources              enable row level security;
alter table knowledge_topics               enable row level security;
alter table knowledge_tags                 enable row level security;
alter table knowledge_documents            enable row level security;
alter table knowledge_document_tags        enable row level security;
alter table knowledge_document_topics      enable row level security;
alter table knowledge_collections          enable row level security;
alter table knowledge_collection_documents enable row level security;
alter table knowledge_references           enable row level security;
