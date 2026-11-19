/**
 * Avaliação do professor — nível obrigatório nos dois eixos (D-053).
 *
 * Relato do piloto (19/11/2026): "o botão Confirmar avaliação não conclui".
 * A regra estava certa (sem nível nos dois eixos nada é enviado), mas o aviso
 * era uma frase cinza sob o botão, sem dizer qual eixo faltava. A regra não
 * muda; a tela passa a apontar o eixo e a mostrar o aviso como erro.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  missingAxisLevels,
  missingLevelsMessage,
} from "../src/app/(platform)/professor/review-validation.ts";

const fonte = readFileSync(
  new URL("../src/app/(platform)/professor/class-panel.tsx", import.meta.url),
  "utf8",
).replace(/\r\n/g, "\n");

test("aponta exatamente o eixo sem nível", () => {
  assert.deepEqual(missingAxisLevels(undefined, undefined), ["discipline", "ai"]);
  assert.deepEqual(missingAxisLevels("atingido", undefined), ["ai"]);
  assert.deepEqual(missingAxisLevels(undefined, "superado"), ["discipline"]);
  assert.deepEqual(missingAxisLevels("atingido", "em_desenvolvimento"), []);
});

test("a mensagem nomeia o eixo e as opções de nível", () => {
  assert.equal(
    missingLevelsMessage(["ai"]),
    "Escolha o nível observado em Competência em IA (Não evidenciado, Em desenvolvimento, Atingido ou Superado) antes de confirmar.",
  );
  assert.match(missingLevelsMessage(["discipline", "ai"]), /em Disciplina e em Competência em IA/);
  assert.equal(missingLevelsMessage([]), "");
});

test("a regra continua: sem nível nos dois eixos, nada é enviado", () => {
  const submit = fonte.slice(fonte.indexOf("async function submitReview"), fonte.indexOf("if (realMode) {"));
  assert.match(submit, /if \(axes && !axesValue\) \{[^}]*return;/s, "retorna antes de qualquer envio");
  assert.match(submit, /if \(!grade\.trim\(\) \|\| !feedback\.trim\(\)\) \{[^}]*return;/s);
  assert.match(fonte, /if \(!axes \|\| !disciplineAxis\.level \|\| !aiAxis\.level\) return null;/);
});

test("erro aparece em destaque (alert) e os dois quadros podem ser destacados", () => {
  assert.match(fonte, /messageIsError \? \(\s*<p\s+role="alert"/);
  assert.match(fonte, /missingLevel=\{showMissingLevels && !disciplineAxis\.level\}/);
  assert.match(fonte, /missingLevel=\{showMissingLevels && !aiAxis\.level\}/);
  assert.match(fonte, /Escolha um nível para este eixo:/);
  // A confirmação de sucesso continua discreta.
  assert.match(fonte, /showInfo\("Avaliação registrada e devolutiva liberada para o aluno\."\)/);
});
