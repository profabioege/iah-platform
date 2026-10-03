-- ============================================================
-- IAH Educacional — Migration 0017: banco de questões, revisão
-- editorial, listas diagnósticas, tentativas e devolutivas
--
-- Ver docs/reformulacao/01-matriz-e-banco-de-questoes.md e D-049.
--
--   content_sources        fonte e direitos de uso de cada item
--   questions              identidade estável da questão (escola,
--                          componente, habilidade)
--   question_versions      conteúdo VERSIONADO; imutável depois de
--                          enviado à revisão
--   question_version_keys  gabarito e resolução, em tabela separada
--                          para o aluno só ler DEPOIS de entregar
--   question_reviews       trilha append-only de revisão humana
--   practice_lists         lista (diagnóstica/periódica/revisão) de uma
--                          turma
--   practice_list_items    itens da lista, fixados numa versão APROVADA
--   list_attempts          tentativa do aluno (uma por aluno × lista)
--   attempt_answers        resposta por item (uma por tentativa × item)
--   attempt_feedback       devolutiva do professor
--
-- Garantias que o BANCO impõe (não só a interface):
--  1. Materiais de uma escola nunca alcançam outra: toda tabela tem
--     institution_id NOT NULL, e triggers recusam referência cruzada
--     mesmo para a service_role.
--  2. Só entra em lista (e só é publicada) versão APROVADA por revisão
--     humana, de fonte com direitos VERIFICADOS, com gabarito e
--     resolução; quem revisa não é quem escreveu.
--  3. Versão enviada à revisão não muda mais: corrigir = nova versão.
--  4. Uma tentativa por aluno × lista e uma resposta por item
--     (unique); a correção é calculada no banco na entrega — o aluno
--     não informa acerto, e não vê gabarito/acerto antes de entregar.
--  5. "Dificuldade editorial" é rótulo de quem escreveu/revisou. NÃO é
--     parâmetro TRI e não deve ser apresentada como tal.
--
-- Nenhum DELETE para `iah_app`. Nenhum dado inserido aqui.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fontes e direitos
-- ------------------------------------------------------------
create table if not exists content_sources (
  id                  text primary key,
  institution_id      text not null references institutions (id),
  -- Não há tipo "Enem" nem "apostila": importar itens de prova oficial
  -- ou de material didático licenciado a terceiros exige contrato e
  -- entra como 'licenciado' com evidência — nunca por presunção.
  kind                text not null check (kind in (
    'autoral_escola', 'autoral_iah', 'licenciado', 'dominio_publico', 'licenca_aberta'
  )),
  title               text not null check (length(btrim(title)) > 0),
  rights_holder       text not null check (length(btrim(rights_holder)) > 0),
  license             text not null check (length(btrim(license)) > 0),
  license_url         text,
  -- Onde está a prova do direito (termo de cessão, contrato, licença).
  evidence            text,
  rights_status       text not null default 'pendente'
    check (rights_status in ('pendente', 'verificado', 'recusado')),
  rights_verified_by  text references users (id),
  rights_verified_at  timestamptz,
  created_by          text not null references users (id),
  created_at          timestamptz not null default now(),
  check (rights_status <> 'verificado' or (rights_verified_by is not null and rights_verified_at is not null)),
  check (kind not in ('licenciado', 'licenca_aberta') or rights_status <> 'verificado' or evidence is not null)
);
create index if not exists content_sources_institution_idx on content_sources (institution_id);
create index if not exists content_sources_created_by_idx on content_sources (created_by);
create index if not exists content_sources_verified_by_idx on content_sources (rights_verified_by);

-- ------------------------------------------------------------
-- 2. Questões e versões
-- ------------------------------------------------------------
create table if not exists questions (
  id              text primary key,
  institution_id  text not null references institutions (id),
  component_id    text not null references curriculum_components (id),
  skill_id        text not null references curriculum_skills (id),
  created_by      text not null references users (id),
  created_at      timestamptz not null default now(),
  retired_at      timestamptz,
  unique (id, institution_id)
);
create index if not exists questions_institution_skill_idx on questions (institution_id, skill_id);
create index if not exists questions_component_idx on questions (component_id);
create index if not exists questions_skill_idx on questions (skill_id);
create index if not exists questions_created_by_idx on questions (created_by);

