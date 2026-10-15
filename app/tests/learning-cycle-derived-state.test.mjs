/**
 * Piloto 1ª série A — o estado devolvido por cada ação do ciclo
 * (derivado localmente, sem reler a turma inteira) tem de ser IDÊNTICO
 * ao que uma releitura do banco devolveria. Se divergir, a tela do aluno
 * mostraria algo que não foi gravado. Repositórios em memória com a mesma
 * semântica do upsert do PostgREST (só as colunas enviadas mudam).
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { missions } = await import("@/content/missions/index.ts");
const { createLearningCycleService } = await import("@/modules/platform/services/learning-cycle-service");

const mission01 = missions.find((m) => m.id === "01-a-fabrica-de-noticias");
const axes = mission01.axes;

function memoryRepositories() {
  const tables = { productions: [], reflections: [], reviews: [], progress: [] };
  let reads = 0;
  const byMission = (table) => ({
    async listByClassroomMission(institutionId, classroomId, missionId) {
      reads += 1;
      return tables[table]
        .filter((r) => r.institutionId === institutionId && r.classroomId === classroomId && r.missionId === missionId)
        .map((r) => structuredClone(r));
    },
    async save(institutionId, row) {
      const i = tables[table].findIndex((r) => r.id === row.id);
      const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
      if (i >= 0) tables[table][i] = { ...tables[table][i], ...clean };
      else tables[table].push({ ...clean });
    },
  });
  return {
    tables,
    reads: () => reads,
    repositories: {
      productions: byMission("productions"),
      reflections: byMission("reflections"),
      missionReviews: byMission("reviews"),
      missionProgress: {
        async save(_i, row) {
          tables.progress.push(row);
        },
      },
    },
  };
}

const scope = { institutionId: "inst-sintetica", classroomId: "turma-1a", studentId: "aluno-01", missionId: mission01.id };
const evidence = {
  tool: "assistente de texto",
  request: "Pedido sintético",
  response: "Resposta sintética",
  verification: "Conferi a fonte",
  decision: "Descartei a afirmação",
};

async function assertMatchesReread(cycle, returned, label) {
  const reread = await cycle.getStudentWork(scope);
  assert.deepEqual(returned, reread, `${label}: estado devolvido difere da releitura`);
}

test("cada ação devolve exatamente o estado que a releitura do banco devolveria", async () => {
  const { repositories } = memoryRepositories();
  const cycle = createLearningCycleService(repositories);

  await assertMatchesReread(cycle, await cycle.startMission(scope), "startMission");
  await assertMatchesReread(cycle, await cycle.saveProductionDraft(scope, "Rascunho 1"), "saveProductionDraft");
  await assertMatchesReread(cycle, await cycle.saveAiEvidenceDraft(scope, evidence), "saveAiEvidenceDraft");
  await assertMatchesReread(cycle, await cycle.saveProductionDraft(scope, "Rascunho 2"), "saveProductionDraft após IA");
  await assertMatchesReread(cycle, await cycle.setProductionDelivered(scope, true, axes), "entrega");
  await assertMatchesReread(cycle, await cycle.setProductionDelivered(scope, false, axes), "reabertura");
  await assertMatchesReread(cycle, await cycle.setProductionDelivered(scope, true, axes), "nova entrega");
  await assertMatchesReread(cycle, await cycle.saveReflectionDraft(scope, "Reflexão"), "saveReflectionDraft");
  await assertMatchesReread(cycle, await cycle.setReflectionRecorded(scope, true), "setReflectionRecorded");
  const review = {
    grade: "Bom",
    observedCriteria: [],
    feedback: "Devolutiva sintética",
    reviewerId: "prof-1",
    reviewerName: "Professor sintético",
    axes: {
      discipline: {
        level: "atingido",
        observedCriteria: [axes.discipline.criteria[0]],
        note: "",
        skillCode: axes.discipline.skill.code,
      },
      ai: {
        level: "em_desenvolvimento",
        observedCriteria: [axes.ai.criteria[0]],
        note: "",
        competencyIds: [...axes.ai.competencyIds],
      },
    },
  };
  await assertMatchesReread(cycle, await cycle.reviewSubmission(scope, review, axes), "reviewSubmission");
});

test("gravação lê a turma uma vez (sem releitura depois de gravar)", async () => {
  const mem = memoryRepositories();
  const cycle = createLearningCycleService(mem.repositories);
  await cycle.startMission(scope);
  const before = mem.reads();
  await cycle.saveProductionDraft(scope, "Texto");
  // 3 listagens (produções, reflexões, avaliações) para conferir o estado atual; nenhuma depois.
  assert.equal(mem.reads() - before, 3);
});

test("entrega duplicada não cria segunda produção", async () => {
  const { repositories, tables } = memoryRepositories();
  const cycle = createLearningCycleService(repositories);
  await cycle.saveProductionDraft(scope, "Texto");
  await cycle.saveAiEvidenceDraft(scope, evidence);
  await cycle.setProductionDelivered(scope, true, axes);
  await assert.rejects(() => cycle.saveProductionDraft(scope, "Outro"), /já foi entregue/);
  assert.equal(tables.productions.length, 1);
  assert.equal(tables.productions[0].content, "Texto");
});
