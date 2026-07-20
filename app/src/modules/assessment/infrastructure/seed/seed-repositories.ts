import type {
  AssessmentAssignment,
  AssessmentDeadlineExtension,
  AssessmentSubmission,
  LessonAssessment,
} from "../../domain/entities";
import type { AssessmentRepositories } from "../../domain/repositories";
import { DEMO_ASSESSMENT, DEMO_ASSESSMENT_ASSIGNMENT } from "../../seeds/demo-seed";

export function createSeedAssessmentRepositories(): AssessmentRepositories {
  const assessments: LessonAssessment[] = [structuredClone(DEMO_ASSESSMENT)];
  const assignments: AssessmentAssignment[] = [structuredClone(DEMO_ASSESSMENT_ASSIGNMENT)];
  const submissions: AssessmentSubmission[] = [];
  const extensions: AssessmentDeadlineExtension[] = [];

  return {
    assessments: {
      async list(institutionId) {
        return assessments.filter((item) => item.institutionId === institutionId).map((item) => structuredClone(item));
      },
      async getById(institutionId, id) {
        const found = assessments.find((item) => item.institutionId === institutionId && item.id === id);
        return found ? structuredClone(found) : null;
      },
      async save(institutionId, assessment) {
        const item = structuredClone({ ...assessment, institutionId });
        const index = assessments.findIndex((current) => current.institutionId === institutionId && current.id === item.id);
        if (index >= 0) assessments[index] = item;
        else assessments.push(item);
      },
    },
    assignments: {
      async listByInstitution(institutionId) {
        return assignments.filter((item) => item.institutionId === institutionId).map((item) => structuredClone(item));
      },
      async listByClassroom(institutionId, classroomId) {
        return assignments.filter((item) => item.institutionId === institutionId && item.classroomId === classroomId).map((item) => structuredClone(item));
      },
      async getById(institutionId, id) {
        const found = assignments.find((item) => item.institutionId === institutionId && item.id === id);
        return found ? structuredClone(found) : null;
      },
      async save(institutionId, assignment) {
        const item = structuredClone({ ...assignment, institutionId });
        const index = assignments.findIndex((current) => current.institutionId === institutionId && current.id === item.id);
        if (index >= 0) assignments[index] = item;
        else assignments.push(item);
      },
    },
    submissions: {
      async listByAssignment(institutionId, assignmentId) {
        return submissions.filter((item) => item.institutionId === institutionId && item.assignmentId === assignmentId).map((item) => structuredClone(item));
      },
      async getByStudent(institutionId, assignmentId, studentId) {
        const found = submissions.find((item) => item.institutionId === institutionId && item.assignmentId === assignmentId && item.studentId === studentId);
        return found ? structuredClone(found) : null;
      },
      async save(institutionId, submission) {
        const item = structuredClone({ ...submission, institutionId });
        const index = submissions.findIndex((current) => current.institutionId === institutionId && current.assignmentId === item.assignmentId && current.studentId === item.studentId);
        if (index >= 0) submissions[index] = item;
        else submissions.push(item);
      },
    },
    extensions: {
      async listByAssignment(institutionId, assignmentId) {
        return extensions.filter((item) => item.institutionId === institutionId && item.assignmentId === assignmentId).map((item) => structuredClone(item));
      },
      async save(institutionId, extension) {
        extensions.push(structuredClone({ ...extension, institutionId }));
      },
    },
  };
}