create table if not exists question_versions (
  id                    text primary key,
  institution_id        text not null,
  question_id           text not null,
  version               integer not null check (version >= 1),
  item_type             text not null default 'multipla_escolha'
    check (item_type in ('multipla_escolha')),
  stem                  text not null check (length(btrim(stem)) > 0),
  -- [{"key":"A","text":"..."}, ...] — de 2 a 5 alternativas.
  options               jsonb not null check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 5
  ),
  -- Rótulo editorial; NÃO é TRI.
  editorial_difficulty  text check (editorial_difficulty in ('facil', 'media', 'dificil')),
  source_id             text not null references content_sources (id),
  authorship            text not null check (length(btrim(authorship)) > 0),
  status                text not null default 'rascunho' check (status in (
    'rascunho', 'em_revisao', 'aprovada', 'devolvida', 'substituida'
  )),
  created_by            text not null references users (id),
  created_at            timestamptz not null default now(),
  submitted_at          timestamptz,
  decided_at            timestamptz,
  decided_by            text references users (id),
  unique (question_id, version),
  unique (id, institution_id),
  foreign key (question_id, institution_id) references questions (id, institution_id)
);
create index if not exists question_versions_question_idx on question_versions (question_id);
create index if not exists question_versions_status_idx on question_versions (institution_id, status);
create index if not exists question_versions_source_idx on question_versions (source_id);
create index if not exists question_versions_created_by_idx on question_versions (created_by);
create index if not exists question_versions_decided_by_idx on question_versions (decided_by);

create table if not exists question_version_keys (
  version_id      text primary key,
  institution_id  text not null,
  answer_key      text not null,
  resolution      text not null check (length(btrim(resolution)) > 0),
  created_at      timestamptz not null default now(),
  foreign key (version_id, institution_id) references question_versions (id, institution_id)
);
create index if not exists question_version_keys_institution_idx on question_version_keys (institution_id);

create table if not exists question_reviews (
  id              text primary key,
  institution_id  text not null,
  version_id      text not null,
  reviewer_id     text not null references users (id),
  decision        text not null check (decision in ('aprovada', 'devolvida')),
  -- {"gabarito":bool,"habilidade":bool,"direitos":bool,"linguagem":bool}
  checklist       jsonb not null,
  comment         text,
  created_at      timestamptz not null default now(),
  foreign key (version_id, institution_id) references question_versions (id, institution_id)
);
create index if not exists question_reviews_version_idx on question_reviews (version_id);
create index if not exists question_reviews_reviewer_idx on question_reviews (reviewer_id);
create index if not exists question_reviews_institution_idx on question_reviews (institution_id);

-- ------------------------------------------------------------
-- 3. Listas, tentativas, respostas e devolutivas
-- ------------------------------------------------------------
create table if not exists practice_lists (
  id                      text primary key,
  institution_id          text not null references institutions (id),
  classroom_id            text not null references classrooms (id),
  component_id            text not null references curriculum_components (id),
  kind                    text not null default 'diagnostica'
    check (kind in ('diagnostica', 'periodica', 'revisao')),
  title                   text not null check (length(btrim(title)) > 0),
  instructions            text not null default '',
  status                  text not null default 'rascunho'
    check (status in ('rascunho', 'publicada', 'encerrada')),
  -- Verdadeiro enquanto a escola não validar o currículo de origem.
  curriculum_provisional  boolean not null default true,
  created_by              text not null references users (id),
  created_at              timestamptz not null default now(),
  published_at            timestamptz,
  closed_at               timestamptz,
  unique (id, institution_id)
);
create index if not exists practice_lists_classroom_idx on practice_lists (classroom_id, status);
create index if not exists practice_lists_institution_idx on practice_lists (institution_id);
create index if not exists practice_lists_component_idx on practice_lists (component_id);
create index if not exists practice_lists_created_by_idx on practice_lists (created_by);

create table if not exists practice_list_items (
  id                    text primary key,
  institution_id        text not null,
  list_id               text not null,
  position              integer not null check (position between 1 and 50),
  question_version_id   text not null,
  -- Cópia da habilidade da questão, para relatórios por habilidade.
  skill_id              text not null references curriculum_skills (id),
  unique (list_id, position),
  unique (list_id, question_version_id),
  unique (id, institution_id),
  foreign key (list_id, institution_id) references practice_lists (id, institution_id),
  foreign key (question_version_id, institution_id) references question_versions (id, institution_id)
);
create index if not exists practice_list_items_version_idx on practice_list_items (question_version_id);
create index if not exists practice_list_items_skill_idx on practice_list_items (skill_id);
create index if not exists practice_list_items_institution_idx on practice_list_items (institution_id);

create table if not exists list_attempts (
  id              text primary key,
  institution_id  text not null,
  classroom_id    text not null references classrooms (id),
  list_id         text not null,
  student_id      text not null references students (id),
  status          text not null default 'em_andamento'
    check (status in ('em_andamento', 'entregue')),
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  score_correct   integer,
  score_total     integer,
  unique (list_id, student_id),
  unique (id, institution_id),
  foreign key (list_id, institution_id) references practice_lists (id, institution_id)
);
create index if not exists list_attempts_classroom_idx on list_attempts (classroom_id);
create index if not exists list_attempts_student_idx on list_attempts (student_id);
create index if not exists list_attempts_institution_idx on list_attempts (institution_id);

