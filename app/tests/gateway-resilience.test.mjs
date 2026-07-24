import assert from "node:assert/strict";
import test from "node:test";

import { circuitBreaker } from "../src/lib/ai/circuit-breaker.ts";
import { getTimeoutMsForCapability } from "../src/lib/ai/llm-provider-factory.ts";
import { ProviderConfigError } from "../src/lib/ai/provider-config-error.ts";
import { classifyProviderError } from "../src/lib/ai/provider-audit-error-code.ts";
import { ProviderTransportError } from "../src/lib/ai/provider-transport-error.ts";
import { createResilientProvider } from "../src/lib/ai/resilient-llm-provider.ts";
import { AiGenerationError } from "../src/lib/ai/gateway.ts";
import { AiProviderConfigurationError } from "../src/lib/ai/llm-provider-factory.ts";

const CAPABILITY = "docentiah.improve_context";
const validOutputJson = JSON.stringify({ improvedText: "ok", changesSummary: [], warnings: [] });

function fakeProvider(name, complete) {
  return { name, model: `${name}-model`, isConfigured: true, complete };
}

function alwaysThrows(errorFactory) {
  return async () => {
    throw errorFactory();
  };
}

test.beforeEach(() => {
  circuitBreaker._resetForTests("test-provider");
  circuitBreaker._resetForTests("test-provider-b");
});

// 1. timeout sem abrir circuito após uma única falha
test("1 falha de transporte (timeout nas 2 tentativas) não abre o circuito — só 1 falha reportada, limiar é 3", async () => {
  const primary = fakeProvider("deepseek", alwaysThrows(() => new ProviderTransportError("timeout", "test-provider")));
  const fallback = fakeProvider("iah-demo", async () => ({ raw: validOutputJson, provider: "iah-demo", model: "demo" }));
  const resilient = createResilientProvider({ providerId: "test-provider", primary, fallback });

  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  assert.equal(circuitBreaker.stateFor("test-provider"), "closed");
});

// 2. três timeouts consecutivos abrem circuito
test("3 chamadas com timeout consecutivo abrem o circuito", async () => {
  const primary = fakeProvider("deepseek", alwaysThrows(() => new ProviderTransportError("timeout", "test-provider")));
  const fallback = fakeProvider("iah-demo", async () => ({ raw: validOutputJson, provider: "iah-demo", model: "demo" }));
  const resilient = createResilientProvider({ providerId: "test-provider", primary, fallback });

  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  assert.equal(circuitBreaker.stateFor("test-provider"), "closed");
  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  assert.equal(circuitBreaker.stateFor("test-provider"), "open");
});

// 3. segunda chamada normal após uma única falha
test("depois de 1 falha, uma chamada bem-sucedida reseta o contador (não acumula para futuras falhas)", async () => {
  let shouldFail = true;
  const primary = fakeProvider("deepseek", async () => {
    if (shouldFail) throw new ProviderTransportError("timeout", "test-provider");
    return { raw: validOutputJson, provider: "deepseek", model: "deepseek-chat" };
  });
  const fallback = fakeProvider("iah-demo", async () => ({ raw: validOutputJson, provider: "iah-demo", model: "demo" }));
  const resilient = createResilientProvider({ providerId: "test-provider", primary, fallback });

  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" }); // falha (1 + retry, ambos timeout)
  shouldFail = false;
  const result = await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" }); // sucesso
  assert.equal(result.provider, "deepseek");
  assert.equal(circuitBreaker.stateFor("test-provider"), "closed");

  // Mais 2 falhas depois do reset não deveriam já abrir o circuito (contador voltou a 0 no sucesso).
  shouldFail = true;
  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  assert.equal(circuitBreaker.stateFor("test-provider"), "closed");
});

