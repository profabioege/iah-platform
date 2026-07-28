-- ============================================================
-- IAH Educacional — Migration 0006: Fila durável de jobs assíncronos
-- Contrato de domínio da Micro Missão 1 (D-047,
-- docs/architecture/iah-event-driven-hermes-agent.md). Só a tabela e seu
-- ciclo de vida mínimo — sem claim transacional real, worker, API
-- interna, auditoria append-only ou dead-letter separado (missões
-- futuras do plano de 14 micro missões, §14 do documento de arquitetura).
-- Nenhum dado demonstrativo é inserido nesta migration.
-- ============================================================

create table iah_jobs (
  id               text primary key,
  institution_id   text not null references institutions (id),
  capability       text not null check (capability <> ''),
  status           text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'failed', 'cancelled')),
  idempotency_key  text not null check (idempotency_key <> ''),
  priority         integer not null default 100 check (priority between 1 and 999),
  input            jsonb not null default '{}'::jsonb,
  output           jsonb,
  error_code       text,
  error_message    text,
  attempts         integer not null default 0 check (attempts >= 0),
  max_attempts     integer not null default 3 check (max_attempts > 0),
  available_at     timestamptz not null default now(),
  locked_at        timestamptz,
  lock_expires_at  timestamptz,
  locked_by        text,
  created_by       text references users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  started_at       timestamptz,
  completed_at     timestamptz,
  failed_at        timestamptz,
  cancelled_at     timestamptz,
  check (attempts <= max_attempts),
  unique (institution_id, idempotency_key)
);
create index iah_jobs_institution_idx on iah_jobs (institution_id);
create index iah_jobs_claim_idx on iah_jobs (status, available_at, priority);
create index iah_jobs_capability_idx on iah_jobs (capability);
create index iah_jobs_lock_expiry_idx on iah_jobs (lock_expires_at) where status = 'processing';

-- A aplicação acessa o banco apenas pelo servidor com service role.
-- Sem políticas permissivas, anon/authenticated permanecem deny-by-default.
alter table iah_jobs enable row level security;

-- D-047 §7: privilégios declarados explicitamente nesta migration, sem
-- depender exclusivamente de `alter default privileges` (fragilidade
-- registrada em docs/architecture/iah-event-driven-hermes-agent.md
-- §15.1, item 2). anon e authenticated não recebem nenhum acesso: o
-- Hermes é um worker externo e nunca toca o Supabase diretamente (§10.1);
-- todo consumo passa pela API interna, ainda não implementada.
grant select, insert, update, delete on iah_jobs to service_role;

-- Rollback manual:
-- drop table iah_jobs;
