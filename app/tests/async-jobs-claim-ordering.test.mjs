import assert from "node:assert/strict";
import test from "node:test";

import { createAsyncJob } from "../src/modules/jobs/domain/entities.ts";
import { selectClaimCandidate } from "../src/modules/jobs/domain/claim-ordering.ts";

const NOW = "2026-07-29T00:00:00.000Z";
const FUTURE = "2026-07-29T01:00:00.000Z";

function job(overrides = {}) {
  return createAsyncJob(
    {
      id: overrides.id ?? "job-1",
      institutionId: overrides.institutionId ?? "inst-1",
      capability: overrides.capability ?? "docentiah.compose_mission",
      idempotencyKey: overrides.idempotencyKey ?? `idem-${overrides.id ?? "job-1"}`,
      input: {},
      priority: overrides.priority,
      maxAttempts: overrides.maxAttempts,
    },
    NOW,
  );
}

test("claim: nenhum job elegível retorna null", () => {
  const result = selectClaimCandidate([], {
    capabilities: ["docentiah.compose_mission"],
    now: NOW,
  });
  assert.equal(result, null);
});

test("claim respeita priority — o de maior prioridade (menor número) vence", () => {
  const low = job({ id: "low", priority: 200 });
  const high = job({ id: "high", priority: 10 });
  const result = selectClaimCandidate([low, high], {
    capabilities: ["docentiah.compose_mission"],
    now: NOW,
  });
  assert.equal(result.id, "high");
});

test("claim respeita availableAt — job ainda não disponível é ignorado", () => {
  const notYet = { ...job({ id: "not-yet" }), availableAt: FUTURE };
  const ready = job({ id: "ready" });
  const result = selectClaimCandidate([notYet, ready], {
    capabilities: ["docentiah.compose_mission"],
    now: NOW,
  });
  assert.equal(result.id, "ready");
});

test("claim respeita capability — worker não recebe capability que não aceita", () => {
  const other = job({ id: "other", capability: "conexoes_iah.identify_context" });
  const result = selectClaimCandidate([other], {
    capabilities: ["docentiah.compose_mission"],
    now: NOW,
  });
  assert.equal(result, null);
});

test("claim ignora job que já esgotou attempts (attempts >= maxAttempts)", () => {
  const exhausted = { ...job({ id: "exhausted", maxAttempts: 3 }), attempts: 3 };
  const result = selectClaimCandidate([exhausted], {
    capabilities: ["docentiah.compose_mission"],
    now: NOW,
  });
  assert.equal(result, null);
});

test("claim ignora job em estado terminal ou já em processamento", () => {
  const succeeded = { ...job({ id: "succeeded" }), status: "succeeded" };
  const processing = { ...job({ id: "processing" }), status: "processing" };
  const result = selectClaimCandidate([succeeded, processing], {
    capabilities: ["docentiah.compose_mission"],
    now: NOW,
  });
  assert.equal(result, null);
});

test("claim: job já reivindicado deixa de ser candidato na próxima chamada", () => {
  // Nível verificável sem banco real: a regra de elegibilidade, não a
  // exclusão mútua sob concorrência real (SKIP LOCKED não é exercitado
  // aqui — ver relatório final).
  const target = job({ id: "target" });
  const query = { capabilities: ["docentiah.compose_mission"], now: NOW };

  const firstClaim = selectClaimCandidate([target], query);
  assert.equal(firstClaim.id, "target");

  const afterClaim = { ...target, status: "processing" };
  const secondClaim = selectClaimCandidate([afterClaim], query);
  assert.equal(secondClaim, null);
});

test("claim preserva institutionId do job retornado (fidelidade de mapeamento)", () => {
  const target = job({ id: "target", institutionId: "inst-xyz" });
  const result = selectClaimCandidate([target], {
    capabilities: ["docentiah.compose_mission"],
    now: NOW,
  });
  assert.equal(result.institutionId, "inst-xyz");
});
