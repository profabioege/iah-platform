/**
 * Módulo Biblioteca — ponto de entrada público.
 * Outras partes da aplicação devem importar deste arquivo,
 * nunca diretamente dos arquivos internos do módulo.
 */

export type {
  Mission,
  MissionStatus,
  CreateMissionInput,
  UpdateMissionInput,
} from "./domain/mission";

export type {
  MissionReader,
  MissionRepository,
} from "./domain/mission-repository";

export type {
  AxisLevel,
  CurriculumAreaCode,
  MissionAiAxis,
  MissionAxes,
  MissionDisciplineAxis,
} from "./domain/mission-axes";
export {
  AREA_NAMES,
  AXIS_LEVELS,
  axisLevelLabel,
  resolveAiCompetencies,
  validateMissionAxes,
} from "./domain/mission-axes";

export type { AiCompetency, AiCompetencyDimension } from "./domain/ai-competencies";
export {
  AI_COMPETENCIES,
  AI_COMPETENCIES_REFERENCE_LABEL,
  AI_DIMENSIONS,
} from "./domain/ai-competencies";

export { localMissionRepository } from "./infrastructure/local-mission-repository";
