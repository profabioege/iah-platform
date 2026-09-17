import assert from "node:assert/strict";
import test from "node:test";

import { isDocentiahConversationalPlannerEnabled } from "../src/lib/feature-flags.ts";

function withEnv(value, fn) {
  const previous = process.env.NEXT_PUBLIC_FEATURE_DOCENTIAH_CONVERSATIONAL_PLANNER;
  if (value === undefined) delete process.env.NEXT_PUBLIC_FEATURE_DOCENTIAH_CONVERSATIONAL_PLANNER;
  else process.env.NEXT_PUBLIC_FEATURE_DOCENTIAH_CONVERSATIONAL_PLANNER = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_FEATURE_DOCENTIAH_CONVERSATIONAL_PLANNER;
    else process.env.NEXT_PUBLIC_FEATURE_DOCENTIAH_CONVERSATIONAL_PLANNER = previous;
  }
}

// 19. feature flag ligada/desligada
test("flag ausente: desligada (experiência atual permanece)", () => {
  withEnv(undefined, () => assert.equal(isDocentiahConversationalPlannerEnabled(), false));
});

test('flag "false": desligada', () => {
  withEnv("false", () => assert.equal(isDocentiahConversationalPlannerEnabled(), false));
});

test('flag "true": ligada (planejador conversacional exibido)', () => {
  withEnv("true", () => assert.equal(isDocentiahConversationalPlannerEnabled(), true));
});
