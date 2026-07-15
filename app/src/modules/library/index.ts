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

export { localMissionRepository } from "./infrastructure/local-mission-repository";
