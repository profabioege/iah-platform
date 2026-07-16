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
  loadStudentWork,
  saveStudentWork,
} from "./infrastructure/local-student-work-store";
