-- ============================================================
-- IAH Educacional — Migration 0023: etapa do diagnóstico aceita questão
-- com habilidade CONFIRMADA por revisão humana
--
-- Decisão: docs/DECISIONS.md D-055 e
-- docs/reformulacao/09-prontidao-diagnostico-real.md.
--
-- Problema (encontrado na homologação do diagnóstico real): a 0022 exige
-- que toda questão da etapa tenha a habilidade da etapa como habilidade
-- OFICIAL (`practice_list_items.skill_id`). Mas a aplicação já considera
-- elegível a questão cuja correspondência BNCC foi CONFIRMADA por revisão
-- humana (`question_skill_suggestions.status = 'confirmada'`), como os
-- itens do Enem, classificados oficialmente pela Matriz. A etapa com uma
-- dessas questões era recusada pelo banco.
--
-- Correção: a função de conferência da etapa passa a aceitar, além da
-- habilidade oficial, a correspondência confirmada. Sugestão NÃO revisada
-- continua recusada (D-051/D-052). Nenhuma tabela muda; nenhum dado é
-- inserido. Idempotente (`create or replace`).
--
-- Reversão: reaplicar a definição de `iah_check_diagnostic_block` da 0022.
-- ============================================================

create or replace function public.iah_check_diagnostic_block() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  l record;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Etapa do diagnóstico não muda; crie outro diagnóstico.' using errcode = '23514';
  end if;
  select classroom_id, institution_id, status into d from diagnostics where id = new.diagnostic_id;
  select classroom_id, institution_id, kind, target_skill_id into l from practice_lists where id = new.list_id;
  if d.status <> 'rascunho' then
    raise exception 'Etapas só entram com o diagnóstico em rascunho.' using errcode = '23514';
  end if;
  if l.institution_id <> d.institution_id or l.classroom_id <> d.classroom_id then
    raise exception 'Lista de outra turma.' using errcode = '42501';
  end if;
  if l.kind <> 'diagnostica' or l.target_skill_id is distinct from new.skill_id then
    raise exception 'A etapa é uma lista diagnóstica da mesma habilidade.' using errcode = '23514';
  end if;
  -- Toda questão: habilidade oficial = a da etapa, OU correspondência
  -- confirmada por revisão humana com a habilidade da etapa.
  if exists (
    select 1
      from practice_list_items i
      join question_versions v on v.id = i.question_version_id
     where i.list_id = new.list_id
       and i.skill_id <> new.skill_id
       and not exists (
         select 1 from question_skill_suggestions s
          where s.question_id = v.question_id
            and s.skill_id = new.skill_id
            and s.status = 'confirmada'
       )
  ) then
    raise exception 'Todas as questões da etapa são da habilidade da etapa (oficial ou confirmada).' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.iah_check_diagnostic_block() from public;
