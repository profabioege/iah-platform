-- ============================================================
-- IAH Educacional — Migration 0011: persistência do Mentor IAH
-- (primeira fatia — sessão + mensagens; sem síntese, sem nota).
-- Ver docs/PERSISTENCE.md e docs/DECISIONS.md D-023/D-041.
--
-- NÃO APLICADA AUTOMATICAMENTE. Este arquivo só existe no
-- repositório (mesma convenção das migrations anteriores) — quem
-- decide quando rodar `supabase db push` (ou equivalente) contra o
-- banco real é o time do projeto, nunca este commit.
--
-- REGRAS (mesmas de sempre):
--  * NENHUM dado é inserido aqui.
--  * Toda tabela operacional carrega institution_id.
--  * RLS habilitada, SEM políticas permissivas (D-041): o navegador
--    nunca fala com o banco — acesso exclusivamente server-side via
--    service role (Server Actions, `modules/mentor`), que deriva
--    institutionId/studentId sempre da sessão autenticada, nunca do
--    cliente. Políticas RLS por tenant para acesso direto do
--    navegador ficam para quando (e se) esse acesso existir — política
--    não exercida não é criada (D-023).
-- ============================================================

-- Uma sessão de conversa do Mentor por aluno×atribuição de Missão.
-- Reabrir a Missão reutiliza a sessão existente (unique abaixo) — não
-- há, nesta fatia, encerramento nem múltiplas sessões por atribuição.
create table mentor_sessions (
  id                             text primary key,
  institution_id                 text not null references institutions (id),
  mission_id                     text not null references missions (id),
  assignment_id                  text not null references mission_assignments (id),
  student_id                     text not null references students (id),
  mentor_version                 text not null,
  status                         text not null default 'active'
    check (status in ('active', 'completed')),
  started_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  completed_at                   timestamptz,
  maximum_support_level          text,
  requires_teacher_intervention  boolean not null default false,
  created_at                     timestamptz not null default now(),
  -- Impede sessões duplicadas para o mesmo aluno na mesma atribuição.
  unique (student_id, assignment_id)
);
create index mentor_sessions_institution_idx on mentor_sessions (institution_id);
create index mentor_sessions_assignment_idx on mentor_sessions (assignment_id);
create index mentor_sessions_student_idx on mentor_sessions (student_id);

-- Mensagens da sessão, em ordem determinística (sequence_number, não
-- só created_at — evita ambiguidade de ordenação em timestamps iguais).
-- Guarda só o texto trocado: nunca raciocínio interno do modelo, nunca
-- segredo/token/payload técnico.
create table mentor_messages (
  id                  text primary key,
  institution_id      text not null references institutions (id),
  session_id          text not null references mentor_sessions (id) on delete cascade,
  role                text not null check (role in ('student', 'mentor')),
  content             text not null,
  pedagogical_stage   text,
  support_level       text,
  created_at          timestamptz not null default now(),
  sequence_number     integer not null,
  unique (session_id, sequence_number)
);
create index mentor_messages_institution_idx on mentor_messages (institution_id);
create index mentor_messages_session_idx on mentor_messages (session_id);

-- A aplicação acessa o banco apenas pelo servidor com service role.
-- Sem políticas permissivas, anon/authenticated permanecem deny-by-default.
alter table mentor_sessions  enable row level security;
alter table mentor_messages  enable row level security;

-- Rollback manual, na ordem das dependências:
-- drop table mentor_messages;
-- drop table mentor_sessions;
