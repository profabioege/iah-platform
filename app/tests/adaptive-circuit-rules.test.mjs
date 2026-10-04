/**
 * Circuito adaptativo (D-051) — regras puras: estado por habilidade,
 * nível da rodada, posição na sequência e agrupamento da evidência.
 * As barreiras do banco ficam em tests/pilot/adaptive-circuit.test.mjs.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { skillMastery, nextRoundLevel, circuitPosition, groupEvidence, MASTERY_RULES } = await import(
  "@/modules/question-bank/domain/adaptive"
);

const ev = (...bits) => bits.map((b, i) => ({ isCorrect: b === 1, at: `2026-10-0${1}T10:${String(i).padStart(2, "0")}:00Z` }));

test("sem resposta → sem evidência", () => {
  assert.deepEqual(skillMastery([]), { state: "sem_evidencia", correct: 0, total: 0, answered: 0, insufficient: true });
});

test("3 de 3 ainda não é consolidado (evidência curta)", () => {
  const m = skillMastery(ev(1, 1, 1));
  assert.equal(m.state, "consolidando");
  assert.equal(m.insufficient, false);
});

test("consolidado exige 4+ na janela, 80% e a última certa", () => {
  assert.equal(skillMastery(ev(1, 1, 1, 1)).state, "consolidado");
  assert.equal(skillMastery(ev(1, 1, 1, 1, 0)).state, "consolidando", "última errada");
  assert.equal(skillMastery(ev(0, 1, 1, 1, 1)).state, "consolidado", "4/5 com a última certa");
});

test("só a janela mais recente conta (ordem pela data, não pela entrada)", () => {
  const antigos = ev(0, 0, 0, 0, 0).map((e, i) => ({ ...e, at: `2026-09-01T00:0${i}:00Z` }));
  const recentes = ev(1, 1, 1, 1, 1).map((e, i) => ({ ...e, at: `2026-10-01T00:0${i}:00Z` }));
  const m = skillMastery([...recentes, ...antigos]);
  assert.equal(m.state, "consolidado");
  assert.equal(m.answered, 10);
  assert.equal(m.total, MASTERY_RULES.janela);
});

test("taxa baixa → em desenvolvimento", () => {
  assert.equal(skillMastery(ev(0, 1, 0)).state, "em_desenvolvimento");
  assert.equal(skillMastery(ev(1, 0)).state, "em_desenvolvimento");
});

test("nível da próxima rodada pela última rodada", () => {
  assert.equal(nextRoundLevel(null), "regular");
  assert.equal(nextRoundLevel({ correct: 1, total: 3 }), "apoio");
  assert.equal(nextRoundLevel({ correct: 2, total: 3 }), "regular");
  assert.equal(nextRoundLevel({ correct: 3, total: 3 }), "desafio");
});

test("posição: híbrido nunca avança sozinho", () => {
  const seq = ["s1", "s2", "s3"];
  const cons = new Map([["s1", skillMastery(ev(1, 1, 1, 1))]]);
  assert.deepEqual(circuitPosition(seq, new Set(), cons), { currentSkillId: null, nextSkillId: "s1", status: "sem_liberacao" });
  assert.deepEqual(circuitPosition(seq, new Set(["s1"]), new Map()), { currentSkillId: "s1", nextSkillId: "s2", status: "praticando" });
  assert.deepEqual(circuitPosition(seq, new Set(["s1"]), cons), { currentSkillId: "s1", nextSkillId: "s2", status: "pronto_para_avancar" });
  assert.equal(circuitPosition(seq, new Set(["s1", "s2"]), cons).currentSkillId, "s2", "a última liberada é a atual");
  const fim = new Map([["s3", skillMastery(ev(1, 1, 1, 1))]]);
  assert.equal(circuitPosition(seq, new Set(["s3"]), fim).status, "concluiu_sequencia");
});

test("evidência agrupada por aluno e habilidade", () => {
  const g = groupEvidence([
    { studentId: "a", isCorrect: true, at: "1", skillIds: ["s1"] },
    { studentId: "a", isCorrect: false, at: "2", skillIds: ["s1", "s1"] },
    { studentId: "b", isCorrect: true, at: "3", skillIds: ["s2"] },
  ]);
  assert.equal(g.get("a").get("s1").length, 2, "habilidade repetida conta uma vez");
  assert.equal(g.get("b").get("s2").length, 1);
});
