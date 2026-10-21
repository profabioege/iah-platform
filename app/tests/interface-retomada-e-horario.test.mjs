/**
 * Pendências de interface da homologação de e09fc62 (REGISTRO 11.5):
 * F1 — retomada e mensagem de conclusão com produção reaberta e reflexão
 * registrada; F2 — "Último acesso" sempre em America/Sao_Paulo; e o botão
 * "Reabrir" da reflexão alinhado à regra do servidor depois da avaliação.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const { missions } = await import("@/content/missions/index.ts");
const { createLearningCycleService } = await import("@/modules/platform/services/learning-cycle-service");
const flow = await import("@/app/(platform)/missoes/[id]/mission-flow/flow-state.ts");
const hyp = await import("@/app/(platform)/missoes/[id]/mission-flow/report-hypotheses.ts");
const { formatSchoolDateTime, SCHOOL_TIME_ZONE } = await import("@/lib/school-time.ts");

const mission01 = missions.find((m) => m.id === "01-a-fabrica-de-noticias");
const TEMPLATE = mission01.productionTemplate;
const N = 4;
const RELATORIO = hyp.setHypothesis("Relatório anterior do aluno.", 1, "Parece confiável.", N, TEMPLATE);

// ------------------------------------------------------------------ F1

test("F1: produção reaberta com reflexão registrada retoma a Produção, sem cartão de entrega", () => {
  const estado = { delivered: false, recorded: true, reviewed: false };
  assert.deepEqual(flow.resumeTarget(estado, RELATORIO, TEMPLATE, N), { kind: "production" });
  assert.equal(flow.completionState(estado), null, "não pode dizer que produção e reflexão foram entregues");
  assert.equal(flow.isReopenedWithRecordedReflection(estado), true, "mostra o estado verdadeiro (rascunho)");
});

test("F1: reaberta só com parte das hipóteses volta ao primeiro item sem hipótese; vazia volta à Produção", () => {
  const estado = { delivered: false, recorded: true, reviewed: false };
  const parcial = hyp.setHypothesis("", 1, "H1", N, TEMPLATE);
  assert.deepEqual(flow.resumeTarget(estado, parcial, TEMPLATE, N), { kind: "investigation", evidenceIndex: 2 });
  assert.deepEqual(flow.resumeTarget(estado, "", TEMPLATE, N), { kind: "production" });
  assert.deepEqual(flow.resumeTarget(estado, "", undefined, N), { kind: "production" });
});

test("F1: 'entregue' só quando produção entregue E reflexão registrada", () => {
  const completo = { delivered: true, recorded: true, reviewed: false };
  assert.deepEqual(flow.resumeTarget(completo, RELATORIO, TEMPLATE, N), { kind: "reflection" });
  assert.equal(flow.completionState(completo), "awaiting_review");
  assert.equal(flow.isReopenedWithRecordedReflection(completo), false);

  const soEntregue = { delivered: true, recorded: false, reviewed: false };
  assert.deepEqual(flow.resumeTarget(soEntregue, RELATORIO, TEMPLATE, N), { kind: "delivery" });
  assert.equal(flow.completionState(soEntregue), null);

  const nada = { delivered: false, recorded: false, reviewed: false };
  assert.deepEqual(flow.resumeTarget(nada, "", TEMPLATE, N), { kind: "start" });
  assert.deepEqual(flow.resumeTarget(nada, RELATORIO, TEMPLATE, N), { kind: "production" });
  assert.equal(flow.completionState(nada), null);
});

test("F1: com avaliação, a devolutiva continua sendo apresentada na Reflexão", () => {
  const avaliado = { delivered: true, recorded: true, reviewed: true };
  assert.deepEqual(flow.resumeTarget(avaliado, RELATORIO, TEMPLATE, N), { kind: "reflection" });
  assert.equal(flow.completionState(avaliado), "reviewed");
  assert.equal(flow.isReopenedWithRecordedReflection(avaliado), false);
});

// ------------------------------------------------------- botão Reabrir

test("Reabrir reflexão: a interface só oferece antes da avaliação", () => {
  assert.equal(flow.canReopenReflection({ recorded: true, reviewed: false }), true);
  assert.equal(flow.canReopenReflection({ recorded: true, reviewed: true }), false);
  assert.equal(flow.canReopenReflection({ recorded: false, reviewed: false }), false);
});

function memoryRepositories() {
  const tables = { productions: [], reflections: [], reviews: [], progress: [] };
  const byMission = (table) => ({
    async listByClassroomMission(institutionId, classroomId, missionId) {
      return tables[table]
        .filter((r) => r.institutionId === institutionId && r.classroomId === classroomId && r.missionId === missionId)
        .map((r) => structuredClone(r));
    },
    async save(_institutionId, row) {
      const i = tables[table].findIndex((r) => r.id === row.id);
      const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
      if (i >= 0) tables[table][i] = { ...tables[table][i], ...clean };
      else tables[table].push({ ...clean });
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

const scope = { institutionId: "inst-sintetica", classroomId: "turma-1a", studentId: "aluno-01", missionId: mission01.id };
const evidencia = {
  tool: "Demonstração do professor (Plano B)",
  request: "Pedido sintético",
  response: "Resposta sintética",
  verification: "Conferi a fonte",
  decision: "Descartei",
};

test("servidor (isolado): reabrir reflexão ou produção depois da avaliação é recusado e nada muda", async () => {
  const { repositories, tables } = memoryRepositories();
  const cycle = createLearningCycleService(repositories);
  const axes = mission01.axes;
  await cycle.saveProductionDraft(scope, RELATORIO);
  await cycle.saveAiEvidenceDraft(scope, evidencia);
  await cycle.setProductionDelivered(scope, true, axes);
  await cycle.saveReflectionDraft(scope, "Reflexão sintética.");
  await cycle.setReflectionRecorded(scope, true);
  await cycle.reviewSubmission(
    scope,
    {
      grade: "Bom",
      observedCriteria: [],
      feedback: "Devolutiva sintética.",
      reviewerId: "prof-1",
      reviewerName: "Professor sintético",
      axes: {
        discipline: { level: "atingido", observedCriteria: [], note: "", skillCode: axes.discipline.skill.code },
        ai: { level: "em_desenvolvimento", observedCriteria: [], note: "", competencyIds: [...axes.ai.competencyIds] },
      },
    },
    axes,
  );
  const antes = structuredClone(tables);

  await assert.rejects(() => cycle.setReflectionRecorded(scope, false), /Entrega já avaliada/);
  await assert.rejects(() => cycle.setProductionDelivered(scope, false, axes), /Entrega já avaliada/);
  await assert.rejects(() => cycle.saveReflectionDraft(scope, "outra"), /reabra antes de editar/);

  assert.deepEqual(tables.productions, antes.productions);
  assert.deepEqual(tables.reflections, antes.reflections);
  assert.deepEqual(tables.reviews, antes.reviews);
  const work = await cycle.getStudentWork(scope);
  assert.ok(work.review && work.productionDeliveredAt && work.reflectionRecordedAt);
});

test("servidor (isolado): antes da avaliação, reabrir a produção mantém a reflexão registrada", async () => {
  const { repositories } = memoryRepositories();
  const cycle = createLearningCycleService(repositories);
  await cycle.saveProductionDraft(scope, RELATORIO);
  await cycle.saveAiEvidenceDraft(scope, evidencia);
  await cycle.setProductionDelivered(scope, true, mission01.axes);
  await cycle.saveReflectionDraft(scope, "Reflexão sintética.");
  await cycle.setReflectionRecorded(scope, true);
  const reaberto = await cycle.setProductionDelivered(scope, false, mission01.axes);
  assert.equal(reaberto.productionDeliveredAt, null);
  assert.ok(reaberto.reflectionRecordedAt, "a reflexão não é apagada nem desfeita pela reabertura");
  assert.equal(reaberto.reflection, "Reflexão sintética.");
  const estado = { delivered: false, recorded: true, reviewed: false };
  assert.equal(flow.completionState(estado), null);
  assert.deepEqual(flow.resumeTarget(estado, reaberto.production, TEMPLATE, N), { kind: "production" });
});

// ------------------------------------------------------------------ F2

test("F2: 'Último acesso' em America/Sao_Paulo, sem mudar o timestamp armazenado", () => {
  assert.equal(SCHOOL_TIME_ZONE, "America/Sao_Paulo");
  const armazenado = "2026-10-20T23:54:13.640Z";
  assert.equal(formatSchoolDateTime(armazenado), "20/10, 20:54");
  assert.equal(armazenado, "2026-10-20T23:54:13.640Z");
  // Virada de dia em UTC ainda é o dia anterior em Brasília.
  assert.equal(formatSchoolDateTime("2026-10-21T01:30:00.000Z"), "20/10, 22:30");
});

test("F2: o mesmo texto em qualquer fuso do processo (servidor UTC × navegador em Brasília)", () => {
  const modulo = fileURLToPath(new URL("../src/lib/school-time.ts", import.meta.url));
  const codigo = `import(${JSON.stringify("file:///" + modulo.replace(/\\/g, "/"))}).then((m) => process.stdout.write(m.formatSchoolDateTime("2026-10-20T23:54:13.640Z")))`;
  // Sem `timeZone`, o formatador antigo dava "23:54" com TZ=UTC e "20:54" em Brasília.
  const saidas = ["UTC", "America/Sao_Paulo"].map((tz) =>
    execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "-e", codigo], {
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    }),
  );
  assert.deepEqual(saidas, ["20/10, 20:54", "20/10, 20:54"]);
});