create table if not exists attempt_answers (
  id              text primary key,
  institution_id  text not null,
  attempt_id      text not null,
  list_item_id    text not null,
  student_id      text not null references students (id),
  selected_key    text not null check (length(btrim(selected_key)) > 0),
  -- Calculado pelo banco NA ENTREGA; NULL enquanto a tentativa está aberta.
  is_correct      boolean,
  answered_at     timestamptz not null default now(),
  unique (attempt_id, list_item_id),
  foreign key (attempt_id, institution_id) references list_attempts (id, institution_id),
  foreign key (list_item_id, institution_id) references practice_list_items (id, institution_id)
);
create index if not exists attempt_answers_item_idx on attempt_answers (list_item_id);
create index if not exists attempt_answers_student_idx on attempt_answers (student_id);
create index if not exists attempt_answers_institution_idx on attempt_answers (institution_id);

create table if not exists attempt_feedback (
  attempt_id       text primary key,
  institution_id   text not null,
  classroom_id     text not null references classrooms (id),
  student_id       text not null references students (id),
  teacher_user_id  text not null references users (id),
  comment          text not null check (length(btrim(comment)) > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (attempt_id, institution_id) references list_attempts (id, institution_id)
);
create index if not exists attempt_feedback_classroom_idx on attempt_feedback (classroom_id);
create index if not exists attempt_feedback_student_idx on attempt_feedback (student_id);
create index if not exists attempt_feedback_teacher_idx on attempt_feedback (teacher_user_id);
create index if not exists attempt_feedback_institution_idx on attempt_feedback (institution_id);

-- ------------------------------------------------------------
-- 4. Regras de integridade (triggers)
--
-- `security definer` nas conferências: precisam enxergar a linha real
-- mesmo quando a RLS a esconde do ator; só leem e recusam.
--
-- Operações que só o PRÓPRIO BANCO pode fazer (aplicar a decisão da
-- revisão na versão, calcular o acerto na entrega) ligam a marca local
-- de transação `iah.trusted` dentro dos triggers e a desligam em
-- seguida. Fora disso, a mesma regra vale para qualquer papel —
-- inclusive service_role. `current_user` não serve aqui: dentro de
-- função `security definer` ele é sempre o dono da função. A aplicação
-- só fala com o banco pelo PostgREST, que não expõe `set_config`.
-- ------------------------------------------------------------

create or replace function public.iah_trusted() returns boolean
language sql stable set search_path = public
as $$ select coalesce(current_setting('iah.trusted', true), '') = 'on'; $$;

revoke all on function public.iah_trusted() from public;
revoke execute on function public.iah_trusted() from anon, authenticated;

-- 4.1 Questão: componente e habilidade comuns ou da mesma escola, e
--     coerentes entre si.
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
  if tg_op = 'UPDATE' and (
       new.institution_id <> old.institution_id
       or new.component_id <> old.component_id
       or new.skill_id <> old.skill_id
       or new.created_by <> old.created_by
     ) then
    raise exception 'Escola, componente, habilidade e autoria da questão não mudam; crie outra questão.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists questions_scope on questions;
create trigger questions_scope before insert or update on questions
  for each row execute function public.iah_check_question_scope();

-- 4.2 Versão: fonte da mesma escola; alternativas bem formadas;
--     imutável após envio; transições de revisão só pela revisão.
create or replace function public.iah_check_question_version() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  keys text[];
begin
  if not exists (
    select 1 from content_sources
     where id = new.source_id and institution_id = new.institution_id
  ) then
    raise exception 'Fonte de outra instituição ou inexistente.' using errcode = '42501';
  end if;

  select array_agg(opt ->> 'key') into keys from jsonb_array_elements(new.options) opt;
  if exists (
    select 1 from jsonb_array_elements(new.options) opt
     where jsonb_typeof(opt) <> 'object'
        or coalesce(btrim(opt ->> 'key'), '') = ''
        or coalesce(btrim(opt ->> 'text'), '') = ''
  ) or array_length(keys, 1) <> (select count(distinct k) from unnest(keys) k) then
    raise exception 'Alternativas precisam de chave e texto, sem chaves repetidas.' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'rascunho' or new.decided_at is not null or new.decided_by is not null
       or new.submitted_at is not null then
      raise exception 'Versão nasce como rascunho.' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE
  if old.status <> 'rascunho' and (
       new.stem is distinct from old.stem
    or new.options is distinct from old.options
    or new.item_type is distinct from old.item_type
    or new.editorial_difficulty is distinct from old.editorial_difficulty
    or new.source_id is distinct from old.source_id
    or new.authorship is distinct from old.authorship
  ) then
    raise exception 'Versão enviada à revisão não pode ser alterada; crie uma nova versão.'
      using errcode = '23514';
  end if;
  if new.question_id is distinct from old.question_id
     or new.version is distinct from old.version
     or new.institution_id is distinct from old.institution_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Identidade da versão não muda.' using errcode = '23514';
  end if;

  if public.iah_trusted() then
    return new; -- decisão aplicada pela própria revisão (4.4)
  end if;
  if new.status is distinct from old.status then
    -- Fora da revisão, a única transição é o autor enviar o rascunho.
    if not (old.status = 'rascunho' and new.status = 'em_revisao') then
      raise exception 'Transição de status reservada à revisão editorial.' using errcode = '42501';
    end if;
    if not exists (select 1 from question_version_keys where version_id = new.id) then
      raise exception 'Envie gabarito e resolução antes da revisão.' using errcode = '23514';
    end if;
    new.submitted_at := now();
  elsif new.submitted_at is distinct from old.submitted_at then
    raise exception 'Data de envio é preenchida pelo banco.' using errcode = '42501';
  end if;
  if new.decided_at is distinct from old.decided_at
     or new.decided_by is distinct from old.decided_by then
    raise exception 'Campos de decisão são preenchidos pela revisão.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists question_versions_check on question_versions;
create trigger question_versions_check before insert or update on question_versions
  for each row execute function public.iah_check_question_version();

-- 4.3 Gabarito: chave entre as alternativas; só muda em rascunho.
create or replace function public.iah_check_question_key() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v record;
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
  if tg_op = 'UPDATE' and new.version_id is distinct from old.version_id then
    raise exception 'Gabarito não troca de versão.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists question_version_keys_check on question_version_keys;
create trigger question_version_keys_check before insert or update on question_version_keys
  for each row execute function public.iah_check_question_key();

-- 4.4 Revisão: append-only; aplica a decisão na versão.
create or replace function public.iah_apply_question_review() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v record;
  src record;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Revisão é registro permanente; registre uma nova.' using errcode = '42501';
  end if;

  select id, question_id, status, created_by, source_id into v
    from question_versions where id = new.version_id for update;
  if v.status <> 'em_revisao' then
    raise exception 'Só versões em revisão recebem decisão.' using errcode = '23514';
  end if;
  if new.reviewer_id = v.created_by then
    raise exception 'Quem escreveu a versão não pode revisá-la.' using errcode = '42501';
  end if;

  if new.decision = 'aprovada' then
    if not (
      coalesce((new.checklist ->> 'gabarito')::boolean, false)
      and coalesce((new.checklist ->> 'habilidade')::boolean, false)
      and coalesce((new.checklist ->> 'direitos')::boolean, false)
      and coalesce((new.checklist ->> 'linguagem')::boolean, false)
    ) then
      raise exception 'Aprovação exige todos os itens da conferência.' using errcode = '23514';
    end if;
    select rights_status into src from content_sources where id = v.source_id;
    if src.rights_status <> 'verificado' then
      raise exception 'Fonte sem direitos verificados não pode ser aprovada.' using errcode = '23514';
    end if;
    if not exists (select 1 from question_version_keys where version_id = v.id) then
      raise exception 'Versão sem gabarito e resolução.' using errcode = '23514';
    end if;

    perform set_config('iah.trusted', 'on', true);
    update question_versions set status = 'substituida'
     where question_id = v.question_id and status = 'aprovada' and id <> v.id;
    update question_versions
       set status = 'aprovada', decided_at = now(), decided_by = new.reviewer_id
     where id = v.id;
    perform set_config('iah.trusted', '', true);
  else
    if coalesce(btrim(new.comment), '') = '' then
      raise exception 'Devolução exige comentário para o autor.' using errcode = '23514';
    end if;
    perform set_config('iah.trusted', 'on', true);
    update question_versions
       set status = 'devolvida', decided_at = now(), decided_by = new.reviewer_id
     where id = v.id;
    perform set_config('iah.trusted', '', true);
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists question_reviews_apply on question_reviews;
create trigger question_reviews_apply before insert or update on question_reviews
  for each row execute function public.iah_apply_question_review();

-- 4.5 Lista: turma e componente da escola; publicação só com itens
--     aprovados; depois de publicada, só encerra.
create or replace function public.iah_check_practice_list() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  comp record;
begin
  if not exists (
    select 1 from classrooms where id = new.classroom_id and institution_id = new.institution_id
  ) then
    raise exception 'Turma de outra instituição.' using errcode = '42501';
  end if;
  select institution_id into comp from curriculum_components where id = new.component_id;
  if comp.institution_id is not null and comp.institution_id <> new.institution_id then
    raise exception 'Componente de outra instituição.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'rascunho' then
      raise exception 'Lista nasce como rascunho.' using errcode = '23514';
    end if;
    return new;
  end if;

  if new.institution_id <> old.institution_id or new.classroom_id <> old.classroom_id
     or new.created_by <> old.created_by then
    raise exception 'Escola, turma e autoria da lista não mudam.' using errcode = '23514';
  end if;
  if old.status <> 'rascunho' and (
       new.title is distinct from old.title
    or new.instructions is distinct from old.instructions
    or new.component_id is distinct from old.component_id
    or new.kind is distinct from old.kind
  ) then
    raise exception 'Lista publicada não muda de conteúdo.' using errcode = '23514';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'rascunho' and new.status = 'publicada' then
      if not exists (select 1 from practice_list_items where list_id = new.id) then
        raise exception 'Lista sem itens não pode ser publicada.' using errcode = '23514';
      end if;
      if exists (
        select 1 from practice_list_items i
          join question_versions v on v.id = i.question_version_id
         where i.list_id = new.id and v.status <> 'aprovada'
      ) then
        raise exception 'Só versões aprovadas na revisão podem ser publicadas.' using errcode = '23514';
      end if;
      new.published_at := now();
    elsif old.status = 'publicada' and new.status = 'encerrada' then
      new.closed_at := now();
    else
      raise exception 'Transição de lista inválida (%→%).', old.status, new.status using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists practice_lists_check on practice_lists;
create trigger practice_lists_check before insert or update on practice_lists
  for each row execute function public.iah_check_practice_list();

-- 4.6 Item: só versão aprovada, só em lista em rascunho; habilidade
--     copiada da questão (não informada pelo cliente).
create or replace function public.iah_check_practice_list_item() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  lst record;
  v record;
begin
  select status into lst from practice_lists where id = new.list_id;
  if lst.status <> 'rascunho' then
    raise exception 'Itens só mudam enquanto a lista é rascunho.' using errcode = '23514';
  end if;
  select qv.status, q.skill_id into v
    from question_versions qv join questions q on q.id = qv.question_id
   where qv.id = new.question_version_id;
  if v.status <> 'aprovada' then
    raise exception 'Só versões aprovadas na revisão entram em lista.' using errcode = '23514';
  end if;
  new.skill_id := v.skill_id;
  return new;
end;
$$;

drop trigger if exists practice_list_items_check on practice_list_items;
create trigger practice_list_items_check before insert or update on practice_list_items
  for each row execute function public.iah_check_practice_list_item();

-- 4.7 Tentativa: lista publicada da turma; entrega calcula a correção
--     e congela a tentativa.
create or replace function public.iah_check_list_attempt() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  lst record;
begin
  select status, classroom_id into lst from practice_lists where id = new.list_id;

  if tg_op = 'INSERT' then
    if lst.status <> 'publicada' then
      raise exception 'Lista não está aberta para respostas.' using errcode = '23514';
    end if;
    if new.classroom_id <> lst.classroom_id then
      raise exception 'Tentativa fora da turma da lista.' using errcode = '23514';
    end if;
    if new.status <> 'em_andamento' then
      raise exception 'Tentativa nasce em andamento.' using errcode = '23514';
    end if;
    new.score_correct := null;
    new.score_total := null;
    new.submitted_at := null;
    return new;
  end if;

  if old.status = 'entregue' then
    raise exception 'Tentativa entregue não muda.' using errcode = '23514';
  end if;
  if new.list_id <> old.list_id or new.student_id <> old.student_id
     or new.classroom_id <> old.classroom_id or new.institution_id <> old.institution_id then
    raise exception 'Identidade da tentativa não muda.' using errcode = '23514';
  end if;

  if new.status = 'entregue' then
    if lst.status <> 'publicada' then
      raise exception 'Lista encerrada não recebe entregas.' using errcode = '23514';
    end if;
    perform set_config('iah.trusted', 'on', true);
    update attempt_answers a
       set is_correct = (a.selected_key = k.answer_key)
      from practice_list_items i
      join question_version_keys k on k.version_id = i.question_version_id
     where a.attempt_id = new.id and i.id = a.list_item_id;
    perform set_config('iah.trusted', '', true);
    select count(*) filter (where a.is_correct), (select count(*) from practice_list_items where list_id = new.list_id)
      into new.score_correct, new.score_total
      from attempt_answers a where a.attempt_id = new.id;
    new.submitted_at := now();
  else
    new.score_correct := old.score_correct;
    new.score_total := old.score_total;
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists list_attempts_check on list_attempts;
create trigger list_attempts_check before insert or update on list_attempts
  for each row execute function public.iah_check_list_attempt();

-- 4.8 Resposta: item da lista da tentativa; alternativa existente;
--     só enquanto a tentativa está aberta; acerto nunca vem do cliente.
create or replace function public.iah_check_attempt_answer() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  att record;
  itm record;
begin
  select status, list_id, student_id into att from list_attempts where id = new.attempt_id;
  if not public.iah_trusted() then
    if att.status <> 'em_andamento' then
      raise exception 'Tentativa entregue não aceita respostas.' using errcode = '23514';
    end if;
    if new.student_id <> att.student_id then
      raise exception 'Resposta de outro aluno.' using errcode = '42501';
    end if;
    select i.list_id, v.options into itm
      from practice_list_items i join question_versions v on v.id = i.question_version_id
     where i.id = new.list_item_id;
    if itm.list_id <> att.list_id then
      raise exception 'Item não pertence a esta lista.' using errcode = '23514';
    end if;
    if not exists (
      select 1 from jsonb_array_elements(itm.options) opt where opt ->> 'key' = new.selected_key
    ) then
      raise exception 'Alternativa inexistente.' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and (new.attempt_id <> old.attempt_id or new.list_item_id <> old.list_item_id) then
      raise exception 'Identidade da resposta não muda.' using errcode = '23514';
    end if;
    new.is_correct := null;
    new.answered_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists attempt_answers_check on attempt_answers;
create trigger attempt_answers_check before insert or update on attempt_answers
  for each row execute function public.iah_check_attempt_answer();

-- 4.9 Devolutiva: só sobre tentativa entregue; turma/aluno coerentes.
create or replace function public.iah_check_attempt_feedback() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  att record;
begin
  select status, classroom_id, student_id, institution_id into att
    from list_attempts where id = new.attempt_id;
  if att.status <> 'entregue' then
    raise exception 'Devolutiva só depois da entrega.' using errcode = '23514';
  end if;
  if new.classroom_id <> att.classroom_id or new.student_id <> att.student_id
     or new.institution_id <> att.institution_id then
    raise exception 'Devolutiva incoerente com a tentativa.' using errcode = '23514';
  end if;
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists attempt_feedback_check on attempt_feedback;
create trigger attempt_feedback_check before insert or update on attempt_feedback
  for each row execute function public.iah_check_attempt_feedback();

revoke all on function public.iah_check_question_scope() from public;
-- (iah_trusted já revogada acima)
revoke all on function public.iah_check_question_version() from public;
revoke all on function public.iah_check_question_key() from public;
revoke all on function public.iah_apply_question_review() from public;
revoke all on function public.iah_check_practice_list() from public;
revoke all on function public.iah_check_practice_list_item() from public;
revoke all on function public.iah_check_list_attempt() from public;
revoke all on function public.iah_check_attempt_answer() from public;
revoke all on function public.iah_check_attempt_feedback() from public;

-- ------------------------------------------------------------
-- 5. Funções de visibilidade usadas pelas policies
-- ------------------------------------------------------------

-- O aluno alcança a lista? (publicada/encerrada, turma em que está
-- matriculado.) `security definer`: evita recursão entre policies.
create or replace function public.iah_student_reaches_list(target_list text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from practice_lists l
     where l.id = target_list
       and l.institution_id = public.iah_actor_institution()
       and l.status in ('publicada', 'encerrada')
       and public.iah_enrolled(l.classroom_id)
  );
$$;

-- O professor dá aula na turma da lista?
create or replace function public.iah_teaches_list(target_list text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from practice_lists l
     where l.id = target_list
       and l.institution_id = public.iah_actor_institution()
       and public.iah_teaches(l.classroom_id)
  );
$$;

-- A equipe alcança a lista? (gestão: toda a escola; professor: as suas.)
create or replace function public.iah_staff_reaches_list(target_list text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from practice_lists l
     where l.id = target_list
       and l.institution_id = public.iah_actor_institution()
       and public.iah_is_staff()
       and public.iah_reaches_classroom(l.classroom_id)
  );
$$;

-- O aluno vê o enunciado desta versão? (está numa lista que ele alcança)
create or replace function public.iah_student_sees_version(target_version text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from practice_list_items i
     where i.question_version_id = target_version
       and public.iah_student_reaches_list(i.list_id)
  );
$$;

-- O aluno já ENTREGOU uma lista com esta versão? (libera gabarito e
-- resolução — nunca antes.)
create or replace function public.iah_student_submitted_version(target_version text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from practice_list_items i
      join list_attempts a on a.list_id = i.list_id
     where i.question_version_id = target_version
       and a.student_id = public.iah_actor_student()
       and a.institution_id = public.iah_actor_institution()
       and a.status = 'entregue'
  );
$$;

-- A tentativa é do aluno do ator?
create or replace function public.iah_owns_attempt(target_attempt text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from list_attempts a
     where a.id = target_attempt
       and a.student_id = public.iah_actor_student()
       and a.institution_id = public.iah_actor_institution()
  );
$$;

-- A equipe alcança a tentativa?
create or replace function public.iah_staff_reaches_attempt(target_attempt text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from list_attempts a
     where a.id = target_attempt
       and a.institution_id = public.iah_actor_institution()
       and public.iah_is_staff()
       and public.iah_reaches_classroom(a.classroom_id)
  );
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'iah_student_reaches_list(text)', 'iah_teaches_list(text)', 'iah_staff_reaches_list(text)',
    'iah_student_sees_version(text)', 'iah_student_submitted_version(text)',
    'iah_owns_attempt(text)', 'iah_staff_reaches_attempt(text)'
  ] loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('revoke execute on function public.%s from anon, authenticated', fn);
    execute format('grant execute on function public.%s to iah_app', fn);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 6. RLS + grants
