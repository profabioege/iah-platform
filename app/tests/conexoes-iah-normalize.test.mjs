import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTerm, scoreTermAgainstCandidates } from "../src/modules/conexoes-iah/infrastructure/knowledge-sources/normalize.ts";

test("normaliza acentos, caixa e espaços", () => {
  assert.equal(normalizeTerm("Mais-Valia"), "mais-valia");
  assert.equal(normalizeTerm("  Seleção   Natural  "), "selecao natural");
  assert.equal(normalizeTerm("FUNÇÃO EXPONENCIAL"), "funcao exponencial");
});

test("score 1 para igualdade exata", () => {
  assert.equal(scoreTermAgainstCandidates("mais-valia", ["mais-valia", "outra coisa"]), 1);
});

test("score alto para substring", () => {
  const score = scoreTermAgainstCandidates("mais-valia", ["mais-valia trabalho e producao"]);
  assert.ok(score >= 0.7, `esperado >= 0.7, recebido ${score}`);
});

test("score 0 quando não há nenhuma relação", () => {
  assert.equal(scoreTermAgainstCandidates("mais-valia", ["fotossintese", "geometria"]), 0);
});

test("não usa condicional por termo — qualquer novo candidato na lista já é encontrado", () => {
  const candidates = ["um conceito qualquer nunca antes visto"];
  const score = scoreTermAgainstCandidates("um conceito qualquer", candidates);
  assert.ok(score > 0, "deve casar por sobreposição de tokens, sem lista de exceções");
});
