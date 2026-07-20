/**
 * Módulo Classroom (Aprendizagem & Entrega) — ponto de entrada público.
 * Registra o trabalho do aluno nas Missões: produção, reflexão e conclusão.
 */

export {
  emptyStudentWork,
  isMissionCompleted,
  isProductionDelivered,
  isReflectionRecorded,
  type StudentWork,
} from "./domain/student-work";

export {
  listAllStudentWork,
  loadStudentWork,
  saveStudentWork,
  type StudentWorkScope,
} from "./infrastructure/local-student-work-store";

export {
  STUDENT_MISSION_STATUSES,
  type ClassMonitorReader,
  type StudentMissionSnapshot,
  type StudentMissionStatus,
} from "./domain/class-monitor";
