"use server";

import { revalidatePath } from "next/cache";

import {
  assertClassroomScope,
  assertRole,
  createAssessmentService,
  getDefaultAssessmentRepositories,
} from "@/modules/assessment";
import { getAuthMode } from "@/lib/auth-flags";
import { getWorkspaceContext } from "@/modules/workspace";

async function studentScope(assignmentId: string) {
  if (getAuthMode() !== "demo") throw new Error("A sondagem diagnóstica está disponível apenas no ambiente de demonstração.");
  const workspace = await getWorkspaceContext();
  if (!workspace) throw new Error("Sessão inválida.");
  assertRole(workspace.role, ["student"]);
  if (!workspace.user.studentId) throw new Error("Aluno não vinculado à sessão.");
  const repositories = getDefaultAssessmentRepositories();
  const assignment = await repositories.assignments.getById(workspace.institution.id, assignmentId);
  if (!assignment) throw new Error("Atividade não encontrada.");
  assertClassroomScope(workspace.classrooms.map((item) => item.id), assignment.classroomId);
  return { workspace, repositories, assignment, studentId: workspace.user.studentId };
}

export async function saveAssessmentDraftAction(
  assignmentId: string,
  answers: Record<string, string | boolean | null>,
) {
  const scope = await studentScope(assignmentId);
  const submission = await createAssessmentService(scope.repositories).saveDraft(
    scope.workspace.institution.id,
    scope.assignment,
    scope.studentId,
    answers,
  );
  revalidatePath(`/dashboard/sondagens/${assignmentId}`);
  return submission;
}

export async function submitAssessmentAction(
  assignmentId: string,
  answers: Record<string, string | boolean | null>,
) {
  const scope = await studentScope(assignmentId);
  const submission = await createAssessmentService(scope.repositories).submit(
    scope.workspace.institution.id,
    scope.assignment,
    scope.studentId,
    answers,
  );
  revalidatePath(`/dashboard/sondagens/${assignmentId}`);
  revalidatePath("/dashboard/sondagens");
  revalidatePath("/professor/avaliacoes");
  revalidatePath("/gestor/sondagens");
  return submission;
}
