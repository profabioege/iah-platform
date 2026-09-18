-- ============================================================
-- IAH Educacional — Migration 0011: credenciais do piloto e auditoria
--
-- Fecha três lacunas apontadas na auditoria de prontidão (18/09/2026):
--
--  1. Credencial inicial individual: cada conta nasce com senha própria,
--     aleatória e temporária, e é OBRIGADA a trocá-la no primeiro acesso
--     (`must_change_password`). A senha coletiva do modo demonstração
--     não entra no modo real.
--  2. Invalidação de acessos anteriores: `credentials_version` sobe a
--     cada redefinição; a sessão carrega a versão e deixa de valer
--     quando a versão do banco avança (recuperação assistida encerra as
--     sessões abertas).
--  3. Tentativas abusivas de login: `auth_login_attempts` guarda o
--     registro por e-mail e por origem para o limitador, que precisa
--     valer entre instâncias — contador em memória de um processo não
--     serve para hospedagem serverless.
--
-- Mais a trilha administrativa (`admin_audit_log`): quem provisionou ou
-- redefiniu o quê e quando. NUNCA guarda senha, hash ou token.
--
-- Todas as tabelas novas nascem com RLS habilitada e sem policy: só a
-- `service_role` (caminho administrativo) as alcança. `iah_app` — o
-- papel das telas — não recebe grant nenhum aqui.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ciclo de vida da credencial
-- ------------------------------------------------------------
alter table users add column if not exists must_change_password boolean not null default false;
alter table users add column if not exists credentials_version integer not null default 1;
alter table users add column if not exists password_changed_at timestamptz;

-- ------------------------------------------------------------
-- 2. Tentativas de login (limitador distribuído)
--
-- `origin_hash` é hash da origem (IP), nunca o IP em texto: o limitador
-- precisa distinguir origens sem transformar o log em cadastro de
-- endereços. A escola inteira costuma sair por um IP só — por isso o
-- limite por e-mail é o principal, e o limite por origem existe com
-- folga muito maior (ver `lib/login-throttle.ts`).
-- ------------------------------------------------------------
create table if not exists auth_login_attempts (
  id            bigserial primary key,
  email         text not null,
  origin_hash   text,
  succeeded     boolean not null,
  attempted_at  timestamptz not null default now()
);

create index if not exists auth_login_attempts_email_idx
  on auth_login_attempts (email, attempted_at desc);

create index if not exists auth_login_attempts_origin_idx
  on auth_login_attempts (origin_hash, attempted_at desc);

alter table auth_login_attempts enable row level security;

-- ------------------------------------------------------------
-- 3. Trilha administrativa
-- ------------------------------------------------------------
create table if not exists admin_audit_log (
  id              bigserial primary key,
  occurred_at     timestamptz not null default now(),
  actor           text not null,           -- quem executou (usuário ou "cli:<operador>")
  action          text not null,           -- provision.class, credential.reset, ...
  institution_id  text references institutions (id),
  target_type     text,
  target_id       text,
  details         jsonb not null default '{}'::jsonb
);

create index if not exists admin_audit_log_institution_idx
  on admin_audit_log (institution_id, occurred_at desc);

alter table admin_audit_log enable row level security;

grant select, insert on auth_login_attempts to service_role;
grant usage, select on sequence auth_login_attempts_id_seq to service_role;
grant select, insert on admin_audit_log to service_role;
grant usage, select on sequence admin_audit_log_id_seq to service_role;

-- Expurgo é operacional (fora do escopo desta migration): as tentativas
-- de login servem ao limitador e à investigação de incidente, e devem
-- ser removidas conforme a política de retenção.
