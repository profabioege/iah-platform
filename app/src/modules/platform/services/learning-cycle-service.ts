/**
 * Ciclo de aprendizagem institucional real (M22) — produção, reflexão e
 * avaliação persistidas no banco (productions/reflections/
 * mission_reviews), substituindo o `localStorage` como fonte de verdade
 * quando o modo real está ativo. Devolve o MESMO formato `StudentWork`
 * que a UI já consome (`modules/classroom`) — nenhuma tela muda de
 * forma, só a fonte (D-001).
 *
 * Autorização por instituição/turma é responsabilidade do chamador
 * (Server Action): este serviço confia no `institutionId`/`classroomId`
 * recebidos, exatamente como os demais serviços de `modules/platform`.
 */

import {
  canTransitionSubmission,
  EMPTY_AI_EVIDENCE,
  emptyStudentWork,
  getStudentSubmissionStatus,
  type StudentMissionStatus,
  type StudentSubmissionStatus,
  type AiUseEvidence,
  type StudentWork,
  type StudentWorkReview,
} from "@/modules/classroom";
import type { MissionAxes } from "@/modules/library";

import {
  assertProductionWithinLimit,
  assertReflectionWithinLimit,
} from "../domain/content-limits";
import type { PlatformRepositories } from "../domain/repositories";
import {
  assertAiEvidenceWithinLimit,
  assertAxesReview,
  assertDeliverable,
} from "../domain/two-axes-rules";

export interface LearningCycleScope {
  institutionId: string;
  classroomId: string;
  studentId: string;
  missionId: string;
}

/** Mapeia o estado canônico da entrega para o vocabulário de acompanhamento de turma. */
function toMissionProgressStatus(
  status: StudentSubmissionStatus,
): StudentMissionStatus {
  if (status === "reviewed") return "avaliado";
  if (status === "submitted") return "concluiu";
  if (status === "in_progress") return "produzindo";
  return "nao_acessou";
}