-- ------------------------------------------------------------
alter table content_sources        enable row level security;
alter table questions              enable row level security;
alter table question_versions      enable row level security;
alter table question_version_keys  enable row level security;
alter table question_reviews       enable row level security;
alter table practice_lists         enable row level security;
alter table practice_list_items    enable row level security;
alter table list_attempts          enable row level security;
alter table attempt_answers        enable row level security;
alter table attempt_feedback       enable row level security;

revoke all on content_sources, questions, question_versions, question_version_keys,
              question_reviews, practice_lists, practice_list_items, list_attempts,
              attempt_answers, attempt_feedback from anon, authenticated;

grant select, insert, update, delete on content_sources, questions, question_versions,
  question_version_keys, question_reviews, practice_lists, practice_list_items,
  list_attempts, attempt_answers, attempt_feedback to service_role;

grant select, insert, update on content_sources, questions, question_versions,
  question_version_keys, practice_lists, practice_list_items, list_attempts,
  attempt_answers, attempt_feedback to iah_app;
-- Revisão é append-only também para a aplicação.
grant select, insert on question_reviews to iah_app;

-- 6.1 Fontes: equipe da escola lê e cadastra (sempre 'pendente');
--     só a gestão verifica direitos.
drop policy if exists iah_app_sources_read on content_sources;
create policy iah_app_sources_read on content_sources for select to iah_app
  using (institution_id = public.iah_actor_institution() and public.iah_is_staff());

