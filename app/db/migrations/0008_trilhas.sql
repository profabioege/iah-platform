-- ============================================================
-- IAH Educacional — Migration 0008: Trilhas de aprendizagem
-- Contrato de domínio da Micro Missão 1 do plano de reorganização
-- pedagógica por trilhas (docs/product/iah-trilhas-implantacao-piloto.md).
-- Só a tabela — nenhuma mudança em classrooms/students, nenhuma variante
-- de missão, nenhum seed de conteúdo pedagógico ainda.
-- ============================================================

create table trilhas (
  id                      text primary key,
  institution_id          text not null references institutions (id),
  academic_year_id        text not null references academic_years (id),
  code                    text not null check (code <> '' and code = lower(code)),
  name                    text not null check (name <> ''),
  description             text not null,
  suggested_school_range  jsonb not null default '{}'::jsonb,
  complexity_level        text not null
    check (complexity_level in ('foundational', 'intermediate', 'advanced')),
  recommended_language    text not null
    check (recommended_language in ('concrete', 'investigative', 'conceptual')),
  autonomy_level          text not null
    check (autonomy_level in ('guided', 'supported', 'autonomous')),
  objectives              jsonb not null default '[]'::jsonb,
  status                  text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  version                 integer not null default 1 check (version > 0),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (institution_id, academic_year_id, code)
);
create index trilhas_institution_idx on trilhas (institution_id);
create index trilhas_academic_year_idx on trilhas (academic_year_id);
create index trilhas_status_idx on trilhas (status);
create index trilhas_code_idx on trilhas (code);

-- A aplicação acessa o banco apenas pelo servidor com service role.
-- Sem políticas permissivas, anon/authenticated permanecem deny-by-default
-- — mesmo padrão das tabelas normais da plataforma
-- (0005_production_foundation.sql), não a convenção específica de GRANT
-- explícito das tabelas de fila (D-047 §7, exclusiva de iah_jobs).
alter table trilhas enable row level security;

-- Rollback manual:
-- drop table trilhas;
