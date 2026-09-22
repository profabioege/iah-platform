-- ============================================================
-- IAH Educacional — Migration 0013: reforço específico de hospedagem
-- gerenciada (Supabase hospedado, distinto do container local de teste)
--
-- Achado na homologação de 20-21/09/2026: o Postgres do Supabase
-- hospedado concede EXECUTE em funções novas a `anon`/`authenticated`
-- por padrão (via role `postgres`), diferente do container local de
-- `pilot-db-env.mjs`, onde os papéis nascem sem esse privilégio. A
-- migration 0010 já revogava de `public`, mas isso não bastava no
-- ambiente hospedado — dois achados corrigidos aqui:
--
--  1. `iah_enrolled`/`iah_teaches` (SECURITY DEFINER) executáveis por
--     anon/authenticated via /rest/v1/rpc/*. Revogado explicitamente.
--  2. search_path mutável nas 7 funções `iah_*` (0010) — fixado em
--     `public`, mesma prática já usada em `iah_claim_next_job` (0007).
--
-- Idempotente: seguro reexecutar em qualquer ambiente (hospedado ou
-- local), mesmo onde o grant automático nunca existiu.
-- ============================================================

revoke execute on function public.iah_enrolled(text) from anon, authenticated;
revoke execute on function public.iah_teaches(text) from anon, authenticated;

alter function public.iah_claim(text) set search_path = public;
alter function public.iah_actor_institution() set search_path = public;
alter function public.iah_actor_role() set search_path = public;
alter function public.iah_actor_student() set search_path = public;
alter function public.iah_actor_teacher() set search_path = public;
alter function public.iah_reaches_classroom(text) set search_path = public;
alter function public.iah_is_staff() set search_path = public;