drop policy if exists iah_app_sources_insert on content_sources;
create policy iah_app_sources_insert on content_sources for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_is_staff()
    and created_by = public.iah_actor_user()
    and rights_status = 'pendente'
    and rights_verified_by is null
  );

drop policy if exists iah_app_sources_update on content_sources;
create policy iah_app_sources_update on content_sources for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'administrador'
  )
  with check (
    institution_id = public.iah_actor_institution()
    and (rights_verified_by is null or rights_verified_by = public.iah_actor_user())
  );

-- 6.2 Questões: o banco é da escola — toda a equipe lê; equipe cria
--     em nome próprio. Aluno não lê a tabela de questões.
drop policy if exists iah_app_questions_read on questions;
create policy iah_app_questions_read on questions for select to iah_app
  using (institution_id = public.iah_actor_institution() and public.iah_is_staff());

drop policy if exists iah_app_questions_insert on questions;
create policy iah_app_questions_insert on questions for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_is_staff()
    and created_by = public.iah_actor_user()
  );

drop policy if exists iah_app_questions_update on questions;
create policy iah_app_questions_update on questions for update to iah_app
  using (institution_id = public.iah_actor_institution() and created_by = public.iah_actor_user())
  with check (institution_id = public.iah_actor_institution());

-- 6.3 Versões: equipe lê todas da escola; aluno lê só o que está numa
--     lista que ele alcança. Autor cria e edita só o próprio rascunho.
drop policy if exists iah_app_versions_read on question_versions;
create policy iah_app_versions_read on question_versions for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (public.iah_is_staff() or public.iah_student_sees_version(id))
  );

