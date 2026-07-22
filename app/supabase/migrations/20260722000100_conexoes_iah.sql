-- ============================================================
-- IAH Educacional — Migration 0010: Conexões IAH (MVP)
-- Ver DECISIONS.md D-048. Cria as tabelas do MVP de Conexões IAH e
-- amplia (sem remover) o check de `generated_materials.type` para
-- aceitar `laboratory_lesson` — a Aula de laboratório correlacionada
-- reaproveita o mesmo agregado de `generated_materials` do DocentIAH
-- (D-047), em vez de uma nova tabela de conteúdo.
-- Nenhum dado demonstrativo é inserido nesta migration; nenhuma linha
-- existente é alterada.
-- ============================================================

alter table generated_materials
  drop constraint generated_materials_type_check;
alter table generated_materials
  add constraint generated_materials_type_check
  check (type in ('slides', 'laboratory_lesson'));

create table curriculum_connections (
  id                          text primary key,
  institution_id              text not null references institutions (id),
  classroom_id                text references classrooms (id),
  created_by_teacher_id       text not null references teachers (id),
  source_subject_id           text not null,
  source_teacher_id           text references teachers (id),
  education_level             text not null
    check (education_level in ('ensino_fundamental_anos_iniciais', 'ensino_fundamental_anos_finais', 'ensino_medio')),
  grade                       text not null,
  academic_period             text,
  source_topic                text not null,
  source_concept              text,
  identified_context          jsonb not null,
  selected_reference_ids      jsonb not null default '[]',
  iah_axis_ids                jsonb not null default '[]',
  selected_connections        jsonb not null default '[]',
  guiding_question            text not null,
  pedagogical_rationale       text not null,
  confidence                  numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  status                      text not null default 'sugerida'
    check (status in ('rascunho', 'sugerida', 'revisada', 'aprovada', 'publicada', 'arquivada')),
  prompt_version              text not null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index curriculum_connections_institution_idx on curriculum_connections (institution_id);
create index curriculum_connections_teacher_idx on curriculum_connections (created_by_teacher_id);

create table correlated_lessons (
  id                          text primary key,
  curriculum_connection_id    text not null references curriculum_connections (id) on delete cascade,
  generated_material_id       text not null references generated_materials (id) on delete cascade,
  status                      text not null default 'sugerida'
    check (status in ('rascunho', 'sugerida', 'revisada', 'aprovada', 'publicada', 'arquivada')),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index correlated_lessons_connection_idx on correlated_lessons (curriculum_connection_id);
create index correlated_lessons_material_idx on correlated_lessons (generated_material_id);

-- A aplicação acessa o banco apenas pelo servidor com service role.
-- Sem políticas permissivas, anon/authenticated permanecem deny-by-default.
alter table curriculum_connections enable row level security;
alter table correlated_lessons     enable row level security;

-- Rollback manual, na ordem das dependências:
-- drop table correlated_lessons;
-- drop table curriculum_connections;
-- alter table generated_materials drop constraint generated_materials_type_check;
-- alter table generated_materials add constraint generated_materials_type_check check (type in ('slides'));
