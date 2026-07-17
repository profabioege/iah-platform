/**
 * Implementações previstas do ImportProvider (docs/IMPORT_ARCHITECTURE.md).
 *
 * Nesta fase, todas são STUBS no padrão D-019: nenhuma chamada de rede,
 * nenhum parser real — cada uma fixa o contrato que a implementação
 * futura vai cumprir e lança erro se chamada. A exceção é o provedor
 * manual, que é funcional por natureza (não tem origem externa a ler:
 * recebe os dados já digitados).
 */

import type {
  ImportProvider,
  ImportedClassroom,
  ImportedStudent,
} from "../domain/import-provider";

function stub(id: ImportProvider["id"], label: string): ImportProvider {
  const fail = (): never => {
    throw new Error(
      `${label} ainda não está configurado — nenhuma credencial/fonte ` +
        "existe nesta fase. Ver docs/IMPORT_ARCHITECTURE.md.",
    );
  };
  return {
    id,
    isConfigured: false,
    async listClassrooms() {
      return fail();
    },
    async listStudents() {
      return fail();
    },
  };
}

/**
 * Cadastro manual: a "origem" são os dados digitados no ato. Recebe as
 * turmas/alunos na criação e apenas os devolve — o ImportService cuida
 * de gravar no modelo interno, como para qualquer outro provedor.
 */
export function createManualImportProvider(input: {
  classrooms: Array<ImportedClassroom & { students: ImportedStudent[] }>;
}): ImportProvider {
  return {
    id: "manual",
    isConfigured: true,
    async listClassrooms() {
      return input.classrooms.map(({ externalId, name }) => ({
        externalId,
        name,
      }));
    },
    async listStudents(externalClassroomId) {
      return (
        input.classrooms.find((c) => c.externalId === externalClassroomId)
          ?.students ?? []
      );
    },
  };
}

export const csvImportProvider = stub("csv", "CSVImportProvider");
export const googleClassroomImportProvider = stub(
  "google",
  "GoogleClassroomProvider (importação)",
);
export const microsoftTeamsImportProvider = stub(
  "microsoft",
  "MicrosoftTeamsProvider",
);
export const moodleImportProvider = stub("moodle", "MoodleProvider");
export const apiImportProvider = stub("api", "APIProvider");
