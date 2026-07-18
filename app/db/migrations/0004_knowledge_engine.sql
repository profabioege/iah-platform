-- ============================================================
-- IAH Educacional — Migration 0004: Knowledge Engine (Biblioteca Inteligente)
-- Ver docs/KNOWLEDGE_ENGINE.md e DECISIONS.md D-034.
--
-- REGRAS (mesmas de 0001/0002/0003):
--  * NENHUM dado é inserido aqui. Seeds de demonstração vivem em
--    modules/knowledge/seeds/, em memória, nunca no banco real.
--  * Escopo: a maioria dos recursos é "global" (catálogo oficial IAH,
--    mesma exceção multi-tenant já aplicada a `missions`, ver 0001) —
--    institution_id só é obrigatório quando scope = 'institution'
--    (docs/DOMAIN_MODEL.md, "Biblioteca: escopo IAH/escola").
--  * RLS entra junto com a autenticação real, mesma regra da 0001.
-- ============================================================

create table knowledge_sources (
  id            text primary key,
  kind          text not null check (kind in ('manual', 'notebooklm', 'google_drive', 'google_docs', 'youtube', 'openalex', 'scielo', 'crossref')),
  label         text not null,
  external_id   text,
  url           text,
  imported_at   timestamptz
);

create table knowledge_topics (
  id               text primary key,
  label            text not null,
  parent_topic_id  text references knowledge_topics (id)
);

create table knowledge_tags (
  id     text primary key,
  label  text not null unique
);

create table knowledge_documents (
  id                              text primary key,
  scope                           text not null default 'global' check (scope in ('global', 'institution')),
  institution_id                  text references institutions (id),
  source_id                       text not null references knowledge_sources (id),
  title                           text not null,
  resource_type                   text not null check (resource_type in (
                                     'artigo', 'pdf', 'slides', 'video', 'estudo_de_caso', 'lei',
                                     'normativa', 'pesquisa', 'infografico', 'site', 'livro',
                                     'material_professor', 'material_aluno'
                                   )),
  author                          text,
  source_name                     text,
  year                            integer,
  language                        text not null default 'pt-BR',
  summary                         text,
  keywords                        text[] not null default '{}',
  bncc_competencies               text[] not null default '{}',
  bncc_computacao_competencies    text[] not null default '{}',
  grade                           text,
  estimated_minutes               integer,
  difficulty_level                text check (difficulty_level in ('introdutorio', 'intermediario', 'avancado')),
  license                         text,
  status                          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  content_ref                     text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  -- scope = 'institution' precisa de institution_id; scope = 'global' não carrega tenant.
  check ((scope = 'institution') = (institution_id is not null))
);
create index knowledge_documents_institution_idx on knowledge_documents (institution_id);
create index knowledge_documents_resource_type_idx on knowledge_documents (resource_type);
create index knowledge_documents_grade_idx on knowledge_documents (grade);

create table knowledge_document_tags (
  document_id  text not null references knowledge_documents (id),
  tag_id       text not null references knowledge_tags (id),
  primary key (document_id, tag_id)
);

create table knowledge_document_topics (
  document_id  text not null references knowledge_documents (id),
  topic_id     text not null references knowledge_topics (id),
  primary key (document_id, topic_id)
);

create table knowledge_collections (
  id            text primary key,
  title         text not null,
  description   text
);

create table knowledge_collection_documents (
  collection_id  text not null references knowledge_collections (id),
  document_id    text not null references knowledge_documents (id),
  primary key (collection_id, document_id)
);

-- O vínculo direto Biblioteca <-> Lesson / Mission Flow (Sprint M11).
-- `lesson_id` não tem foreign key ainda: `Lesson` (D-028) segue sem
-- tabela própria — o vínculo é registrado por id solto até lá.
create table knowledge_references (
  id            text primary key,
  document_id   text not null references knowledge_documents (id),
  relation      text not null check (relation in ('lesson', 'mission')),
  lesson_id     text,
  mission_id    text references missions (id),
  note          text,
  check (
    (relation = 'lesson' and lesson_id is not null and mission_id is null) or
    (relation = 'mission' and mission_id is not null and lesson_id is null)
  )
);
create index knowledge_references_document_idx on knowledge_references (document_id);
create index knowledge_references_lesson_idx on knowledge_references (lesson_id);
create index knowledge_references_mission_idx on knowledge_references (mission_id);
