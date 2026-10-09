/**
 * Módulo Percursos (D-053) — os dois eixos do IAH reunidos para o aluno
 * (Trilha IA & Humanidades + trilhas de estudo por área) e para o
 * professor (painel da Trilha de IA com os eixos separados).
 *
 * Só a parte pura é exportada aqui; a leitura do servidor fica em
 * `infrastructure/load-pathways.ts` (importada pelo caminho direto, por
 * depender da sessão).
 */

export {
  AREA_LABELS,
  AREA_ORDER,
  MISSION_STATUS_LABEL,
  PATHWAY_STATUS_LABEL,
  bnccSkillIdOf,
  buildStudentPathways,
  type AiMissionEntry,
  type AiPathway,
  type AreaPathway,
  type MissionWorkStatus,
  type NextActivity,
  type PathwayStatus,
  type PathwaysInput,
  type StudentPathways,
} from "./domain/student-pathways";

export {
  buildTeacherAiTrail,
  type LevelCounts,
  type TeacherTrailMission,
} from "./domain/teacher-ai-trail";
