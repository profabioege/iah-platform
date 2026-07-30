/**
 * Driver PostgreSQL para referências oficiais e unidades documentais
 * (migration 0008). Mesmo padrão de fronteira estreita de
 * `modules/jobs/infrastructure/database/async-jobs-driver.ts`, mas aqui
 * usando `pg` diretamente (não `@supabase/supabase-js`): a operação que
 * importa — a ingestão completa em uma única transação — precisa de
 * `BEGIN`/`COMMIT`/`ROLLBACK` reais, que o cliente REST do Supabase não
 * expõe. Este driver nunca é usado pela aplicação web nesta missão (ver
 * docs/product/mec-referencial-ia-2026-integration.md); é consumido só
 * pelo serviço de ingestão (`services/official-reference-ingestion-service.ts`)
 * e pelo script de linha de comando.
 *
 * `Queryable` aceita tanto um `pg.Pool` quanto um `pg.PoolClient` já
 * dentro de uma transação — quem constrói o repositório decide o
 * escopo transacional, o driver não sabe nem precisa saber.
 */
import type {
  KnowledgeDocument,
  KnowledgeDocumentUnit,
  OfficialReferenceDetails,
} from "../../domain/entities";
import { OfficialReferenceIdCollisionError } from "../../domain/errors.ts";
import type {
  KnowledgeDocumentUnitRepository,
  OfficialReferenceRepository,
} from "../../domain/repositories";

export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

function toKnowledgeDocument(row: Record<string, unknown>): KnowledgeDocument {
  return {
    id: row.id as string,
    title: row.title as string,
    resourceType: row.resource_type as KnowledgeDocument["resourceType"],
    author: (row.author as string | null) ?? null,
    sourceName: (row.source_name as string | null) ?? null,
    year: (row.year as number | null) ?? null,
    language: row.language as string,
    summary: (row.summary as string | null) ?? null,
    keywords: (row.keywords as string[]) ?? [],
    bnccCompetencies: (row.bncc_competencies as string[]) ?? [],
    bnccComputacaoCompetencies: (row.bncc_computacao_competencies as string[]) ?? [],
    grade: (row.grade as string | null) ?? null,
    estimatedMinutes: (row.estimated_minutes as number | null) ?? null,
    difficultyLevel: (row.difficulty_level as KnowledgeDocument["difficultyLevel"]) ?? null,
    license: (row.license as string | null) ?? null,
    category: (row.category as KnowledgeDocument["category"]) ?? null,
    scope: row.scope as KnowledgeDocument["scope"],
    institutionId: (row.institution_id as string | null) ?? null,
    sourceId: row.source_id as string,
    collectionIds: [],
    tagIds: [],
    topicIds: [],
    status: row.status as KnowledgeDocument["status"],
    contentRef: (row.content_ref as string | null) ?? null,
    createdAt: (row.created_at as Date).toISOString?.() ?? (row.created_at as string),
    updatedAt: (row.updated_at as Date).toISOString?.() ?? (row.updated_at as string),
  };
}

/**
 * Insere o `KnowledgeDocument` base de uma referência oficial. Não é
 * uma implementação completa de `KnowledgeDocumentRepository` (não tem
 * `list`/`search`) — é um helper estreito, usado só pelo serviço de
 * ingestão, dentro da mesma transação das outras duas tabelas.
 */
export async function insertKnowledgeDocumentRow(
  client: Queryable,
  document: KnowledgeDocument,
): Promise<void> {
  await client.query(
    `insert into knowledge_documents (
       id, scope, institution_id, source_id, title, resource_type, author,
       source_name, year, language, summary, keywords, bncc_competencies,
       bncc_computacao_competencies, grade, estimated_minutes, difficulty_level,
       license, category, status, content_ref, created_at, updated_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
     )`,
    [
      document.id,
      document.scope,
      document.institutionId,
      document.sourceId,
      document.title,
      document.resourceType,
      document.author,
      document.sourceName,
      document.year,
      document.language,
      document.summary,
      document.keywords,
      document.bnccCompetencies,
      document.bnccComputacaoCompetencies,
      document.grade,
      document.estimatedMinutes,
      document.difficultyLevel,
      document.license,
      document.category,
      document.status,
      document.contentRef,
      document.createdAt,
      document.updatedAt,
    ],
  );
}

export async function findKnowledgeDocumentRowById(
  client: Queryable,
  id: string,
): Promise<KnowledgeDocument | null> {
  const { rows } = await client.query(
    "select * from knowledge_documents where id = $1 limit 1",
    [id],
  );
  return rows[0] ? toKnowledgeDocument(rows[0]) : null;
}

/**
 * Chave natural de uma referência oficial: título + edição + data de
 * publicação. Usada para detectar conflito de checksum (mesma
 * identidade editorial, conteúdo diferente) — sem nenhuma coluna nova,
 * apenas um JOIN entre as duas tabelas já existentes.
 */
export async function findConflictingOfficialReference(
  client: Queryable,
  params: { title: string; edition: string; publicationDate: string; excludeDocumentId: string },
): Promise<{ documentId: string; checksum: string } | null> {
  const { rows } = await client.query(
    `select d.id as document_id, r.checksum as checksum
       from knowledge_documents d
       join knowledge_official_references r on r.document_id = d.id
      where d.title = $1
        and r.edition = $2
        and r.publication_date = $3
        and d.id <> $4
      limit 1`,
    [params.title, params.edition, params.publicationDate, params.excludeDocumentId],
  );
  return rows[0]
    ? { documentId: rows[0].document_id as string, checksum: rows[0].checksum as string }
    : null;
}