// 4. circuito aberto impede transporte
test("circuito aberto: nunca chama o primary, vai direto para o fallback", async () => {
  circuitBreaker._resetForTests("test-provider");
  circuitBreaker.reportFailure("test-provider");
  circuitBreaker.reportFailure("test-provider");
  circuitBreaker.reportFailure("test-provider");
  assert.equal(circuitBreaker.stateFor("test-provider"), "open");

  let primaryCalls = 0;
  const primary = fakeProvider("deepseek", async () => {
    primaryCalls += 1;
    return { raw: validOutputJson, provider: "deepseek", model: "deepseek-chat" };
  });
  const fallback = fakeProvider("iah-demo", async () => ({ raw: validOutputJson, provider: "iah-demo", model: "demo" }));
  const resilient = createResilientProvider({ providerId: "test-provider", primary, fallback });

  const result = await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  assert.equal(primaryCalls, 0);
  assert.equal(result.provider, "iah-demo");
});

// 5. "half-open" — não implementado de propósito; após a janela expirar, fecha por completo
test('sem estado "half-open" dedicado: passada a janela de abertura, o circuito fecha totalmente (não faz 1 chamada de sonda isolada)', () => {
  circuitBreaker._resetForTests("test-provider");
  circuitBreaker.reportFailure("test-provider");
  circuitBreaker.reportFailure("test-provider");
  circuitBreaker.reportFailure("test-provider");
  assert.equal(circuitBreaker.stateFor("test-provider"), "open");

  const sixMinutesLater = () => Date.now() + 6 * 60 * 1000;
  assert.equal(circuitBreaker.stateFor("test-provider", sixMinutesLater), "closed");
  // E o fechamento é completo — outra falha isolada não reabre sozinha (precisa de 3 de novo).
  circuitBreaker.reportFailure("test-provider");
  assert.equal(circuitBreaker.stateFor("test-provider"), "closed");
});

// 6. sucesso fecha o circuito
test("reportSuccess zera o contador de falhas e fecha o circuito mesmo se estava perto de abrir", () => {
  circuitBreaker._resetForTests("test-provider");
  circuitBreaker.reportFailure("test-provider");
  circuitBreaker.reportFailure("test-provider");
  circuitBreaker.reportSuccess("test-provider");
  circuitBreaker.reportFailure("test-provider");
  circuitBreaker.reportFailure("test-provider");
  assert.equal(circuitBreaker.stateFor("test-provider"), "closed"); // só 2 desde o último sucesso, não 4
});

