import assert from "node:assert/strict";
import test from "node:test";

import { getLlmProvider } from "../src/lib/ai/llm-provider-factory.ts";
import {
  buildDeepSeekRequestBody,
  createDeepSeekProvider,
  InvalidDeepSeekRequestError,
  validateDeepSeekRequestBody,
} from "../src/lib/ai/providers/deepseek-provider.ts";
import { ProviderConfigError } from "../src/lib/ai/provider-config-error.ts";
import { docentiahImproveContextV3 } from "../src/lib/ai/prompts/docentiah/improve-context/v3.ts";

const CAPABILITY = "docentiah.improve_context";
const sampleRequest = { capability: CAPABILITY, systemInstructions: "sys", userPrompt: "user" };

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

function withFetch(mock, fn) {
  const original = global.fetch;
  global.fetch = mock;
  try {
    return fn();
  } finally {
    global.fetch = original;
  }
}

// 1. modelo padrão é deepseek-v4-flash
test("modelo padrão (sem DEEPSEEK_MODEL) é deepseek-v4-flash", () => {
  withEnv({ IAH_AI_DEEPSEEK_ENABLED: "true", DEEPSEEK_API_KEY: "sk-test", DEEPSEEK_MODEL: "" }, () => {
    const provider = getLlmProvider(CAPABILITY);
    assert.equal(provider.model, "deepseek-v4-flash");
  });
});

// 2. DEEPSEEK_MODEL sobrescreve o padrão
test("DEEPSEEK_MODEL sobrescreve o padrão quando definido para um modelo atual", () => {
  withEnv({ IAH_AI_DEEPSEEK_ENABLED: "true", DEEPSEEK_API_KEY: "sk-test", DEEPSEEK_MODEL: "deepseek-v4-pro" }, () => {
    const provider = getLlmProvider(CAPABILITY);
    assert.equal(provider.model, "deepseek-v4-pro");
  });
});