export async function countKnowledgeDocumentUnits(
  client: Queryable,
  documentId: string,
): Promise<number> {
  const { rows } = await client.query(
    "select count(*)::int as count from knowledge_document_units where document_id = $1",
    [documentId],
  );
  return Number(rows[0]?.count ?? 0);
}

function toOfficialReferenceDetails(row: Record<string, unknown>): OfficialReferenceDetails {
  return {
    documentId: row.document_id as string,
    institutionalAuthor: row.institutional_author as string,
    publisher: row.publisher as string,
    publisherShortName: row.publisher_short_name as string,
    edition: row.edition as string,
    publicationPlace: row.publication_place as string,
    publicationDate: row.publication_date as string,
    originalFormat: row.original_format as string,
    workingFormat: row.working_format as string,
    rightsStatement: row.rights_statement as string,
    checksum: row.checksum as string,
    version: row.version as number,
  };
}

/**
 * `save` nunca faz `UPDATE`: se `documentId` já existe com o MESMO
 * checksum, é um retorno idempotente do que já está persistido; se já
 * existe com um checksum DIFERENTE, é uma colisão do prefixo de hash
 * truncado usado no id (nunca esperada na prática) e lança
 * `OfficialReferenceIdCollisionError` em vez de sobrescrever.
 */
export function createPostgresOfficialReferenceRepository(
  client: Queryable,
): OfficialReferenceRepository {
  return {
    async getByDocumentId(documentId) {
      const { rows } = await client.query(
        "select * from knowledge_official_references where document_id = $1 limit 1",
        [documentId],
      );
      return rows[0] ? toOfficialReferenceDetails(rows[0]) : null;
    },

    async save(details) {
      const { rows: existingRows } = await client.query(
        "select * from knowledge_official_references where document_id = $1 limit 1",
        [details.documentId],
      );
      const existing = existingRows[0];
      if (existing) {
        if (existing.checksum !== details.checksum) {
          throw new OfficialReferenceIdCollisionError(details.documentId);
        }
        return toOfficialReferenceDetails(existing);
      }

      const { rows } = await client.query(
        `insert into knowledge_official_references (
           document_id, institutional_author, publisher, publisher_short_name,
           edition, publication_place, publication_date, original_format,
           working_format, rights_statement, checksum, version
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         returning *`,
        [
          details.documentId,
          details.institutionalAuthor,
          details.publisher,
          details.publisherShortName,
          details.edition,
          details.publicationPlace,
          details.publicationDate,
          details.originalFormat,
          details.workingFormat,
          details.rightsStatement,
          details.checksum,
          details.version,
        ],
      );
      return toOfficialReferenceDetails(rows[0]);
    },
  };
}

function toKnowledgeDocumentUnit(row: Record<string, unknown>): KnowledgeDocumentUnit {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    chapter: (row.chapter as string | null) ?? null,
    section: (row.section as string | null) ?? null,
    subsection: (row.subsection as string | null) ?? null,
    originalStartPage: row.original_start_page as number,
    originalEndPage: row.original_end_page as number,
    text: row.text as string,
    contentNature: row.content_nature as KnowledgeDocumentUnit["contentNature"],
    topics: (row.topics as string[]) ?? [],
    educationalStages: (row.educational_stages as string[]) ?? [],
    sequence: row.sequence as number,
    checksum: row.checksum as string,
  };
}

/**
 * `save` é insert-only e idempotente por `id` — o mesmo `id`
 * (`<documentId>-unit-<sequence>`, determinístico) com o mesmo
 * checksum não duplica; a constraint `unique (document_id, sequence)`
 * da migration é a última linha de defesa contra duplicação.
 */
export function createPostgresKnowledgeDocumentUnitRepository(
  client: Queryable,
): KnowledgeDocumentUnitRepository {
  return {
    async listByDocument(documentId) {
      const { rows } = await client.query(
        "select * from knowledge_document_units where document_id = $1 order by sequence asc",
        [documentId],
      );
      return rows.map(toKnowledgeDocumentUnit);
    },

    async save(unit) {
      const { rows: existingRows } = await client.query(
        "select * from knowledge_document_units where id = $1 limit 1",
        [unit.id],
      );
      if (existingRows[0]) {
        return toKnowledgeDocumentUnit(existingRows[0]);
      }

      const { rows } = await client.query(
        `insert into knowledge_document_units (
           id, document_id, chapter, section, subsection, original_start_page,
           original_end_page, text, content_nature, topics, educational_stages,
           sequence, checksum
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         returning *`,
        [
          unit.id,
          unit.documentId,
          unit.chapter,
          unit.section,
          unit.subsection,
          unit.originalStartPage,
          unit.originalEndPage,
          unit.text,
          unit.contentNature,
          unit.topics,
          unit.educationalStages,
          unit.sequence,
          unit.checksum,
        ],
      );
      return toKnowledgeDocumentUnit(rows[0]);
    },
  };
}
