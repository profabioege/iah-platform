import type {
  AssessmentAssignment,
  AssessmentDeadlineExtension,
  AssessmentResultVisibility,
  AssessmentSubmission,
} from "./entities";
import { getAssessmentStatus } from "./entities";

export function effectiveEndsAt(
  assignment: AssessmentAssignment,
  extensions: AssessmentDeadlineExtension[],
  studentId: string,
): string {
  const applicable = extensions.filter(
    (item) => item.studentId === null || item.studentId === studentId,
  );
  return applicable.reduce(
    (latest, item) =>
      new Date(item.newEndsAt).getTime() > new Date(latest).getTime()
        ? item.newEndsAt
        : latest,
    assignment.endsAt,
  );
}

export function canStudentAccess(
  assignment: AssessmentAssignment,
  now = new Date(),
): boolean {
  const status = getAssessmentStatus(assignment, now);
  return status === "open" || status === "closed";
}

export function canStudentSubmit(
  assignment: AssessmentAssignment,
  effectiveDeadline: string,
  now = new Date(),
): boolean {
  if (assignment.publicationStatus !== "published") return false;
  if (now.getTime() < new Date(assignment.startsAt).getTime()) return false;
  if (now.getTime() <= new Date(effectiveDeadline).getTime()) return true;
  return assignment.allowLateSubmission;
}

export function resultVisibility(
  assignment: AssessmentAssignment,
  submission: AssessmentSubmission | null,
  now = new Date(),
): AssessmentResultVisibility {
  const released = Boolean(assignment.resultsReleasedAt && submission?.status === "validated");
  let answerKey = false;

  if (submission && submission.status !== "draft") {
    switch (assignment.answerKeyPolicy) {
      case "after_submission":
        answerKey = true;
        break;
      case "after_end":
        answerKey = now.getTime() >= new Date(assignment.endsAt).getTime();
        break;
      case "scheduled":
        answerKey = Boolean(
          assignment.answerKeyReleaseAt &&
            now.getTime() >= new Date(assignment.answerKeyReleaseAt).getTime(),
        );
        break;
      case "manual":
        answerKey = Boolean(assignment.resultsReleasedAt);
        break;
      case "never":
        answerKey = false;
        break;
    }
  }

  return { result: released, feedback: released, answerKey };
}
