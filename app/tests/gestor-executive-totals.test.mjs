/**
 * REGRESSÃO M23 — Painel do Gestor no modo real (D6 do smoke test
 * FASE 3): "avaliado" é a continuação do funil, não um estado à parte.
 * Um aluno avaliado deve continuar contando como entregue e concluído,
 * e "foram avaliados" precisa refletir quem de fato foi avaliado.
 *
 * Achado original: `deliveredStudents`/`completedStudents` excluíam
 * "avaliado" das listas de status aceitos, fazendo um aluno "sumir" dos
 * contadores assim que era avaliado; "reviewedStudents" não tinha
 * nenhuma fonte de dado no modo real (fixo em 0 no componente cliente).
 */

import assert from "node:assert/strict";
import test from "node:test";

import { computeExecutiveTotals } from "../src/app/(platform)/gestor/executive-totals.ts";

test("funil cumulativo: avaliado conta como entregue, concluído e avaliado", () => {
  const studentRows = [
    { status: "avaliado" },
    { status: "concluiu" },
    ...Array.from({ length: 8 }, () => ({ status: "nao_acessou" })),
  ];

  const totals = computeExecutiveTotals(studentRows);

  assert.equal(totals.activeStudents, 2, "ativos/participaram");
  assert.equal(totals.deliveredStudents, 2, "entregaram");
  assert.equal(totals.completedStudents, 2, "concluíram");
  assert.equal(totals.reviewedStudents, 1, "foram avaliados");
});

test("estados anteriores ao funil de entrega não contam como entregue/concluído/avaliado", () => {
  const studentRows = [
    { status: "visualizou" },
    { status: "investigando" },
    { status: "produzindo" },
    { status: "rascunho" },
  ];

  const totals = computeExecutiveTotals(studentRows);

  assert.equal(totals.activeStudents, 4);
  assert.equal(totals.deliveredStudents, 0);
  assert.equal(totals.completedStudents, 0);
  assert.equal(totals.reviewedStudents, 0);
});

test("nenhum aluno ativo — todos os totais zerados (baseline D0)", () => {
  const studentRows = Array.from({ length: 10 }, () => ({ status: "nao_acessou" }));

  const totals = computeExecutiveTotals(studentRows);

  assert.deepEqual(totals, {
    activeStudents: 0,
    deliveredStudents: 0,
    completedStudents: 0,
    reviewedStudents: 0,
    pendingReviewStudents: 0,
  });
});

// REGISTRO 14, G2: "aguardam avaliação" eram todos os concluídos (inclusive
// os já avaliados). Base da homologação de 22/10: 2 avaliados, 1 concluído
// sem avaliação e a fixture F1 com a produção reaberta (produzindo).
test("aguardam avaliação = concluíram e não foram avaliados (base da homologação → 1)", () => {
  const studentRows = [
    { status: "avaliado" },
    { status: "concluiu" },
    { status: "avaliado" },
    { status: "produzindo" },
  ];

  const totals = computeExecutiveTotals(studentRows);

  assert.equal(totals.pendingReviewStudents, 1, "só o concluído sem avaliação");
  assert.equal(totals.completedStudents, 3, "o funil aprovado não muda");
  assert.equal(totals.deliveredStudents, 3);
  assert.equal(totals.reviewedStudents, 2);
  assert.equal(totals.activeStudents, 4);
});

test("quem só entregou ou reabriu a produção não aguarda avaliação", () => {
  const totals = computeExecutiveTotals([
    { status: "entregue" },
    { status: "reflexao" },
    { status: "produzindo" },
    { status: "rascunho" },
  ]);

  assert.equal(totals.pendingReviewStudents, 0);
});
