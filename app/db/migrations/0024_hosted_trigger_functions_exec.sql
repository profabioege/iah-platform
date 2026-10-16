-- ============================================================
-- IAH Educacional — Migration 0024: funções de gatilho sem EXECUTE
-- para anon/authenticated no Supabase hospedado.
--
-- No Supabase, os privilégios padrão do schema public concedem
-- EXECUTE a anon e authenticated em toda função nova. As migrations
-- anteriores revogam de PUBLIC, mas não desses papéis — o linter do
-- projeto do piloto (16/10/2026) apontou 22 funções SECURITY DEFINER
-- "executáveis" por eles. São funções de gatilho (returns trigger):
-- o PostgreSQL recusa chamá-las fora de um gatilho, então não havia
-- caminho real de uso; esta migration fecha o apontamento por
-- higiene. Só REVOGA; nenhum privilégio é concedido. Idempotente.
-- No PostgreSQL local (testes) os papéis anon/authenticated podem não
-- existir: o bloco ignora o que não existe.
-- ============================================================
do $$
declare
  fn record;
  papel text;
begin
  for fn in
    select p.oid::regprocedure as assinatura
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname like 'iah\_%'
       and p.prorettype = 'trigger'::regtype
  loop
    foreach papel in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = papel) then
        execute format('revoke execute on function %s from %I', fn.assinatura, papel);
      end if;
    end loop;
  end loop;
end $$;
