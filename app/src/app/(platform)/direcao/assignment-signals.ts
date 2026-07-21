import {
  getAssessmentStatus,
  type AssessmentAssignment,
  type AssessmentSubmission,
} from "@/modules/assessment";
import type { Classroom } from "@/modules/workspace";

/**
 * Sinais institucionais derivados das Aplicações de Sondagem — versão
 * própria da Direção (D-046), separada de `professor/assignment-view.ts`
 * por instrução explícita de não editar/depender de arquivos de
 * `professor/`. Mesmo espírito: nada inventado, só o que dá pra
 * calcular com os repositórios reais de `modules/assessment`.
 */
export interface DirectorAttentionItem {
  key: string;
  label: string;
  detail: string;
}

export function buildDirectorAttentionItems({
  classrooms,
  assignments,
  submissionsByAssignment,
  now = new Date(),
}: {
  classrooms: Classroom[];
  assignments: AssessmentAssignment[];
  submissionsByAssignment: Record<string, AssessmentSubmission[]>;
  now?: Date;
}): DirectorAttentionItem[] {
  const items: DirectorAttentionItem[] = [];

  const classroomsWithAssignment = new Set(assignments.map((a) => a.classroomId));
  for (const classroom of classrooms) {
    if (!classroomsWithAssignment.has(classroom.id)) {
      items.push({
        key: `${classroom.id}-sem-publicacao`,
        label: classroom.name,
        detail: "Turma sem nenhuma atividade publicada",
      });
    }
    if (classroom.teacherIds.length === 0) {
      items.push({
        key: `${classroom.id}-sem-vinculo`,
        label: classroom.name,
        detail: "Vínculo com professor incompleto",
      });
    }
  }

  for (const assignment of assignments) {
    const classroomName = classrooms.find((c) => c.id === assignment.classroomId)?.name ?? "Turma";
    const status = getAssessmentStatus(assignment, now);
    const submissions = submissionsByAssignment[assignment.id] ?? [];
    const pendingReview = submissions.filter((s) => s.status === "submitted").length;
    if (status === "closed" && pendingReview > 0) {
      items.push({
        key: `${assignment.id}-sem-devolutiva`,
        label: classroomName,
        detail:
          pendingReview === 1
            ? "Atividade encerrada, 1 devolutiva pendente"
            : `Atividade encerrada, ${pendingReview} devolutivas pendentes`,
      });
    }
  }

  return items;
}

export function countCriticalPendencies(items: DirectorAttentionItem[]): number {
  return items.length;
}
