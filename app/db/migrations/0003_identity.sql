-- ============================================================
-- IAH Educacional — Migration 0003: Identidade & Acesso
-- Ver docs/AUTHENTICATION.md e docs/SUPABASE.md.
--
-- Mesmas regras das anteriores: nenhum INSERT (a linha da Instituição
-- real é inserida pelo responsável — docs/SUPABASE.md); sessões são JWT
-- (Auth.js, estratégia stateless) e por isso NÃO há tabela de sessões —
-- decisão registrada em DECISIONS.md D-025.
-- ============================================================

-- Instituições ganham os campos mínimos do cadastro institucional.
alter table institutions add column slug text unique;
alter table institutions add column logo_url text;
alter table institutions add column domain text;

-- Usuários: a identidade autenticável (uma pessoa que faz login).
create table users (
  id              text primary key,
  institution_id  text references institutions (id),
  name            text not null,
  email           text not null unique,
  avatar_url      text,
  google_id       text,
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz
);
create index users_institution_idx on users (institution_id);

-- Professores passam a referenciar a identidade que os autentica.
alter table teachers add column user_id text references users (id);

-- Perfis: papel que uma identidade assume num escopo (P1, DOMAIN_MODEL).
create table profiles (
  id              text primary key,
  user_id         text not null references users (id),
  institution_id  text references institutions (id),
  role            text not null check (role in ('aluno', 'professor', 'administrador', 'admin_iah')),
  status          text not null default 'active' check (status in ('active', 'inactive')),
  created_at      timestamptz not null default now(),
  unique (user_id, institution_id, role)
);
create index profiles_user_idx on profiles (user_id);
create index profiles_institution_idx on profiles (institution_id);