// 3. deepseek-chat é rejeitado (legado)
test("deepseek-chat (legado) é rejeitado localmente, sem chegar a chamar fetch", async () => {
  let fetchCalled = false;
  await withFetch(
    async () => {
      fetchCalled = true;
      return new Response("", { status: 200 });
    },
    async () => {
      const provider = createDeepSeekProvider({ apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-chat" });
      await assert.rejects(() => provider.complete(sampleRequest), InvalidDeepSeekRequestError);
      assert.equal(fetchCalled, false);
    },
  );
});

test("deepseek-reasoner (legado) também é rejeitado localmente", () => {
  assert.throws(
    () => validateDeepSeekRequestBody(buildDeepSeekRequestBody(sampleRequest, "deepseek-reasoner")),
    InvalidDeepSeekRequestError,
  );
});

// 4. payload mínimo válido
test("buildDeepSeekRequestBody produz o contrato mínimo exato, sem campos extras", () => {
  const body = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  assert.deepEqual(Object.keys(body).sort(), ["max_tokens", "messages", "model", "response_format", "stream", "thinking"].sort());
  assert.equal(body.model, "deepseek-v4-flash");
  assert.equal(body.messages.length, 2);
  assert.equal(body.messages[0].role, "system");
  assert.equal(body.messages[1].role, "user");
  assert.equal(body.stream, false);
  assert.doesNotThrow(() => validateDeepSeekRequestBody(body));
});

test("payload mínimo não inclui temperature nem outros parâmetros não pedidos", () => {
  const body = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  assert.equal("temperature" in body, false);
  assert.equal("tools" in body, false);
  assert.equal("tool_choice" in body, false);
  assert.equal("stop" in body, false);
  assert.equal("reasoning_effort" in body, false);
});

// 5. nenhum campo undefined
test("validateDeepSeekRequestBody rejeita qualquer campo undefined", () => {
  const body = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  body.max_tokens = undefined;
  assert.throws(() => validateDeepSeekRequestBody(body), InvalidDeepSeekRequestError);
});

test("validateDeepSeekRequestBody rejeita propriedade que não faz parte do contrato mínimo", () => {
  const body = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  body.institutionId = "inst-a"; // nunca deveria vazar para o payload externo
  assert.throws(() => validateDeepSeekRequestBody(body), InvalidDeepSeekRequestError);
});

// 6. prompt contém instrução explícita de JSON
test("prompt v3 instrui explicitamente responder só com JSON válido", () => {
  const instructions = docentiahImproveContextV3.systemInstructions.toLowerCase();
  assert.ok(instructions.includes("json"));
  assert.ok(instructions.includes("somente com um json válido") || instructions.includes("só com um json válido"));
});

// 7. prompt contém exemplo de JSON
test("prompt v3 contém o exemplo estrutural com os 3 campos exatos", () => {
  const instructions = docentiahImproveContextV3.systemInstructions;
  assert.ok(instructions.includes('"improvedText"'));
  assert.ok(instructions.includes('"changesSummary"'));
  assert.ok(instructions.includes('"warnings"'));
});

// 8. response_format correto
test("validateDeepSeekRequestBody rejeita response_format diferente de json_object", () => {
  const body = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  body.response_format = { type: "text" };
  assert.throws(() => validateDeepSeekRequestBody(body), InvalidDeepSeekRequestError);
});

// 9. max_tokens configurado
test("max_tokens é 800 por padrão, configurável, sempre inteiro positivo", () => {
  const body = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  assert.equal(body.max_tokens, 800);
  const custom = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash", 500);
  assert.equal(custom.max_tokens, 500);

  const invalid = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  invalid.max_tokens = -1;
  assert.throws(() => validateDeepSeekRequestBody(invalid), InvalidDeepSeekRequestError);
  invalid.max_tokens = 12.5;
  assert.throws(() => validateDeepSeekRequestBody(invalid), InvalidDeepSeekRequestError);
});

// 10. thinking ausente ou disabled conforme decisão documentada
test('payload sempre envia thinking:{type:"disabled"} explicitamente (decisão documentada — não omitido)', () => {
  const body = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  assert.deepEqual(body.thinking, { type: "disabled" });
});

// Etapa 5 / itens 11-13: erro 400 simulado — modelo, response_format, parâmetro desconhecido
test("HTTP 400 com param 'model' vira ProviderConfigError com providerDetails.param='model'", async () => {
  const provider = createDeepSeekProvider({ apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash" });
  await withFetch(
    async () =>
      new Response(JSON.stringify({ error: { type: "invalid_request_error", param: "model", code: "model_not_found" } }), {
        status: 400,
      }),
    async () => {
      await assert.rejects(
        () => provider.complete(sampleRequest),
        (error) => {
          assert.ok(error instanceof ProviderConfigError);
          assert.equal(error.httpStatus, 400);
          assert.equal(error.providerDetails?.param, "model");
          assert.equal(error.providerDetails?.code, "model_not_found");
          return true;
        },
      );
    },
  );
});

test("HTTP 400 com param 'response_format' é capturado com o mesmo tratamento sanitizado", async () => {
  const provider = createDeepSeekProvider({ apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash" });
  await withFetch(
    async () =>
      new Response(JSON.stringify({ error: { type: "invalid_request_error", param: "response_format", code: "invalid_value" } }), {
        status: 400,
      }),
    async () => {
      await assert.rejects(
        () => provider.complete(sampleRequest),
        (error) => {
          assert.ok(error instanceof ProviderConfigError);
          assert.equal(error.providerDetails?.param, "response_format");
          return true;
        },
      );
    },
  );
});

test("HTTP 400 com parâmetro desconhecido ainda é classificado como invalid_request, sem quebrar", async () => {
  const provider = createDeepSeekProvider({ apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash" });
  await withFetch(
    async () =>
      new Response(JSON.stringify({ error: { type: "invalid_request_error", param: "algum_parametro_novo", code: "unrecognized_param" } }), {
        status: 400,
      }),
    async () => {
      await assert.rejects(
        () => provider.complete(sampleRequest),
        (error) => {
          assert.ok(error instanceof ProviderConfigError);
          assert.equal(error.code, "invalid_request");
          assert.equal(error.providerDetails?.param, "algum_parametro_novo");
          return true;
        },
      );
    },
  );
});

// Etapa 5: messages inválidas / max_tokens inválido — validação local
test("messages vazio é rejeitado localmente antes do envio", () => {
  const body = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  body.messages = [];
  assert.throws(() => validateDeepSeekRequestBody(body), InvalidDeepSeekRequestError);
});

test("message com content que não é string é rejeitado localmente", () => {
  const body = buildDeepSeekRequestBody(sampleRequest, "deepseek-v4-flash");
  body.messages[0].content = 123;
  assert.throws(() => validateDeepSeekRequestBody(body), InvalidDeepSeekRequestError);
});

// 14. logs sanitizados
test("providerDetails do erro 400 nunca inclui a mensagem livre do provedor, só type/param/code curtos", async () => {
  const mensagemComTextoLivre = "A" .repeat(500); // texto livre longo, nunca deveria vazar inteiro
  const provider = createDeepSeekProvider({ apiKey: "sk-test", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash" });
  await withFetch(
    async () =>
      new Response(
        JSON.stringify({ error: { type: "invalid_request_error", param: "model", code: "model_not_found", message: mensagemComTextoLivre } }),
        { status: 400 },
      ),
    async () => {
      await assert.rejects(
        () => provider.complete(sampleRequest),
        (error) => {
          assert.ok(!("message" in (error.providerDetails ?? {})));
          assert.ok(error.message.length < mensagemComTextoLivre.length);
          return true;
        },
      );
    },
  );
});

// 15. nenhuma regressão no DataAnonymizer — smoke test; cobertura completa em data-anonymizer.test.mjs
test("DataAnonymizer segue funcionando normalmente após as mudanças de payload/prompt (smoke test)", async () => {
  const { dataAnonymizer } = await import("../src/lib/ai/data-anonymizer.ts");
  const result = dataAnonymizer.analyze("Quero relacionar as ideias de Karl Marx às transformações do trabalho.");
  assert.equal(result.safeToSend, true);
  assert.equal(result.sanitizedText, "Quero relacionar as ideias de Karl Marx às transformações do trabalho.");
});
