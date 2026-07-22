import assert from "node:assert/strict";
import test from "node:test";

import { demoCurriculumConnectionProvider } from "../src/modules/conexoes-iah/infrastructure/providers/demo-curriculum-connection-provider.ts";

async function identifyAndSuggest(term, limit = 7) {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({
    term,
    disciplineSlug: "historia",
    educationLevel: "ensino_medio",
    grade: "2ª série",
  });
  const { connections } = await demoCurriculumConnectionProvider.suggestIahConnections({ context, limit });
  return connections;
}

test("caso obrigatório: 'Mais-valia' sugere conexões cobrindo automação, produtividade, plataformas, gestão algorítmica, distribuição de valor, concentração de renda e transformação do trabalho pela IA", async () => {
  const connections = await identifyAndSuggest("Mais-valia", 7);

  assert.ok(connections.length >= 3, "deve sugerir pelo menos 3 conexões");
  assert.ok(connections.length <= 7, "nunca mais que 7");

  const joined = connections.map((c) => `${c.title} ${c.rationale} ${c.pedagogicalApproach}`.toLowerCase()).join(" ");
  for (const expected of ["automa", "produtividade", "plataforma", "algor", "distribu", "concentra", "trabalho"]) {
    assert.ok(joined.includes(expected), `esperava encontrar "${expected}" nas conexões sugeridas`);
  }
});

test("apenas 3 conexões por padrão (Etapa 3 mostra 3 antes de 'Ver outras conexões')", async () => {
  const connections = await identifyAndSuggest("Mais-valia", 3);
  assert.equal(connections.length, 3);
});

test("cada conexão tem eixo IAH, justificativa curta e nível de confiança", async () => {
  const connections = await identifyAndSuggest("Mais-valia", 3);
  for (const connection of connections) {
    assert.ok(connection.iahAxisId);
    assert.ok(connection.rationale.length > 0);
    assert.ok(connection.confidence >= 0 && connection.confidence <= 1);
    assert.equal(connection.custom, false);
  }
});

test("outra área (Ciências): 'seleção natural' também retorna conexões curadas próprias", async () => {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({
    term: "seleção natural",
    disciplineSlug: "ciencias-natureza",
    educationLevel: "ensino_medio",
    grade: "3ª série",
  });
  const { connections } = await demoCurriculumConnectionProvider.suggestIahConnections({ context, limit: 7 });
  assert.ok(connections.length > 0);
  assert.ok(connections.every((c) => c.title.length > 0));
});

test("termo sem conexão curada honestamente retorna lista vazia, sem inventar", async () => {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({ term: "probabilidade" });
  const { connections } = await demoCurriculumConnectionProvider.suggestIahConnections({ context, limit: 7 });
  // "probabilidade" está no catálogo conceitual, mas não tem conexão IAH curada no MVP — caminho honesto.
  assert.equal(connections.length, 0);
});
