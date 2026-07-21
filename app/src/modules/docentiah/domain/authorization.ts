import type { GeneratedMaterial } from "./entities";

/** Garante que o material pertence à instituição e ao professor da sessão — nunca acesso cruzado entre instituições/professores. */
export function assertMaterialOwnership(
  material: GeneratedMaterial,
  institutionId: string,
  teacherId: string,
): void {
  if (material.institutionId !== institutionId || material.teacherId !== teacherId) {
    throw new Error("Material fora do contexto institucional atual.");
  }
}
