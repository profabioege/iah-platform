-- ============================================================
-- IAH Educacional — Migration 0009: Materiais gerados pelo DocentIAH
-- Ver DECISIONS.md D-047. Persistência enxuta para a primeira
-- funcionalidade-core do DocentIAH (Apresentação de slides) — os
-- outros três cards (Avaliação, Plano de aula, Adaptar material)
-- reaproveitam o mesmo agregado quando ganharem geração real.
-- Nenhum dado demonstrativo é inserido nesta migration.
-- ============================================================

create table generated_materials (
  id                text primary key,
  institution_id    text not null references institutions (id),
  teacher_id        text not null references teachers (id),
  type              text not null check (type in ('slides')),
  title             text not null,
  subject_id        text references subjects (id),
  classroom_id      text references classrooms (id),
  status            text not null default 'generated'
    check (status in ('generated', 'saved')),
  input_data        jsonb not null,
  output_data       jsonb not null,
  prompt_version    text not null,
  provider          text not null,
  model             text not null,
  web_search_used   boolean not null default false,
  pdf_used          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index generated_materials_institution_idx on generated_materials (institution_id);
create index generated_materials_teacher_idx on generated_materials (teacher_id);

create table generation_usage (
  id                text primary key,
  institution_id    text not null references institutions (id),
  user_id           text not null references users (id),
  capability        text not null,
  provider          text not null,
  model             text not null,
  prompt_version    text not null,
  input_tokens      integer,
  output_tokens     integer,
  estimated_cost    numeric(10,4),
  status            text not null check (status in ('success', 'error')),
  created_at        timestamptz not null default now()
);
create index generation_usage_institution_idx on generation_usage (institution_id);
create index generation_usage_user_idx on generation_usage (user_id);

create table attached_context (
  id                          text primary key,
  material_id                 text not null references generated_materials (id) on delete cascade,
  type                        text not null check (type in ('pdf')),
  original_filename           text not null,
  mime_type                   text not null,
  size_bytes                  integer not null check (size_bytes >= 0),
  page_count                  integer not null check (page_count >= 0),
  extracted_character_count   integer not null check (extracted_character_count >= 0),
  truncated                   boolean not null default false,
  created_at                  timestamptz not null default now()
);
create index attached_context_material_idx on attached_context (material_id);

-- A aplicação acessa o banco apenas pelo servidor com service role.
-- Sem políticas permissivas, anon/authenticated permanecem deny-by-default.
alter table generated_materials  enable row level security;
alter table generation_usage     enable row level security;
alter table attached_context     enable row level security;

-- Rollback manual, na ordem das dependências:
-- drop table attached_context;
-- drop table generation_usage;
-- drop table generated_materials;
