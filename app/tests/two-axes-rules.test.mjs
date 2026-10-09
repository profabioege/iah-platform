/**
 * Missão de dois eixos (D-053) — regras puras: especificação da Missão,
 * entrega com registro de uso da IA, avaliação separada por eixo e o
 * serviço do ciclo com repositórios em memória. As barreiras do banco
 * (0021 + RLS) ficam em tests/pilot/two-axes.test.mjs.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { validateMissionAxes, resolveAiCompetencies, AI_COMPETENCIES } = await import("@/modules/library");
const { missions } = await import("@/content/missions/index.ts");
const { assertAxesReview, assertDeliverable, assertAiEvidenceWithinLimit } = await import(
  "@/modules/platform/domain/two-axes-rules"
);
const { isAiEvidenceComplete, EMPTY_AI_EVIDENCE } = await import("@/modules/classroom");
const { createLearningCycleService } = await import("@/modules/platform/services/learning-cycle-service");

const mission01 = missions.find((m) => m.id === "01-a-fabrica-de-noticias");
const axes = mission01.axes;

const fullEvidence = {
  tool: "assistente de texto",
  request: "Escreva uma manchete falsa e convincente sobre a escola.",
  response: "Escola X é a primeira do país a substituir provas por IA.",
  verification: "Sem fonte identificável e afirmação absoluta: critério Fonte e Evidência.",
  decision: "Descartei a manchete; mantive só a análise do porquê ela engana.",
};

function reviewFor(overrides = {}) {
  return {
    discipline: {
      level: "atingido",
      observedCriteria: [axes.discipline.criteria[0]],
      note: "",
      skillCode: axes.discipline.skill.code,
      ...(overrides.discipline ?? {}),
    },
    ai: {
      level: "em_desenvolvimento",
      observedCriteria: [axes.ai.criteria[0]],
      note: "",
      competencyIds: [...axes.ai.competencyIds],
      ...(overrides.ai ?? {}),
    },
  };
}

test("Missão 01 tem os dois eixos completos e separados", () => {
  assert.ok(axes, "Missão 01 sem eixos");
  assert.deepEqual(validateMissionAxes(axes), []);
  assert.equal(axes.discipline.area, "CHS");
  assert.equal(axes.discipline.skill.code, "EM13CHS101");
  assert.equal(resolveAiCompetencies(axes).length, axes.ai.competencyIds.length);
});

test("toda Missão com eixos do catálogo passa na validação", () => {
  for (const m of missions.filter((x) => x.axes)) {
    assert.deepEqual(validateMissionAxes(m.axes), [], m.id);
  }
});

test("validação recusa critério repetido nos dois eixos e competência fora do referencial", () => {
  const broken = structuredClone(axes);
  broken.ai.criteria = [...broken.ai.criteria, broken.discipline.criteria[0]];
  broken.ai.competencyIds = [...broken.ai.competencyIds, "ia-inventada-99"];
  const problems = validateMissionAxes(broken);
  assert.ok(problems.some((p) => p.includes("critério repetido")));
  assert.ok(problems.some((p) => p.includes("ia-inventada-99")));
});

test("referencial IAH de IA: ids únicos e as quatro dimensões presentes", () => {
  const ids = AI_COMPETENCIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    [...new Set(AI_COMPETENCIES.map((c) => c.dimension))].sort(),
    ["avaliar", "compreender", "criar", "usar"],
  );
});

test("registro de uso da IA: completo só com os cinco campos; limites de tamanho", () => {
  assert.equal(isAiEvidenceComplete(EMPTY_AI_EVIDENCE), false);
  assert.equal(isAiEvidenceComplete({ ...fullEvidence, verification: "  " }), false);
  assert.equal(isAiEvidenceComplete(fullEvidence), true);
  assert.throws(() => assertAiEvidenceWithinLimit({ ...fullEvidence, request: "x".repeat(2001) }), /limite/);
});

test("entrega: Missão de dois eixos exige o registro; Missão antiga não", () => {
  assert.throws(() => assertDeliverable(axes, EMPTY_AI_EVIDENCE), /registro de uso da IA/);
  assert.doesNotThrow(() => assertDeliverable(axes, fullEvidence));
  assert.doesNotThrow(() => assertDeliverable(undefined, EMPTY_AI_EVIDENCE));
});

test("avaliação: exige os dois eixos, a habilidade e as competências da Missão", () => {
  assert.throws(() => assertAxesReview(axes, null), /dois eixos/);
  assert.doesNotThrow(() => assertAxesReview(axes, reviewFor()));
  assert.throws(
    () => assertAxesReview(axes, reviewFor({ discipline: { skillCode: "EM13CHS103" } })),
    /habilidade avaliada/,
  );
  assert.throws(() => assertAxesReview(axes, reviewFor({ ai: { competencyIds: ["ia-usar-01"] } })), /competências/);
  assert.throws(
    () => assertAxesReview(axes, reviewFor({ ai: { observedCriteria: [axes.discipline.criteria[0]] } })),
    /Critério fora/,
    "critério da disciplina não vale como critério de IA",
  );
  assert.throws(() => assertAxesReview(axes, reviewFor({ ai: { level: "otimo" } })), /nível/);
  assert.throws(() => assertAxesReview(undefined, reviewFor()), /não tem avaliação por eixo/);
  assert.doesNotThrow(() => assertAxesReview(undefined, null));
});

// ---------------------------------------------------------------------------
// Serviço do ciclo com repositórios em memória
// ---------------------------------------------------------------------------
function memoryRepositories() {
  const tables = { productions: [], reflections: [], reviews: [], progress: [] };
  const byMission = (table) => ({
    async listByClassroomMission(institutionId, classroomId, missionId) {
      return tables[table].filter(
        (r) => r.institutionId === institutionId && r.classroomId === classroomId && r.missionId === missionId,
      );
    },
    async save(institutionId, row) {
      const i = tables[table].findIndex((r) => r.id === row.id);
      // Mesma semântica do upsert do PostgREST: só as colunas enviadas mudam.
      const merged = i >= 0 ? { ...tables[table][i], ...row } : { ...row };
      if (i >= 0) tables[table][i] = merged;
      else tables[table].push(merged);
    },
  });
  return {
    tables,
    repositories: {
      productions: byMission("productions"),
      reflections: byMission("reflections"),
      missionReviews: byMission("reviews"),
      missionProgress: { async save(_i, row) { tables.progress.push(row); } },
    },
  };
}

const scope = { institutionId: "inst-a", classroomId: "turma-1", studentId: "aluno-1", missionId: mission01.id };

test("ciclo: rascunho do registro de IA persiste e sobrevive ao autosave da produção", async () => {
  const { repositories } = memoryRepositories();
  const cycle = createLearningCycleService(repositories);
  await cycle.startMission(scope);
  await cycle.saveAiEvidenceDraft(scope, fullEvidence);
  await cycle.saveProductionDraft(scope, "Relatório de auditoria");
  const work = await cycle.getStudentWork(scope);
  assert.deepEqual(work.aiEvidence, fullEvidence, "salvar a produção não pode apagar o registro de IA");
  assert.equal(work.production, "Relatório de auditoria");
});

test("ciclo: entrega recusada sem registro; aceita com registro; registro trava depois da entrega", async () => {
  const { repositories } = memoryRepositories();
  const cycle = createLearningCycleService(repositories);
  await cycle.saveProductionDraft(scope, "Relatório");
  await assert.rejects(() => cycle.setProductionDelivered(scope, true, axes), /registro de uso da IA/);
  await cycle.saveAiEvidenceDraft(scope, fullEvidence);
  const delivered = await cycle.setProductionDelivered(scope, true, axes);
  assert.ok(delivered.productionDeliveredAt);
  await assert.rejects(() => cycle.saveAiEvidenceDraft(scope, fullEvidence), /já foi entregue/);
});

test("ciclo: avaliação grava e devolve os dois eixos separados", async () => {
  const { repositories, tables } = memoryRepositories();
  const cycle = createLearningCycleService(repositories);
  await cycle.saveProductionDraft(scope, "Relatório");
  await cycle.saveAiEvidenceDraft(scope, fullEvidence);
  await cycle.setProductionDelivered(scope, true, axes);
  await cycle.saveReflectionDraft(scope, "Minha hipótese mudou porque…");
  await cycle.setReflectionRecorded(scope, true);
  const review = {
    grade: "Bom",
    observedCriteria: [],
    feedback: "Análise histórica sólida; falta verificar a IA.",
    reviewerId: "prof-1",
    reviewerName: "Professora",
    axes: reviewFor(),
  };
  await assert.rejects(
    () => cycle.reviewSubmission(scope, { ...review, axes: null }, axes),
    /dois eixos/,
  );
  const work = await cycle.reviewSubmission(scope, review, axes);
  assert.equal(work.review.axes.discipline.level, "atingido");
  assert.equal(work.review.axes.ai.level, "em_desenvolvimento");
  assert.equal(tables.reviews[0].axes.discipline.skillCode, "EM13CHS101");
});