drop policy if exists iah_app_versions_insert on question_versions;
create policy iah_app_versions_insert on question_versions for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_is_staff()
    and created_by = public.iah_actor_user()
    and status = 'rascunho'
  );

drop policy if exists iah_app_versions_update on question_versions;
create policy iah_app_versions_update on question_versions for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and created_by = public.iah_actor_user()
    and status = 'rascunho'
  )
  with check (institution_id = public.iah_actor_institution() and created_by = public.iah_actor_user());

-- 6.4 Gabarito/resolução: equipe lê; aluno só depois de ENTREGAR.
drop policy if exists iah_app_keys_read on question_version_keys;
create policy iah_app_keys_read on question_version_keys for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (public.iah_is_staff() or public.iah_student_submitted_version(version_id))
  );

drop policy if exists iah_app_keys_insert on question_version_keys;
create policy iah_app_keys_insert on question_version_keys for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and exists (
      select 1 from question_versions v
       where v.id = version_id and v.created_by = public.iah_actor_user()
    )
  );

drop policy if exists iah_app_keys_update on question_version_keys;
create policy iah_app_keys_update on question_version_keys for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and exists (
      select 1 from question_versions v
       where v.id = version_id and v.created_by = public.iah_actor_user()
    )
  )
  with check (institution_id = public.iah_actor_institution());

