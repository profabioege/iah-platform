-- ============================================================
-- IAH Educacional — Migration 0008: Referências Oficiais da Biblioteca
-- Extensão mínima do Knowledge Engine (0004/0005) para suportar
-- documentos oficiais externos (ex.: referenciais publicados por
-- órgãos como o MEC) com metadados bibliográficos completos e
-- unidades de conteúdo (capítulo/seção/página) citáveis.
--
-- REGRAS (mesmas de 0004/0005):
--  * NENHUM dado é inserido aqui. A ingestão real é feita por um
--    importador determinístico fora desta migration
--    (modules/knowledge/domain/official-reference-importer.ts).
--  * RLS entra sem policies próprias — mesmo padrão "deny by default"
--    de todas as tabelas de knowledge_* (não é o padrão de grants
--    explícitos usado em iah_jobs/D-047, que é uma exceção
--    justificada só para a fila assíncrona).
--  * Nenhuma tabela nova tem institution_id: referência oficial é
--    sempre `knowledge_documents.scope = 'global'`, já impedido de
--    carregar institution_id pelo check constraint da 0004.
-- ============================================================

-- Categoria do documento — hoje só distingue "referencial oficial"
-- dos demais recursos da Biblioteca (artigo, PDF, vídeo etc., que
-- continuam sem categoria, valor null).
alter table knowledge_documents
  add column category text check (category in ('official_reference'));

-- Extensão 1:1 de `knowledge_documents` — só existe para documentos
-- com category = 'official_reference'. Fica em tabela própria (e não
-- como colunas nullable direto em knowledge_documents) porque nenhum
-- outro tipo de recurso da Biblioteca usa esses campos.
create table knowledge_official_references (
  document_id           text primary key references knowledge_documents (id),
  institutional_author   text not null,
  publisher              text not null,
  publisher_short_name   text not null,
  edition                text not null,
  publication_place      text not null,
  publication_date       text not null,
  original_format        text not null,
  working_format         text not null,
  -- Registro honesto de direitos: nunca alega licenciamento aberto.
  -- Ver docs/product/mec-referencial-ia-2026-integration.md.
  rights_statement        text not null,
  checksum                text not null,
  version                 integer not null default 1,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Unidade de conteúdo endereçável e citável (capítulo/seção/subseção +
-- intervalo de página do documento original). `sequence` preserva a
-- ordem de leitura; `unique` evita duplicar a mesma unidade ao
-- reprocessar o mesmo documento (idempotência do importador).
create table knowledge_document_units (
  id                    text primary key,
  document_id           text not null references knowledge_documents (id),
  chapter               text,
  section               text,
  subsection            text,
  original_start_page   integer not null check (original_start_page >= 1),
  original_end_page     integer not null check (original_end_page >= original_start_page),
  text                  text not null,
  content_nature        text not null check (content_nature in (
                          'original_source', 'curated_summary', 'institutional_mapping', 'ai_suggestion'
                        )),
  topics                text[] not null default '{}',
  educational_stages    text[] not null default '{}',
  sequence              integer not null,
  checksum              text not null,
  unique (document_id, sequence)
);
create index knowledge_document_units_document_idx on knowledge_document_units (document_id);

alter table knowledge_official_references enable row level security;
alter table knowledge_document_units       enable row level security;
