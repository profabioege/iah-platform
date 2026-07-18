/**
 * Módulo Authoring — Mission Studio (Estúdio de Missões).
 *
 * Materializa o motor de autoria de docs/AUTHORING_MODEL.md: criação,
 * edição, versionamento e publicação de missões, com contratos prontos
 * para o IPE (coautor pedagógico futuro — só contratos, sem IA).
 * Documentação: docs/MISSION_STUDIO.md.
 */

export {
  createEmptyStudioMission,
  publishBlockers,
  DIFFICULTY_LABEL,
  STATUS_LABEL,
  type StudioMission,
  type StudioMissionDifficulty,
  type StudioMissionStatus,
  type StudioResourceRef,
} from "./domain/studio-mission";

export type { MissionStudioRepository } from "./domain/mission-studio-repository";

export {
  ipeNotConfigured,
  type IpeFieldSuggestion,
  type IpePedagogicalEngine,
  type IpeSuggestableField,
} from "./domain/ipe";

export { localMissionStudioRepository } from "./infrastructure/local-mission-studio-repository";

/**
 * Repositório em uso pelo Estúdio. Hoje sempre o local (localStorage,
 * rotulado na interface); quando o banco existir, a implementação
 * database entra aqui — nenhuma tela muda (docs/PERSISTENCE.md).
 */
import { localMissionStudioRepository } from "./infrastructure/local-mission-studio-repository";
import type { MissionStudioRepository } from "./domain/mission-studio-repository";

export function getMissionStudioRepository(): MissionStudioRepository {
  return localMissionStudioRepository;
}
