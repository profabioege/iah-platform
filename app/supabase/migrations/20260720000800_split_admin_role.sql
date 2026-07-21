-- ============================================================
-- IAH Educacional — Migration 0008: Divisão do papel "administrador"
-- Ver DECISIONS.md D-046.
--
-- O papel institucional único "administrador" passa a ter três
-- sucessores reais: "diretor" (Direção, uma unidade escolar),
-- "mantenedor" (rede/grupo de unidades) e "coordenador_pedagogico"
-- (Coordenação Pedagógica). Aditiva e reversível: mantém os quatro
-- valores antigos (nenhum perfil existente quebra), só amplia o
-- conjunto permitido. Nenhuma política de RLS referencia valores de
-- `role` hoje (deny-by-default, D-025) — nada a ajustar ali.
--
-- NÃO aplicada nesta etapa (nenhum `supabase db push`/execução direta
-- contra o banco) — só o arquivo, pronto para quando for autorizado.
-- ============================================================

alter table profiles drop constraint if exists profiles_role_check;

alter table profiles add constraint profiles_role_check check (
  role in (
    'aluno',
    'professor',
    'administrador',
    'admin_iah',
    'diretor',
    'mantenedor',
    'coordenador_pedagogico'
  )
);
