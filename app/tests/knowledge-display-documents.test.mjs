/**
 * Telas que só CITAM documentos do Knowledge Engine (Turmas, Currículo,
 * editor de aula) não podem cair com 500 no modo real enquanto o
 * repositório de banco for stub — nem exibir os seeds de demonstração
 * numa instalação real.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { listKnowledgeDocumentsForDisplay, getDefaultKnowledgeRepositories } = await import("@/modules/knowledge");

function withEnv(values, fn) {
  const saved = Object.fromEntries(Object.keys(values).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return Promise.resolve(fn()).finally(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

test("modo real com banco sem Knowledge Engine: lista vazia, sem erro e sem seed", async () => {
  await withEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x" }, async () => {
    assert.deepEqual(await listKnowledgeDocumentsForDisplay(), { documents: [], available: false });
    // Quem depende do Knowledge Engine continua recebendo o erro explícito.
    await assert.rejects(() => getDefaultKnowledgeRepositories().documents.list(), /ainda não está disponível/);
  });
});

test("demonstração (sem banco): documentos dos seeds", async () => {
  await withEnv({ NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined }, async () => {
    const { documents, available } = await listKnowledgeDocumentsForDisplay();
    assert.equal(available, true);
    assert.ok(documents.length > 0);
  });
});
