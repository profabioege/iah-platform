import type { Role } from "@/modules/workspace";

export function assertRole(role: Role, allowed: Role[]): void {
  if (!allowed.includes(role)) throw new Error("Ação não autorizada para este papel.");
}

export function assertClassroomScope(
  classroomIds: string[],
  classroomId: string,
): void {
  if (!classroomIds.includes(classroomId)) {
    throw new Error("Turma fora do contexto institucional atual.");
  }
}
