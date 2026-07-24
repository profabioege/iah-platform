-- ============================================================
-- IAH Educacional — Migration 0010: novos tipos de material do
-- Planejador Conversacional (DocentIAH).
--
-- NÃO APLICADA AUTOMATICAMENTE. Este arquivo só existe no repositório
-- (mesma convenção das migrations anteriores) — quem decide quando
-- rodar `supabase db push` (ou equivalente) contra o banco real é o
-- time do projeto, nunca este commit. Até lá, GeneratedMaterialType/
-- GeneratedMaterialStatus com "lesson_plan"/"infographic"/"mind_map"/
-- "draft" só funcionam contra o repositório seed/demo (TypeScript
-- puro, sem CHECK constraint).
--
-- Puramente aditiva: só amplia dois CHECK constraints existentes
-- (generated_materials.type e generated_materials.status) — nenhuma
-- coluna, tabela ou dado é alterado/removido.
-- ============================================================

alter table generated_materials
  drop constraint generated_materials_type_check;
alter table generated_materials
  add constraint generated_materials_type_check
    check (type in ('slides', 'laboratory_lesson', 'lesson_plan', 'infographic', 'mind_map'));

alter table generated_materials
  drop constraint generated_materials_status_check;
alter table generated_materials
  add constraint generated_materials_status_check
    check (status in ('generated', 'saved', 'draft'));

-- Rollback manual:
-- alter table generated_materials drop constraint generated_materials_type_check;
-- alter table generated_materials add constraint generated_materials_type_check check (type in ('slides', 'laboratory_lesson'));
-- alter table generated_materials drop constraint generated_materials_status_check;
-- alter table generated_materials add constraint generated_materials_status_check check (status in ('generated', 'saved'));
