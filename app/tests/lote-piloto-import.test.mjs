/**
 * Carga do lote piloto IAH no Catálogo (D-053) — leitura do arquivo
 * consolidado e plano de carga, sem banco. A gravação reaproveita
 * `applyAuthoredImport`, já coberta pelos testes do acervo autoral.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { parseLotePiloto, buildLotePilotoPlan, LOTE_PILOTO_SOURCE_SUFFIX } = await import(
  "@/modules/question-bank/catalog/iah-lote-piloto-import.ts"
);

const fixture = JSON.parse(
  await readFile(new URL("./e2e/fixtures/lote-piloto-sintetico.json", import.meta.url), "utf8"),
);

test("só itens aprovados pela coordenação entram; rascunho é recusado com motivo", () => {
  const { items, problems } = parseLotePiloto(fixture);
  assert.deepEqual(items.map((i) => i.codigo), ["IAH-CH-901"]);
  assert.equal(problems.length, 1);
  assert.match(problems[0].problema, /só itens aprovados/);
});

test("devolutiva por alternativa: a correta recebe a resolução; as erradas, a análise do distrator", () => {
  const [item] = parseLotePiloto(fixture).items;
  assert.equal(item.feedback.B, "B está correta porque é o teste.");
  assert.equal(item.feedback.A, "A errada.");
  assert.equal(Object.keys(item.feedback).length, 5);
  assert.equal(item.matriz.codigo, "CH-H1");
  assert.match(item.stem, /Linha 1[^\n]*\n\nLinha 2/);
});

test("plano: fonte própria do lote, dificuldade editorial e decisão da coordenação registradas", () => {
  const plan = buildLotePilotoPlan({
    json: fixture,
    arquivo: "lote-piloto-sintetico.json",
    catalogInstitutionId: "iah-catalogo-teste",
    authorUserId: "autoria-1",
    knownSkillIds: new Set(["bncc-em13chs101", "enem-ch-h1"]),
  });
  assert.equal(plan.source.id, `src:iah-catalogo-teste:${LOTE_PILOTO_SOURCE_SUFFIX}`);
  assert.equal(plan.items.length, 1);
  const [it] = plan.items;
  assert.equal(it.version.source_id, plan.source.id);
  assert.equal(it.version.editorial_difficulty, "media");
  assert.equal(it.question.skill_id, "bncc-em13chs101");
  assert.equal(it.question.external_ref.origem, "iah_lote_piloto");
  assert.equal(it.question.external_ref.classificacao.origem, "autor");
  assert.equal(it.question.external_ref.decisao_coordenacao.decisao, "aprovada");
  assert.equal(it.key.answer_key, "B");
  assert.ok(plan.problems.some((p) => p.codigo === "IAH-MT-902"));
});

test("habilidade fora da referência carregada vira problema, não item", () => {
  const plan = buildLotePilotoPlan({
    json: fixture,
    arquivo: "x.json",
    catalogInstitutionId: "c",
    authorUserId: "a",
    knownSkillIds: new Set(),
  });
  assert.equal(plan.items.length, 0);
  assert.ok(plan.problems.some((p) => /fora da referência/.test(p.problema)));
});
