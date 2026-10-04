/**
 * Telas do professor que citam documentos do Knowledge Engine abrem no
 * modo real (antes respondiam 500: o repositório de banco ainda é stub).
 * Pela rede, com login normal.
 */

import assert from "node:assert/strict";
import test, { before } from "node:test";

import { autenticar } from "./support/sessoes.mjs";
import { TURMA, conta } from "./support/ambiente.mjs";

let professor;

before(async () => {
  professor = await autenticar(conta(TURMA, "professor"));
});

for (const caminho of ["/professor/turmas", "/professor/curriculo", "/professor/aulas/aula-homologacao"]) {
  test(`${caminho} abre no modo real`, async () => {
    const { status, caminhoFinal } = await professor.html(caminho);
    assert.equal(status, 200);
    assert.equal(caminhoFinal, caminho);
  });
}
