import type { CurriculumConnection } from "./entities";

/** Garante que a conexão pertence à instituição e ao professor da sessão — nunca acesso cruzado entre instituições/professores. */
export function assertConnectionOwnership(
  connection: CurriculumConnection,
  institutionId: string,
  teacherId: string,
): void {
  if (connection.institutionId !== institutionId || connection.createdByTeacherId !== teacherId) {
    throw new Error("Conexão fora do contexto institucional atual.");
  }
}
