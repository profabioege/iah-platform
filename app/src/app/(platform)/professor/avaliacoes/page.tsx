import type { Metadata } from "next";

import { DemoStateNotice } from "@/components/demo/demo-state-notice";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { getDefaultAssessmentRepositories } from "@/modules/assessment";
import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";

import { AssessmentManager } from "./assessment-manager";

export const metadata: Metadata = {
  title: "Sondagens diagnósticas",
  description: "Crie, publique e valide sondagens diagnósticas.",
};

export default async function AssessmentsTeacherPage() {
  if (requirePlatformDataMode() !== "demo") {
    return (
      <p className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        A sondagem diagnóstica não está disponível neste ambiente.
      </p>
    );
  }
  const workspace = await getWorkspaceContext();
  if (!workspace || workspace.role !== "teacher") return null;
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
    <div className="flex flex-col gap-4">
      <DemoStateNotice />
      <AssessmentManager
      assessments={assessments}
      assignments={assignments}
      classrooms={workspace.classrooms}
      studentsByClassroom={studentsByClassroom}
      submissionsByAssignment={submissionsByAssignment}
      extensionsByAssignment={extensionsByAssignment}
      timezone={workspace.institution.timezone}
      />
    </div>
  );
}