-- 6.5 Revisões: equipe lê e registra em nome próprio (autor ≠ revisor
--     é conferido no trigger).
drop policy if exists iah_app_reviews_bank_read on question_reviews;
create policy iah_app_reviews_bank_read on question_reviews for select to iah_app
  using (institution_id = public.iah_actor_institution() and public.iah_is_staff());

drop policy if exists iah_app_reviews_bank_insert on question_reviews;
create policy iah_app_reviews_bank_insert on question_reviews for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() in ('professor', 'administrador')
    and reviewer_id = public.iah_actor_user()
  );

-- 6.6 Listas: equipe que alcança a turma lê; aluno lê as publicadas da
--     sua turma; só o professor da turma cria e altera.
drop policy if exists iah_app_lists_read on practice_lists;
create policy iah_app_lists_read on practice_lists for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
      or (status in ('publicada', 'encerrada') and public.iah_enrolled(classroom_id))
    )
  );

drop policy if exists iah_app_lists_insert on practice_lists;
create policy iah_app_lists_insert on practice_lists for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
    and created_by = public.iah_actor_user()
  );

drop policy if exists iah_app_lists_update on practice_lists;
create policy iah_app_lists_update on practice_lists for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  )
  with check (institution_id = public.iah_actor_institution() and public.iah_teaches(classroom_id));

