import assert from "node:assert/strict";
import test from "node:test";

import { getLlmProvider } from "../src/lib/ai/llm-provider-factory.ts";

/**
 * Fase 3 da Preview (integration/preview-deepseek-improve-context):
 * confirma por teste que, mesmo com IAH_AI_DEEPSEEK_ENABLED=true, só
 * docentiah.improve_context é roteada à DeepSeek — todas as outras
 * capabilities (existentes ou ainda não implementadas) continuam no
 * provedor demonstrativo.
 */

const OTHER_CAPABILITIES = [
  "docentiah.generate_slides",
  "docentiah.generate_assessment",
  "docentiah.generate_lesson_plan",
  "docentiah.adapt_material",
  "conexoes_iah.identify_context",
  "conexoes_iah.suggest_connections",
  "conexoes_iah.generate_correlated_lesson",
  "mentor_iah.guide_student",
];

function withEnv(vars, fn) {
  const previous = {};
  for (const key of Object.keys(vars)) previous[key] = process.env[key];
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("com IAH_AI_DEEPSEEK_ENABLED=true, docentiah.improve_context vai para a DeepSeek", () => {
  withEnv({ IAH_AI_DEEPSEEK_ENABLED: "true", DEEPSEEK_API_KEY: "sk-test" }, () => {
    const provider = getLlmProvider("docentiah.improve_context");
    assert.equal(provider.name, "deepseek");
  });
});

for (const capability of OTHER_CAPABILITIES) {
  test(`com IAH_AI_DEEPSEEK_ENABLED=true, ${capability} continua no motor demonstrativo`, () => {
    withEnv({ IAH_AI_DEEPSEEK_ENABLED: "true", DEEPSEEK_API_KEY: "sk-test" }, () => {
      const provider = getLlmProvider(capability);
      assert.equal(provider.name, "IAH Demo Engine");
    });
  });
}

test("com a flag desligada, mesmo docentiah.improve_context volta ao motor demonstrativo", () => {
  withEnv({ IAH_AI_DEEPSEEK_ENABLED: "false" }, () => {
    const provider = getLlmProvider("docentiah.improve_context");
    assert.equal(provider.name, "IAH Demo Engine");
  });
});
