import {
  getAssessmentStatus,
  type AssessmentAssignment,
  type AssessmentLifecycleStatus,
  type AssessmentSubmission,
  type LessonAssessment,
} from "@/modules/assessment";
import type { Classroom } from "@/modules/workspace";

/**
 * Uma Aplicação de Sondagem (`AssessmentAssignment`) já resolvida com o
 * título da Sondagem, o nome da Turma e a contagem de entregas
 * aguardando devolutiva — a junção que "Hoje no IAH" e "Precisa da sua
 * atenção" precisam, calculada uma única vez em `page.tsx`.
 */
export interface AssignmentView {
  id: string;
  assessmentTitle: string;
  classroomName: string;
  startsAt: string;
  endsAt: string;
  status: AssessmentLifecycleStatus;
  publicationStatus: AssessmentAssignment["publicationStatus"];
  pendingReviewCount: number;
}

export function buildAssignmentViews({
  assignments,
  assessments,
  classrooms,
  submissionsByAssignment,
  now = new Date(),
}: {
  assignments: AssessmentAssignment[];
  assessments: LessonAssessment[];
  classrooms: Classroom[];
  submissionsByAssignment: Record<string, AssessmentSubmission[]>;
  now?: Date;
}): AssignmentView[] {
  return assignments.map((assignment) => {
    const submissions = submissionsByAssignment[assignment.id] ?? [];
    return {
      id: assignment.id,
      assessmentTitle:
        assessments.find((assessment) => assessment.id === assignment.assessmentId)?.title ??
        "Sondagem",
      classroomName:
        classrooms.find((classroom) => classroom.id === assignment.classroomId)?.name ?? "Turma",
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
      status: getAssessmentStatus(assignment, now),
      publicationStatus: assignment.publicationStatus,
      pendingReviewCount: submissions.filter((submission) => submission.status === "submitted")
        .length,
    };
  });
}

export function isSameDay(isoA: string, isoB: Date): boolean {
  return new Date(isoA).toDateString() === isoB.toDateString();
}

export function daysUntil(iso: string, now: Date): number {
  const start = new Date(now.toDateString()).getTime();
  const target = new Date(new Date(iso).toDateString()).getTime();
  return Math.round((target - start) / 86_400_000);
}