export function createLearningCycleService(repositories: PlatformRepositories) {
  async function getStudentWork(scope: LearningCycleScope): Promise<StudentWork> {
    const [productions, reflections, reviews] = await Promise.all([
      repositories.productions.listByClassroomMission(
        scope.institutionId,
        scope.classroomId,
        scope.missionId,
      ),
      repositories.reflections.listByClassroomMission(
        scope.institutionId,
        scope.classroomId,
        scope.missionId,
      ),
      repositories.missionReviews.listByClassroomMission(
        scope.institutionId,
        scope.classroomId,
        scope.missionId,
      ),
    ]);
    const production = productions.find((p) => p.studentId === scope.studentId);
    const reflection = reflections.find((r) => r.studentId === scope.studentId);
    const review = reviews.find((r) => r.studentId === scope.studentId);

    const base = emptyStudentWork(scope.missionId);
    const work: StudentWork = {
      ...base,
      startedAt: production?.startedAt ?? null,
      production: production?.content ?? "",
      productionDeliveredAt: production?.deliveredAt ?? null,
      reflection: reflection?.text ?? "",
      reflectionRecordedAt: reflection?.recordedAt ?? null,
      aiEvidence: { ...EMPTY_AI_EVIDENCE, ...(production?.aiEvidence ?? {}) },
      review: review
        ? {
            grade: review.grade,
            observedCriteria: review.observedCriteria,
            feedback: review.feedback,
            reviewedAt: review.reviewedAt,
            reviewerId: review.reviewerId,
            reviewerName: review.reviewerName,
            axes: review.axes ?? null,
          }
        : null,
      updatedAt: production?.updatedAt ?? base.updatedAt,
    };
    return work;
  }

  async function syncProgress(
    scope: LearningCycleScope,
    work: StudentWork,
  ): Promise<void> {
    const status = getStudentSubmissionStatus(work);
    await repositories.missionProgress.save(scope.institutionId, {
      id: `prog-${scope.studentId}-${scope.missionId}`,
      institutionId: scope.institutionId,
      classroomId: scope.classroomId,
      studentId: scope.studentId,
      missionId: scope.missionId,
      status: toMissionProgressStatus(status),
      lastAccessAt: work.updatedAt,
    });
  }

  /** Início explícito da investigação — cria a Produção em rascunho. */
  async function startMission(scope: LearningCycleScope): Promise<StudentWork> {
    const current = await getStudentWork(scope);
    if (current.startedAt) return current;
    const now = new Date().toISOString();
    await repositories.productions.save(scope.institutionId, {
      id: `production-${scope.studentId}-${scope.missionId}`,
      institutionId: scope.institutionId,
      classroomId: scope.classroomId,
      studentId: scope.studentId,
      missionId: scope.missionId,
      startedAt: now,
      content: current.production,
      status: "draft",
      deliveredAt: null,
      updatedAt: now,
    });
    // Estado derivado localmente do que acabou de ser gravado, sem reler a
    // turma inteira (economiza uma rodada ao banco hospedado por ação —
    // investigação de latência de 27/09, docs/operations/retomada-homologacao.md;
    // porte do snapshot 4c0549d para o piloto da 1ª série A).
    const work: StudentWork = { ...current, startedAt: now, updatedAt: now };
    await syncProgress(scope, work);
    return work;
  }

  /** Autosave do texto da Produção (rascunho — nunca sobrescreve uma entrega). */
  async function saveProductionDraft(
    scope: LearningCycleScope,
    content: string,
  ): Promise<StudentWork> {
    assertProductionWithinLimit(content);
    const current = await getStudentWork(scope);
    if (current.productionDeliveredAt) {
      throw new Error("A produção já foi entregue — reabra antes de editar.");
    }
    const now = new Date().toISOString();
    await repositories.productions.save(scope.institutionId, {
      id: `production-${scope.studentId}-${scope.missionId}`,
      institutionId: scope.institutionId,
      classroomId: scope.classroomId,
      studentId: scope.studentId,
      missionId: scope.missionId,
      startedAt: current.startedAt ?? now,
      content,
      status: "draft",
      deliveredAt: null,
      updatedAt: now,
    });
    // Estado derivado localmente do que acabou de ser gravado, sem reler a
    // turma inteira (economiza uma rodada ao banco hospedado por ação —
    // investigação de latência de 27/09, docs/operations/retomada-homologacao.md;
    // porte do snapshot 4c0549d para o piloto da 1ª série A).
    const work: StudentWork = {
      ...current,
      production: content,
      startedAt: current.startedAt ?? now,
      updatedAt: now,
    };
    await syncProgress(scope, work);
    return work;
  }

  /**
   * Registro de uso da IA (Missão de dois eixos) — rascunho, como a
   * produção: nunca muda depois da entrega.
   */
  async function saveAiEvidenceDraft(
    scope: LearningCycleScope,
    evidence: AiUseEvidence,
  ): Promise<StudentWork> {
    assertAiEvidenceWithinLimit(evidence);
    const current = await getStudentWork(scope);
    if (current.productionDeliveredAt) {
      throw new Error("A produção já foi entregue — reabra antes de editar o registro de uso da IA.");
    }
    const now = new Date().toISOString();
    await repositories.productions.save(scope.institutionId, {
      id: `production-${scope.studentId}-${scope.missionId}`,
      institutionId: scope.institutionId,
      classroomId: scope.classroomId,
      studentId: scope.studentId,
      missionId: scope.missionId,
      startedAt: current.startedAt ?? now,
      content: current.production,
      aiEvidence: {
        tool: evidence.tool,
        request: evidence.request,
        response: evidence.response,
        verification: evidence.verification,
        decision: evidence.decision,
      },
      status: "draft",
      deliveredAt: null,
      updatedAt: now,
    });
    // Estado derivado localmente do que acabou de ser gravado, sem reler a
    // turma inteira (economiza uma rodada ao banco hospedado por ação —
    // investigação de latência de 27/09, docs/operations/retomada-homologacao.md;
    // porte do snapshot 4c0549d para o piloto da 1ª série A).
    const work: StudentWork = {
      ...current,
      aiEvidence: { ...EMPTY_AI_EVIDENCE, ...evidence },
      startedAt: current.startedAt ?? now,
      updatedAt: now,
    };
    await syncProgress(scope, work);
    return work;
  }

  /**
   * Entrega (ou reabertura) da Produção. Em Missão de dois eixos, a
   * entrega exige o registro de uso da IA completo (`axes` vem do arquivo
   * de conteúdo da Missão, lido pelo chamador).
   */
  async function setProductionDelivered(
    scope: LearningCycleScope,
    delivered: boolean,
    axes?: MissionAxes,
  ): Promise<StudentWork> {
    const current = await getStudentWork(scope);
    if (current.review) {
      throw new Error("Entrega já avaliada — não pode ser reaberta.");
    }
    if (delivered) assertDeliverable(axes, current.aiEvidence);
    const now = new Date().toISOString();
    await repositories.productions.save(scope.institutionId, {
      id: `production-${scope.studentId}-${scope.missionId}`,
      institutionId: scope.institutionId,
      classroomId: scope.classroomId,
      studentId: scope.studentId,
      missionId: scope.missionId,
      startedAt: current.startedAt ?? now,
      content: current.production,
      status: delivered ? "delivered" : "draft",
      deliveredAt: delivered ? now : null,
      updatedAt: now,
    });
    // Estado derivado localmente do que acabou de ser gravado, sem reler a
    // turma inteira (economiza uma rodada ao banco hospedado por ação —
    // investigação de latência de 27/09, docs/operations/retomada-homologacao.md;
    // porte do snapshot 4c0549d para o piloto da 1ª série A).
    const work: StudentWork = {
      ...current,
      startedAt: current.startedAt ?? now,
      productionDeliveredAt: delivered ? now : null,
      updatedAt: now,
    };
    await syncProgress(scope, work);
    return work;
  }

  /** Autosave do texto da Reflexão (rascunho — espelha `saveProductionDraft`). */
  async function saveReflectionDraft(
    scope: LearningCycleScope,
    text: string,
  ): Promise<StudentWork> {
    assertReflectionWithinLimit(text);
    const current = await getStudentWork(scope);
    if (current.reflectionRecordedAt) {
      throw new Error("A reflexão já foi registrada — reabra antes de editar.");
    }
    await repositories.reflections.save(scope.institutionId, {
      id: `reflection-${scope.studentId}-${scope.missionId}`,
      institutionId: scope.institutionId,
      classroomId: scope.classroomId,
      studentId: scope.studentId,
      missionId: scope.missionId,
      text,
      recordedAt: current.reflectionRecordedAt,
      visibility: "shared_with_teacher",
    });
    // Estado derivado localmente do que acabou de ser gravado, sem reler a
    // turma inteira (economiza uma rodada ao banco hospedado por ação —
    // investigação de latência de 27/09, docs/operations/retomada-homologacao.md;
    // porte do snapshot 4c0549d para o piloto da 1ª série A).
    const work: StudentWork = { ...current, reflection: text };
    await syncProgress(scope, work);
    return work;
  }

  /** Registro (ou reabertura) da Reflexão — espelha `setProductionDelivered`. */
  async function setReflectionRecorded(
    scope: LearningCycleScope,
    recorded: boolean,
  ): Promise<StudentWork> {
    const current = await getStudentWork(scope);
    if (current.review) {
      throw new Error("Entrega já avaliada — a reflexão não pode mais mudar.");
    }
    const recordedAt = recorded ? new Date().toISOString() : null;
    await repositories.reflections.save(scope.institutionId, {
      id: `reflection-${scope.studentId}-${scope.missionId}`,
      institutionId: scope.institutionId,
      classroomId: scope.classroomId,
      studentId: scope.studentId,
      missionId: scope.missionId,
      text: current.reflection,
      recordedAt,
      visibility: "shared_with_teacher",
    });
    // Estado derivado localmente do que acabou de ser gravado, sem reler a
    // turma inteira (economiza uma rodada ao banco hospedado por ação —
    // investigação de latência de 27/09, docs/operations/retomada-homologacao.md;
    // porte do snapshot 4c0549d para o piloto da 1ª série A).
    const work: StudentWork = { ...current, reflectionRecordedAt: recordedAt };
    await syncProgress(scope, work);
    return work;
  }

  /**
   * Avaliação humana do Professor — só sobre entrega concluída
   * (`canTransitionSubmission`). Em Missão de dois eixos, exige a
   * avaliação SEPARADA da disciplina e da IA (`assertAxesReview`).
   */
  async function reviewSubmission(
    scope: LearningCycleScope,
    review: Omit<StudentWorkReview, "reviewedAt">,
    axes?: MissionAxes,
  ): Promise<StudentWork> {
    assertAxesReview(axes, review.axes);
    const current = await getStudentWork(scope);
    const status = getStudentSubmissionStatus(current);
    if (!canTransitionSubmission(status, "reviewed")) {
      throw new Error("A entrega precisa estar concluída antes da avaliação.");
    }
    const reviewedAt = new Date().toISOString();
    await repositories.missionReviews.save(scope.institutionId, {
      id: `review-${scope.studentId}-${scope.missionId}`,
      institutionId: scope.institutionId,
      classroomId: scope.classroomId,
      studentId: scope.studentId,
      missionId: scope.missionId,
      grade: review.grade,
      observedCriteria: review.observedCriteria,
      feedback: review.feedback,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewerName,
      reviewedAt,
      axes: review.axes ?? null,
    });
    // Estado derivado localmente do que acabou de ser gravado, sem reler a
    // turma inteira (economiza uma rodada ao banco hospedado por ação —
    // investigação de latência de 27/09, docs/operations/retomada-homologacao.md;
    // porte do snapshot 4c0549d para o piloto da 1ª série A).
    const work: StudentWork = {
      ...current,
      review: {
        grade: review.grade,
        observedCriteria: review.observedCriteria,
        feedback: review.feedback,
        reviewedAt,
        reviewerId: review.reviewerId,
        reviewerName: review.reviewerName,
        axes: review.axes ?? null,
      },
    };
    await syncProgress(scope, work);
    return work;
  }

  return {
    getStudentWork,
    startMission,
    saveProductionDraft,
    setProductionDelivered,
    saveReflectionDraft,
    setReflectionRecorded,
    saveAiEvidenceDraft,
    reviewSubmission,
  };
}

export type LearningCycleService = ReturnType<typeof createLearningCycleService>;
