import type { MissionAssignment } from "../../domain/mission-delivery";

/**
 * Adapter local da publicação institucional para o ambiente demonstrativo.
 * Mantém o mesmo `MissionAssignment` usado pelo serviço do Platform; a troca
 * por persistência real continua concentrada na factory de repositórios.
 */
const STORAGE_KEY = "iah:mission-assignments:v1";
export const MISSION_ASSIGNMENTS_UPDATED_EVENT =
  "iah:mission-assignments-updated";

function readAll(): MissionAssignment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MissionAssignment[]) : [];
  } catch {
    return [];
  }
}

export function listLocalMissionAssignments(
  institutionId: string,
  classroomId?: string,
): MissionAssignment[] {
  return readAll().filter(
    (assignment) =>
      assignment.institutionId === institutionId &&
      (!classroomId || assignment.classroomId === classroomId),
  );
}

export function saveLocalMissionAssignment(
  assignment: MissionAssignment,
): void {
  if (typeof window === "undefined") return;
  const assignments = readAll();
  const index = assignments.findIndex(
    (item) =>
      item.institutionId === assignment.institutionId &&
      item.id === assignment.id,
  );
  if (index >= 0) assignments[index] = assignment;
  else assignments.push(assignment);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  window.dispatchEvent(
    new CustomEvent(MISSION_ASSIGNMENTS_UPDATED_EVENT, {
      detail: {
        institutionId: assignment.institutionId,
        classroomId: assignment.classroomId,
      },
    }),
  );
}