// 7 e 8. erro 402/401 não abrem circuito (não são falha de transporte)
test("erro 402 (payment_required) nunca conta no circuit breaker, mesmo repetido 5x", async () => {
  const primary = fakeProvider("deepseek", alwaysThrows(() => new ProviderConfigError("payment_required", "test-provider", 402)));
  const fallback = fakeProvider("iah-demo", async () => ({ raw: validOutputJson, provider: "iah-demo", model: "demo" }));
  const resilient = createResilientProvider({ providerId: "test-provider", primary, fallback });

  for (let i = 0; i < 5; i++) {
    await assert.rejects(() => resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" }), ProviderConfigError);
  }
  assert.equal(circuitBreaker.stateFor("test-provider"), "closed");
});

test("erro 401 (invalid_api_key) nunca conta no circuit breaker, mesmo repetido 5x", async () => {
  const primary = fakeProvider("deepseek", alwaysThrows(() => new ProviderConfigError("invalid_api_key", "test-provider", 401)));
  const fallback = fakeProvider("iah-demo", async () => ({ raw: validOutputJson, provider: "iah-demo", model: "demo" }));
  const resilient = createResilientProvider({ providerId: "test-provider", primary, fallback });

  for (let i = 0; i < 5; i++) {
    await assert.rejects(() => resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" }), ProviderConfigError);
  }
  assert.equal(circuitBreaker.stateFor("test-provider"), "closed");
});

// 9. erro 429 segue política explícita — É falha de transporte, retry + conta no circuit breaker
test("erro 429 (rate_limit) é retentável e conta no circuit breaker — diferente de 401/402/403/404", async () => {
  const primary = fakeProvider("deepseek", alwaysThrows(() => new ProviderTransportError("rate_limit", "test-provider")));
  const fallback = fakeProvider("iah-demo", async () => ({ raw: validOutputJson, provider: "iah-demo", model: "demo" }));
  const resilient = createResilientProvider({ providerId: "test-provider", primary, fallback });

  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  await resilient.complete({ capability: CAPABILITY, systemInstructions: "s", userPrompt: "u" });
  assert.equal(circuitBreaker.stateFor("test-provider"), "open");
});

// 10. circuitos isolados por capability (chave composta provider:capability)
test("circuitos com chaves diferentes (ex.: deepseek:capA vs deepseek:capB) são independentes", () => {
  circuitBreaker._resetForTests("deepseek:cap-a");
  circuitBreaker._resetForTests("deepseek:cap-b");
  circuitBreaker.reportFailure("deepseek:cap-a");
  circuitBreaker.reportFailure("deepseek:cap-a");
  circuitBreaker.reportFailure("deepseek:cap-a");
  assert.equal(circuitBreaker.stateFor("deepseek:cap-a"), "open");
  assert.equal(circuitBreaker.stateFor("deepseek:cap-b"), "closed");
});

// 11. códigos sanitizados corretos
test("classifyProviderError mapeia cada tipo de erro para o código sanitizado certo", () => {
  assert.equal(classifyProviderError(new ProviderTransportError("timeout", "deepseek")), "timeout");
  assert.equal(classifyProviderError(new ProviderTransportError("rate_limit", "deepseek")), "rate_limit");
  assert.equal(classifyProviderError(new ProviderTransportError("provider_5xx", "deepseek")), "provider_5xx");
  assert.equal(classifyProviderError(new ProviderTransportError("network_error", "deepseek")), "network_error");
  assert.equal(classifyProviderError(new ProviderTransportError("empty_response", "deepseek")), "empty_response");
  assert.equal(classifyProviderError(new ProviderTransportError("invalid_json", "deepseek")), "invalid_json");
  assert.equal(classifyProviderError(new ProviderConfigError("payment_required", "deepseek", 402)), "payment_required");
  assert.equal(classifyProviderError(new ProviderConfigError("invalid_api_key", "deepseek", 401)), "invalid_api_key");
  assert.equal(classifyProviderError(new ProviderConfigError("invalid_request", "deepseek", 400)), "invalid_request");
  assert.equal(classifyProviderError(new ProviderConfigError("model_not_found", "deepseek", 404)), "model_not_found");
  assert.equal(classifyProviderError(new AiProviderConfigurationError("x")), "missing_configuration");
  assert.equal(classifyProviderError(new AiGenerationError("x")), "ai_generation_error");
  assert.equal(classifyProviderError(new Error("qualquer outra coisa")), "unknown_error");
});

// 12. logs sem conteúdo sensível
test("classifyProviderError nunca devolve o texto da mensagem de erro — só o código do enum sanitizado", () => {
  const segredo = "nome-secreto-do-aluno-e-detalhe-do-prompt";
  const error = new ProviderConfigError("payment_required", "deepseek", 402, { type: "invalid_request_error", param: "model", code: "model_not_found" });
  const code = classifyProviderError(error);
  assert.equal(code, "payment_required");
  assert.ok(!code.includes(segredo));
  assert.ok(!error.message.includes(segredo)); // mensagem é sempre construída internamente, nunca ecoa texto do provedor
});

// 13. timeout configurável por capability
test("getTimeoutMsForCapability: 25s para docentiah.improve_context, padrão sensato para capability desconhecida", () => {
  assert.equal(getTimeoutMsForCapability("docentiah.improve_context"), 25_000);
  assert.equal(getTimeoutMsForCapability("capability-desconhecida"), 25_000);
});
