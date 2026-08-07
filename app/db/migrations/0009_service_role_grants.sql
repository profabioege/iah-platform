-- ============================================================
-- IAH Educacional — Migration 0009: Grants para service_role
--
-- Ver DECISIONS.md D-041 (banco acessado exclusivamente pelo servidor
-- com a service role key) e D-047 item 7 (privilégios SQL declarados
-- explicitamente, sem depender só de ALTER DEFAULT PRIVILEGES).
--
-- Concede a service_role os privilégios de tabela necessários para o
-- backend operar. Não altera RLS, não cria políticas, não concede nada
-- a anon/authenticated/public — o navegador continua sem qualquer
-- acesso direto ao banco. Idempotente: GRANT e ALTER DEFAULT
-- PRIVILEGES podem ser reexecutados sem erro nem duplicação de efeito.
--
-- Motivo verificado em campo (D-047): sem estes GRANTs, tabelas criadas
-- pelas migrations dependem exclusivamente do ALTER DEFAULT PRIVILEGES
-- do papel `postgres` — dependência frágil e não declarada, que só se
-- manifesta em runtime como `permission denied`.
-- ============================================================

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to service_role;
