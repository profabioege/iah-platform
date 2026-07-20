/**
 * Módulo Classroom (Aprendizagem & Entrega) — ponto de entrada público.
 * Registra o trabalho do aluno nas Missões: produção, reflexão e conclusão.
 */

export {
  emptyStudentWork,
  canTransitionSubmission,
  getStudentSubmissionStatus,
  isMissionCompleted,
  isProductionDelivered,
  isReflectionRecorded,
  type StudentWork,
  type StudentWorkReview,
  type StudentSubmissionStatus,
} from "./domain/student-work";

export {
  listAllStudentWork,
  loadStudentWork,
  reviewStudentWork,
  saveStudentWork,
  STUDENT_WORK_UPDATED_EVENT,
  type StudentWorkScope,
} from "./infrastructure/local-student-work-store";

export {
  STUDENT_MISSION_STATUSES,
  type ClassMonitorReader,
  type StudentMissionSnapshot,
  type StudentMissionStatus,
} from "./domain/class-monitor";
