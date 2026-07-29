-- ============================================================
-- IAH Educacional — Migration 0007: Claim atômico da fila de jobs
-- Contrato de domínio da Micro Missão 2 (D-047,
-- docs/architecture/iah-event-driven-hermes-agent.md §9.3).
--
-- Só a função de reivindicação. As demais operações do repositório
-- (enqueue, heartbeat, complete, fail, releaseForRetry, cancel) são cada
-- uma um único UPDATE/INSERT condicional, já atômico por linha via o
-- client REST do Supabase — não precisam de função. Só o claim exige
-- `SELECT ... FOR UPDATE SKIP LOCKED` + ordenação + update condicional
-- em uma única unidade atômica, o que o query builder REST não expõe.
--
-- SECURITY INVOKER (padrão, não declarado explicitamente como DEFINER):
-- o único chamador autorizado é service_role, que já tem GRANT direto em
-- iah_jobs (migration 0006) — não há elevação de privilégio a fazer, e
-- rodar como INVOKER evita a superfície extra de um SECURITY DEFINER
-- desnecessário.
-- ============================================================

create function public.iah_claim_next_job(
  p_capabilities text[],
  p_worker_id text,
  p_lock_duration_seconds integer,
  p_now timestamptz
)
returns setof public.iah_jobs
language plpgsql
set search_path = public
as $$
declare
  v_job_id text;
begin
  select id into v_job_id
  from public.iah_jobs
  where status = 'queued'
    and available_at <= p_now
    and attempts < max_attempts
    and capability = any (p_capabilities)
  order by priority asc, available_at asc, created_at asc, id asc
  limit 1
  for update skip locked;

  if v_job_id is null then
    return;
  end if;

  return query
  update public.iah_jobs
  set
    status = 'processing',
    attempts = attempts + 1,
    locked_by = p_worker_id,
    locked_at = p_now,
    lock_expires_at = p_now + make_interval(secs => p_lock_duration_seconds),
    started_at = coalesce(started_at, p_now),
    updated_at = p_now
  where id = v_job_id
  returning *;
end;
$$;

-- Por padrão, PostgreSQL concede EXECUTE a PUBLIC na criação da função —
-- revogar explicitamente e conceder só ao papel server-side estritamente
-- necessário (D-047 §7: privilégios declarados explicitamente).
revoke all on function public.iah_claim_next_job(text[], text, integer, timestamptz) from public;
revoke all on function public.iah_claim_next_job(text[], text, integer, timestamptz) from anon;
revoke all on function public.iah_claim_next_job(text[], text, integer, timestamptz) from authenticated;
grant execute on function public.iah_claim_next_job(text[], text, integer, timestamptz) to service_role;

-- Rollback manual:
-- drop function public.iah_claim_next_job(text[], text, integer, timestamptz);
