import type { Metadata } from "next";

import { getDefaultAssessmentRepositories } from "@/modules/assessment";
import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";

import { AssessmentManager } from "./assessment-manager";

export const metadata: Metadata = {
  title: "Sondagens diagnósticas",
  description: "Crie, publique e valide sondagens diagnósticas.",
};

export default async function AssessmentsTeacherPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace || workspace.role === "student") return null;
  const repositories = getDefaultAssessmentRepositories();
  const [assessments, assignments] = await Promise.all([
    repositories.assessments.list(workspace.institution.id),
    repositories.assignments.listByInstitution(workspace.institution.id),
  ]);
  const platform = getDefaultRepositories();
  const studentsByClassroom = Object.fromEntries(
    await Promise.all(workspace.classrooms.map(async (classroom) => [
      classroom.id,
      await platform.students.listByClassroom(workspace.institution.id, classroom.id),
    ])),
  );
  const submissionsByAssignment = Object.fromEntries(
    await Promise.all(assignments.map(async (assignment) => [
      assignment.id,
      await repositories.submissions.listByAssignment(workspace.institution.id, assignment.id),
    ])),
  );
  const extensionsByAssignment = Object.fromEntries(
    await Promise.all(assignments.map(async (assignment) => [
      assignment.id,
      await repositories.extensions.listByAssignment(workspace.institution.id, assignment.id),
    ])),
  );

  return (
    <AssessmentManager
      assessments={assessments}
      assignments={assignments}
      classrooms={workspace.classrooms}
      studentsByClassroom={studentsByClassroom}
      submissionsByAssignment={submissionsByAssignment}
      extensionsByAssignment={extensionsByAssignment}
      timezone={workspace.institution.timezone}
    />
  );
}
