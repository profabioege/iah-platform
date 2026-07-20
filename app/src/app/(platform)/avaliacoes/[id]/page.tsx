import { notFound } from "next/navigation";

import {
  assertClassroomScope,
  effectiveEndsAt,
  getAssessmentStatus,
  getDefaultAssessmentRepositories,
  resultVisibility,
} from "@/modules/assessment";
import { getWorkspaceContext } from "@/modules/workspace";

import { AssessmentRunner } from "./assessment-runner";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const workspace = await getWorkspaceContext();
  if (!workspace || workspace.role !== "student" || !workspace.user.studentId) return null;
  const { id } = await params;
  const repositories = getDefaultAssessmentRepositories();
  const assignment = await repositories.assignments.getById(workspace.institution.id, id);
  if (!assignment || assignment.publicationStatus !== "published") notFound();
  assertClassroomScope(workspace.classrooms.map((item) => item.id), assignment.classroomId);
  const [assessment, submission, extensions] = await Promise.all([
    repositories.assessments.getById(workspace.institution.id, assignment.assessmentId),
    repositories.submissions.getByStudent(workspace.institution.id, assignment.id, workspace.user.studentId),
    repositories.extensions.listByAssignment(workspace.institution.id, assignment.id),
  ]);
  if (!assessment) notFound();
  const visibility = resultVisibility(assignment, submission);
  const deadline = effectiveEndsAt(assignment, extensions, workspace.user.studentId);
  const questions = assessment.questions.map((question) => ({
    id: question.id,
    position: question.position,
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    options: question.options,
    correctAnswer: visibility.answerKey ? question.correctAnswer : null,
    justification: visibility.answerKey ? question.justification : null,
  }));

  return <AssessmentRunner assignment={assignment} title={assessment.title} instructions={assessment.instructions} questions={questions} submission={submission} status={getAssessmentStatus({ ...assignment, endsAt: deadline })} effectiveEndsAt={deadline} visibility={visibility} />;
}
