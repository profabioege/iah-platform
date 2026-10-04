-- ============================================================
-- IAH Educacional — Migration 0020: Acervo autoral IAH — devolutiva por
-- alternativa e tabelas no enunciado
--
-- Ver DECISIONS.md D-052 e docs/reformulacao/05-acervo-autoral-e-revisao.md.
--
-- 1. DEVOLUTIVA POR ALTERNATIVA (`question_version_keys.option_feedback`):
--    um texto por letra, na MESMA tabela do gabarito — portanto com a
--    mesma regra de leitura (equipe sempre; aluno só depois de entregar).
--    Imutável depois do envio à revisão, como o gabarito (trigger da 0017).
-- 2. MARCAÇÃO v2 (`content_format = 'marcacao_v2'`): a v1 da 0018 mais
--    tabelas simples em linhas `| a | b |`, renderizadas por lista de
--    permissão na aplicação.
--
-- 3. CLASSIFICAÇÃO EM REVISÃO: habilidade (e o componente que a
--    acompanha) da questão pode ser corrigida pelo autor ENQUANTO nenhuma
--    versão foi aprovada — depois disso, continua imutável (0017), porque
--    listas e evidências do circuito já apontam para ela.
--
-- Só adições; nenhum dado inserido; nenhum DELETE para `iah_app`.
-- ============================================================

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.question_versions'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%content_format%'
  loop
    execute format('alter table public.question_versions drop constraint %I', c.conname);
  end loop;
end $$;
alter table question_versions add constraint question_versions_content_format_check
  check (content_format in ('texto', 'marcacao_v1', 'marcacao_v2'));

alter table question_version_keys add column if not exists option_feedback jsonb;
do $$ begin
  alter table question_version_keys add constraint question_version_keys_option_feedback_check
    check (option_feedback is null or jsonb_typeof(option_feedback) = 'object');
exception when duplicate_object then null; end $$;

-- Gabarito: regras da 0017 + devolutivas só para letras que existem, com texto.
create or replace function public.iah_check_question_key() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v record;
  k text;
begin
  select status, options, institution_id into v from question_versions where id = new.version_id;
  if v.status <> 'rascunho' then
    raise exception 'Gabarito de versão enviada à revisão não muda.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v.options) opt where opt ->> 'key' = new.answer_key
  ) then
    raise exception 'Gabarito não corresponde a nenhuma alternativa.' using errcode = '23514';
  end if;
  if new.option_feedback is not null then
    for k in select jsonb_object_keys(new.option_feedback) loop
      if not exists (select 1 from jsonb_array_elements(v.options) opt where opt ->> 'key' = k) then
        raise exception 'Devolutiva para alternativa inexistente (%).', k using errcode = '23514';
      end if;
      if jsonb_typeof(new.option_feedback -> k) <> 'string' or length(btrim(new.option_feedback ->> k)) = 0 then
        raise exception 'Devolutiva vazia para a alternativa %.', k using errcode = '23514';
      end if;
    end loop;
  end if;
  if tg_op = 'UPDATE' and new.version_id is distinct from old.version_id then
    raise exception 'Gabarito não troca de versão.' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Questão: regras de escopo da 0017; habilidade/componente corrigíveis só
-- antes da primeira aprovação.
create or replace function public.iah_check_question_scope() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  comp record;
  sk record;
begin
  select institution_id, area_id into comp from curriculum_components where id = new.component_id;
  select institution_id, area_id, component_id into sk from curriculum_skills where id = new.skill_id;
  if comp.institution_id is not null and comp.institution_id <> new.institution_id then
    raise exception 'Componente de outra instituição.' using errcode = '42501';
  end if;
  if sk.institution_id is not null and sk.institution_id <> new.institution_id then
    raise exception 'Habilidade de outra instituição.' using errcode = '42501';
  end if;
  if comp.area_id <> sk.area_id then
    raise exception 'Habilidade e componente de áreas diferentes.' using errcode = '23514';
  end if;
  if sk.component_id is not null and sk.component_id <> new.component_id then
    raise exception 'Habilidade vinculada a outro componente.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if new.institution_id <> old.institution_id or new.created_by <> old.created_by then
      raise exception 'Escola e autoria da questão não mudam.' using errcode = '23514';
    end if;
    if (new.component_id <> old.component_id or new.skill_id <> old.skill_id)
       and exists (
         select 1 from question_versions v
          where v.question_id = new.id and v.status in ('aprovada', 'substituida')
       ) then
      raise exception 'Questão já aprovada não muda de habilidade nem de componente; crie outra questão.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
