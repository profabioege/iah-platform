/**
 * Serviço de ingestão de referências oficiais — a única peça desta
 * missão que abre uma transação real. Mesmo padrão de `create*Service`
 * de `modules/platform/services/` e `modules/identity/services/`, mas
 * recebendo um `pg.Pool` em vez de um agregado de repositórios: o
 * limite transacional (uma única referência + todas as suas unidades,
 * tudo ou nada) exige possuir a mesma conexão do início ao fim, algo
 * que um agregado de repositórios pré-montados não expressa.
 *
 * Fluxo, dentro de uma única transação:
 *  1-4. metadados/documento/checksum/unidades já vêm validados pelo
 *       importador (`official-reference-importer.ts`) antes de chegar aqui.
 *  5. verifica se o documento (por id, derivado do checksum) já existe
 *     — se sim, é uma reexecução idêntica: idempotente, não duplica.
 *  6. verifica conflito de checksum pela chave natural (título + edição
 *     + data) — mesma identidade editorial, conteúdo diferente: erro
 *     tipado, nunca sobrescreve.
 *  7. insere `knowledge_documents` + `knowledge_official_references`.
 *  8. insere todas as `knowledge_document_units`.
 *  9. confirma a contagem persistida contra a quantidade esperada.
 *  10. commit. Qualquer falha em qualquer passo faz rollback completo —
 *      nenhuma referência parcial, nenhuma unidade órfã.
 */
import type { Pool } from "pg";
import { OfficialReferenceChecksumConflictError, OfficialReferenceUnitCountMismatchError } from "../domain/errors.ts";
import type { OfficialReferenceImportResult } from "../domain/official-reference-importer";
import {
  countKnowledgeDocumentUnits,
  createPostgresKnowledgeDocumentUnitRepository,
  createPostgresOfficialReferenceRepository,
  findConflictingOfficialReference,
  findKnowledgeDocumentRowById,
  insertKnowledgeDocumentRow,
} from "../infrastructure/database/postgres-official-reference-driver.ts";

export type IngestOfficialReferenceOutcome = "ingested" | "already_ingested";

export interface IngestOfficialReferenceResult {
  outcome: IngestOfficialReferenceOutcome;
  documentId: string;
  title: string;
  unitCount: number;
  pageRange: { min: number; max: number } | null;
}

export interface OfficialReferenceIngestionService {
  ingest(parsed: OfficialReferenceImportResult): Promise<IngestOfficialReferenceResult>;
}

export function createOfficialReferenceIngestionService(
  pool: Pool,
): OfficialReferenceIngestionService {
  return {
    async ingest(parsed) {
      const { document, details, units } = parsed;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // 5. já ingerido? (mesmo documentId, derivado do checksum -> idempotente)
        const existingDocument = await findKnowledgeDocumentRowById(client, document.id);
        if (existingDocument) {
          const existingUnitCount = await countKnowledgeDocumentUnits(client, document.id);
          await client.query("COMMIT");
          return {
            outcome: "already_ingested",
            documentId: document.id,
            title: existingDocument.title,
            unitCount: existingUnitCount,
            pageRange: pageRangeOf(units),
          };
        }

        // 6. conflito de checksum pela chave natural (título + edição + data)
        const conflict = await findConflictingOfficialReference(client, {
          title: document.title,
          edition: details.edition,
          publicationDate: details.publicationDate,
          excludeDocumentId: document.id,
        });
        if (conflict) {
          throw new OfficialReferenceChecksumConflictError(
            document.title,
            details.edition,
            details.publicationDate,
          );
        }

        // 7. insere o documento base + a referência oficial
        await insertKnowledgeDocumentRow(client, document);
        const referenceRepository = createPostgresOfficialReferenceRepository(client);
        await referenceRepository.save(details);

        // 8. insere todas as unidades
        const unitRepository = createPostgresKnowledgeDocumentUnitRepository(client);
        for (const unit of units) {
          await unitRepository.save(unit);
        }

        // 9. confirma a contagem
        const persistedCount = await countKnowledgeDocumentUnits(client, document.id);
        if (persistedCount !== units.length) {
          throw new OfficialReferenceUnitCountMismatchError(
            document.id,
            units.length,
            persistedCount,
          );
        }

        // 10. commit
        await client.query("COMMIT");
        return {
          outcome: "ingested",
          documentId: document.id,
          title: document.title,
          unitCount: persistedCount,
          pageRange: pageRangeOf(units),
        };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

function pageRangeOf(units: OfficialReferenceImportResult["units"]): { min: number; max: number } | null {
  if (units.length === 0) return null;
  return {
    min: Math.min(...units.map((unit) => unit.originalStartPage)),
    max: Math.max(...units.map((unit) => unit.originalEndPage)),
  };
}