drop policy if exists iah_app_list_items_read on practice_list_items;
create policy iah_app_list_items_read on practice_list_items for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (public.iah_staff_reaches_list(list_id) or public.iah_student_reaches_list(list_id))
  );

drop policy if exists iah_app_list_items_insert on practice_list_items;
create policy iah_app_list_items_insert on practice_list_items for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches_list(list_id)
  );

drop policy if exists iah_app_list_items_update on practice_list_items;
create policy iah_app_list_items_update on practice_list_items for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches_list(list_id)
  )
  with check (institution_id = public.iah_actor_institution() and public.iah_teaches_list(list_id));

-- 6.7 Tentativas e respostas: do aluno; equipe que alcança a turma lê.
drop policy if exists iah_app_attempts_read on list_attempts;
create policy iah_app_attempts_read on list_attempts for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      student_id = public.iah_actor_student()
      or (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
    )
  );

drop policy if exists iah_app_attempts_insert on list_attempts;
create policy iah_app_attempts_insert on list_attempts for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'aluno'
    and student_id = public.iah_actor_student()
    and public.iah_enrolled(classroom_id)
    and public.iah_student_reaches_list(list_id)
  );

drop policy if exists iah_app_attempts_update on list_attempts;
create policy iah_app_attempts_update on list_attempts for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
  )
  with check (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
  );

drop policy if exists iah_app_answers_read on attempt_answers;
create policy iah_app_answers_read on attempt_answers for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      student_id = public.iah_actor_student()
      or public.iah_staff_reaches_attempt(attempt_id)
    )
  );

drop policy if exists iah_app_answers_insert on attempt_answers;
create policy iah_app_answers_insert on attempt_answers for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
    and public.iah_owns_attempt(attempt_id)
  );

drop policy if exists iah_app_answers_update on attempt_answers;
create policy iah_app_answers_update on attempt_answers for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
  )
  with check (
    institution_id = public.iah_actor_institution()
    and student_id = public.iah_actor_student()
    and public.iah_owns_attempt(attempt_id)
  );

-- 6.8 Devolutiva: o aluno lê a sua; equipe que alcança a turma lê; só o
--     professor da turma escreve, em nome próprio.
drop policy if exists iah_app_feedback_read on attempt_feedback;
create policy iah_app_feedback_read on attempt_feedback for select to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and (
      student_id = public.iah_actor_student()
      or (public.iah_is_staff() and public.iah_reaches_classroom(classroom_id))
    )
  );

drop policy if exists iah_app_feedback_insert on attempt_feedback;
create policy iah_app_feedback_insert on attempt_feedback for insert to iah_app
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
    and teacher_user_id = public.iah_actor_user()
  );

drop policy if exists iah_app_feedback_update on attempt_feedback;
create policy iah_app_feedback_update on attempt_feedback for update to iah_app
  using (
    institution_id = public.iah_actor_institution()
    and public.iah_actor_role() = 'professor'
    and public.iah_teaches(classroom_id)
  )
  with check (
    institution_id = public.iah_actor_institution()
    and public.iah_teaches(classroom_id)
    and teacher_user_id = public.iah_actor_user()
  );
