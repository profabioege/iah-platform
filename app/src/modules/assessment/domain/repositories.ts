import type {
  AssessmentAssignment,
  AssessmentDeadlineExtension,
  AssessmentSubmission,
  LessonAssessment,
} from "./entities";

export interface LessonAssessmentRepository {
  list(institutionId: string): Promise<LessonAssessment[]>;
  getById(institutionId: string, id: string): Promise<LessonAssessment | null>;
  save(institutionId: string, assessment: LessonAssessment): Promise<void>;
}

export interface AssessmentAssignmentRepository {
  listByInstitution(institutionId: string): Promise<AssessmentAssignment[]>;
  listByClassroom(
    institutionId: string,
    classroomId: string,
  ): Promise<AssessmentAssignment[]>;
  getById(institutionId: string, id: string): Promise<AssessmentAssignment | null>;
  save(institutionId: string, assignment: AssessmentAssignment): Promise<void>;
}

export interface AssessmentSubmissionRepository {
  listByAssignment(
    institutionId: string,
    assignmentId: string,
  ): Promise<AssessmentSubmission[]>;
  getByStudent(
    institutionId: string,
    assignmentId: string,
    studentId: string,
  ): Promise<AssessmentSubmission | null>;
  save(institutionId: string, submission: AssessmentSubmission): Promise<void>;
}

export interface AssessmentDeadlineExtensionRepository {
  listByAssignment(
    institutionId: string,
    assignmentId: string,
  ): Promise<AssessmentDeadlineExtension[]>;
  save(
    institutionId: string,
    extension: AssessmentDeadlineExtension,
  ): Promise<void>;
}

export interface AssessmentRepositories {
  assessments: LessonAssessmentRepository;
  assignments: AssessmentAssignmentRepository;
  submissions: AssessmentSubmissionRepository;
  extensions: AssessmentDeadlineExtensionRepository;
}
