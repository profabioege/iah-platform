-- ============================================================
-- 0012 — Acesso do papel `iah_app` ao estado de sincronização
--        das turmas (achado da homologação por HTTP)
--
-- O painel do professor lê `classroom_sync_states` para montar os
-- cartões de turma. A migration 0010 não concedeu essa tabela ao papel
-- de menor privilégio, e os testes em processo não passavam por essa
-- tela: a falha só apareceu quando a homologação abriu `/professor`
-- pela rede, com sessão real — `permission denied for table
-- classroom_sync_states`.
--
-- `classroom_integrations` entra pelo mesmo motivo: é a configuração da
-- origem da turma, lida no mesmo caminho. A escrita fica com a equipe
-- pedagógica da própria instituição; nenhum DELETE, como no resto do
-- piloto.
-- ============================================================

grant select, insert, update on classroom_sync_states to iah_app;
grant select on classroom_integrations to iah_app;

-- ------------------------------------------------------------
-- classroom_sync_states — a instituição do ator delimita tudo;
-- a escrita exige equipe pedagógica alcançando aquela turma.
-- ------------------------------------------------------------
drop policy if exists iah_app_sync_states_read on classroom_sync_states;
create policy iah_app_sync_states_read on classroom_sync_states for select to iah_app
  using (institution_id = public.iah_actor_institution());

drop policy if exists iah_app_sync_states_insert on classroom_sync_states;
create policy iah_app_sync_states_insert on classroom_sync_states for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_is_staff()
    and public.iah_reaches_classroom(classroom_id)
  );

drop policy if exists iah_app_sync_states_update on classroom_sync_states;
create policy iah_app_sync_states_update on classroom_sync_states for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_is_staff()
    and public.iah_reaches_classroom(classroom_id)
  )
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_is_staff()
    and public.iah_reaches_classroom(classroom_id)
  );

-- ------------------------------------------------------------
-- classroom_integrations — leitura da equipe pedagógica. A escrita
-- continua no caminho administrativo (service_role): ligar uma origem
-- externa não é operação de tela no piloto.
-- ------------------------------------------------------------
drop policy if exists iah_app_integrations_read on classroom_integrations;
create policy iah_app_integrations_read on classroom_integrations for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_is_staff()
  );
