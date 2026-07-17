/**
 * ARQUITETURA APENAS — contratos do fluxo de entrega de Missão:
 *
 *   Missão → selecionar turma → publicar → receber entregas →
 *   avaliação assistida
 *
 * NADA aqui está implementado, e é deliberado: publicar uma Missão numa
 * turma exige Atividade (instância, P2 de docs/DOMAIN_MODEL.md),
 * persistência real e autenticação — nenhuma das três existe hoje.
 * Estes contratos fixam o formato para que a implementação futura não
 * precise redesenhar o fluxo; ver docs/GOOGLE_CLASSROOM_INTEGRATION.md,
 * "Expansão futura".
 */

import type { Production } from "./entities";

/**
 * Publicação de uma Missão numa Turma — a "Atividade" de
 * docs/DOMAIN_MODEL.md: a instância que fixa (missionId, version) no
 * momento da publicação, para que editar a Missão depois não corrompa o
 * histórico de quem já a fez.
 */
export interface MissionAssignment {
  id: string;
  institutionId: string;
  classroomId: string;
  missionId: string;
  /** Versão do MissionTemplate vigente na publicação (docs/AUTHORING_MODEL.md). */
  missionVersion: number;
  publishedAt: string;
  dueAt: string | null;
  /** Espelho no provedor externo, quando publicada também lá (ex.: courseWork do Google). */
  externalAssignmentId: string | null;
}

/** Publica Missões em Turmas e acompanha as entregas resultantes. */
export interface MissionPublishingService {
  publish(params: {
    institutionId: string;
    classroomId: string;
    missionId: string;
    dueAt?: string | null;
  }): Promise<MissionAssignment>;

  listByClassroom(
    institutionId: string,
    classroomId: string,
  ): Promise<MissionAssignment[]>;

  /** Entregas recebidas para uma publicação. */
  listSubmissions(
    institutionId: string,
    assignmentId: string,
  ): Promise<Production[]>;
}

/**
 * Avaliação Assistida — a IA apoia o professor, nunca decide por ele.
 * O contrato devolve sugestões explicitamente rotuladas como tal; a
 * decisão final é sempre humana (princípio de produto: professor no
 * centro, IA como apoio crítico — docs/VISION.md).
 */
export interface AssistedEvaluationSuggestion {
  productionId: string;
  /** Evidências encontradas no texto para cada critério de auditoria. */
  criteriaFindings: Array<{ criterion: string; evidence: string | null }>;
  /** Pontos que o professor deveria olhar de perto. */
  attentionPoints: string[];
  /** Sempre true: nada aqui é nota nem veredito automático. */
  requiresTeacherReview: true;
}

export interface AssistedEvaluationService {
  suggest(params: {
    institutionId: string;
    productionId: string;
  }): Promise<AssistedEvaluationSuggestion>;
}
