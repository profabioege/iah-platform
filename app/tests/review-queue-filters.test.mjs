/**
 * Fila de revisão filtrada por série sugerida e habilidade (D-055) — para
 * a revisão docente dos itens da 1ª série no sistema.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { suggestedGradeOf, filterQueueRows } = await import("@/modules/question-bank/services/editorial-service");

const q = (serie) => ({ id: "q", institutionId: "i", componentId: "c", skillId: "s", createdBy: "u", externalRef: { serie_sugerida: serie } });

test("série sugerida do item: formatos do lote e do acervo", () => {
  assert.equal(suggestedGradeOf(q("1ª")), "em1");
  assert.equal(suggestedGradeOf(q("2ª série")), "em2");
  assert.equal(suggestedGradeOf(q("em3")), "em3");
  assert.equal(suggestedGradeOf(q(null)), null);
  assert.equal(suggestedGradeOf({ ...q("1ª"), externalRef: null }), null);
  assert.equal(suggestedGradeOf(q("Ensino Médio")), null);
});

test("filtros combinam série e código da habilidade (sem diferenciar maiúsculas)", () => {
  const row = (serie, code) => ({ serie, skill: code ? { code } : null, version: { id: `${serie}-${code}` } });
  const rows = [row("em1", "EM13CHS101"), row("em1", "EM13MAT103"), row("em2", "EM13CHS101"), row(null, "EM13CHS101")];
  assert.equal(filterQueueRows(rows, {}).length, 4);
  assert.deepEqual(filterQueueRows(rows, { serie: "em1" }).map((r) => r.version.id), ["em1-EM13CHS101", "em1-EM13MAT103"]);
  assert.deepEqual(filterQueueRows(rows, { habilidade: "em13chs101" }).length, 3);
  assert.deepEqual(filterQueueRows(rows, { serie: "em1", habilidade: "EM13CHS101" }).map((r) => r.version.id), ["em1-EM13CHS101"]);
});
