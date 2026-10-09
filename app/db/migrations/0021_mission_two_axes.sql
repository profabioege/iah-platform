-- ============================================================
-- IAH Educacional — Migration 0021: Missão com dois eixos
-- (aprendizagem da disciplina × competência em IA)
--
-- Decisão: docs/DECISIONS.md D-053 e
-- docs/reformulacao/07-dois-eixos-ia-e-disciplinas.md.
--
-- Problema: uma Missão de IA & Humanidades tem um objetivo da disciplina
-- (ex.: História, EM13CHS101) e um objetivo de competência em IA. Até
-- aqui a entrega era um texto único e a avaliação, um conceito único:
-- o professor não tinha como registrar, por exemplo, que o aluno acertou
-- a análise histórica mas não verificou criticamente a resposta da IA.
--
-- Esta migration é SÓ ADITIVA (nenhuma coluna existente muda, nada é
-- removido, nenhum dado é inserido):
--
-- 1. `productions` ganha o REGISTRO DE USO DA IA do aluno, em campos
--    separados do texto da produção: ferramenta, o que pediu, o que a
--    IA respondeu, como verificou e o que manteve/corrigiu/descartou.
--    Mesmas policies de `productions` (0010): o aluno escreve o seu; a
--    equipe da turma lê.
-- 2. `mission_reviews` ganha a AVALIAÇÃO POR EIXO: nível, critérios
--    observados e comentário para a disciplina e para a IA, mais o que
--    foi avaliado (habilidade e competências). Mesmas policies de
--    `mission_reviews` (0010): só o professor da turma escreve.
--
-- Missões sem dois eixos (anteriores a este incremento) seguem com os
-- campos novos nulos; a regra "os dois eixos juntos" é imposta abaixo.
-- Idempotente (`if not exists`).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Registro de uso da IA (aluno)
-- ------------------------------------------------------------
alter table productions add column if not exists ai_tool         text;
alter table productions add column if not exists ai_request      text;
alter table productions add column if not exists ai_response     text;
alter table productions add column if not exists ai_verification text;
alter table productions add column if not exists ai_decision     text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'productions_ai_evidence_length_check'
  ) then
    alter table productions add constraint productions_ai_evidence_length_check check (
      coalesce(length(ai_tool), 0) <= 200
      and coalesce(length(ai_request), 0) <= 2000
      and coalesce(length(ai_response), 0) <= 3000
      and coalesce(length(ai_verification), 0) <= 3000
      and coalesce(length(ai_decision), 0) <= 3000
    );
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Avaliação por eixo (professor)
-- ------------------------------------------------------------
alter table mission_reviews add column if not exists discipline_level     text;
alter table mission_reviews add column if not exists discipline_skill     text;
alter table mission_reviews add column if not exists discipline_criteria  jsonb not null default '[]'::jsonb;
alter table mission_reviews add column if not exists discipline_note      text not null default '';
alter table mission_reviews add column if not exists ai_level             text;
alter table mission_reviews add column if not exists ai_competencies      jsonb not null default '[]'::jsonb;
alter table mission_reviews add column if not exists ai_criteria          jsonb not null default '[]'::jsonb;
alter table mission_reviews add column if not exists ai_note              text not null default '';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'mission_reviews_axis_levels_check'
  ) then
    alter table mission_reviews add constraint mission_reviews_axis_levels_check check (
      (discipline_level is null
        or discipline_level in ('nao_evidenciado', 'em_desenvolvimento', 'atingido', 'superado'))
      and (ai_level is null
        or ai_level in ('nao_evidenciado', 'em_desenvolvimento', 'atingido', 'superado'))
      -- Os dois eixos andam juntos: ou a Missão é avaliada nos dois, ou
      -- (Missão antiga, sem eixos) em nenhum.
      and ((discipline_level is null) = (ai_level is null))
      -- Eixo disciplinar avaliado sempre diz QUAL habilidade foi avaliada.
      and (discipline_level is null or coalesce(discipline_skill, '') <> '')
      and jsonb_typeof(discipline_criteria) = 'array'
      and jsonb_typeof(ai_competencies) = 'array'
      and jsonb_typeof(ai_criteria) = 'array'
      and length(discipline_note) <= 2000
      and length(ai_note) <= 2000
    );
  end if;
end $$;

-- Rollback manual (só se nenhuma avaliação por eixo tiver sido gravada):
--   alter table mission_reviews drop constraint mission_reviews_axis_levels_check;
--   alter table mission_reviews drop column discipline_level, drop column discipline_skill,
--     drop column discipline_criteria, drop column discipline_note, drop column ai_level,
--     drop column ai_competencies, drop column ai_criteria, drop column ai_note;
--   alter table productions drop constraint productions_ai_evidence_length_check;
--   alter table productions drop column ai_tool, drop column ai_request,
--     drop column ai_response, drop column ai_verification, drop column ai_decision;
