import assert from "node:assert/strict";
import test from "node:test";

import {
  _resetInFlightLocksForTests,
  countTodayUsage,
  hasReachedDailyLimit,
  releaseInFlightLock,
  tryAcquireInFlightLock,
} from "../src/lib/ai/preview-limits.ts";

test.beforeEach(() => {
  _resetInFlightLocksForTests();
});

test("countTodayUsage só conta registros do usuário, capability e dia certos", () => {
  const now = new Date("2026-07-24T18:00:00.000Z");
  const records = [
    { userId: "teacher-a", capability: "docentiah.improve_context", createdAt: "2026-07-24T10:00:00.000Z" },
    { userId: "teacher-a", capability: "docentiah.improve_context", createdAt: "2026-07-24T12:00:00.000Z" },
    { userId: "teacher-a", capability: "docentiah.improve_context", createdAt: "2026-07-23T23:59:00.000Z" }, // dia anterior
    { userId: "teacher-b", capability: "docentiah.improve_context", createdAt: "2026-07-24T11:00:00.000Z" }, // outro professor
    { userId: "teacher-a", capability: "docentiah.generate_slides", createdAt: "2026-07-24T09:00:00.000Z" }, // outra capability
  ];
  assert.equal(countTodayUsage(records, "teacher-a", "docentiah.improve_context", now), 2);
});

test("hasReachedDailyLimit: false com 9 usos, true com 10 (limite padrão)", () => {
  const now = new Date("2026-07-24T18:00:00.000Z");
  const nineRecords = Array.from({ length: 9 }, (_, i) => ({
    userId: "teacher-a",
    capability: "docentiah.improve_context",
    createdAt: `2026-07-24T0${i}:00:00.000Z`,
  }));
  assert.equal(hasReachedDailyLimit(nineRecords, "teacher-a", "docentiah.improve_context", 10, now), false);

  const tenRecords = [...nineRecords, { userId: "teacher-a", capability: "docentiah.improve_context", createdAt: "2026-07-24T09:00:00.000Z" }];
  assert.equal(hasReachedDailyLimit(tenRecords, "teacher-a", "docentiah.improve_context", 10, now), true);
});

test("tryAcquireInFlightLock: segunda tentativa do mesmo usuário falha até liberar", () => {
  assert.equal(tryAcquireInFlightLock("teacher-a"), true);
  assert.equal(tryAcquireInFlightLock("teacher-a"), false); // já em andamento
  assert.equal(tryAcquireInFlightLock("teacher-b"), true); // outro usuário não é afetado
  releaseInFlightLock("teacher-a");
  assert.equal(tryAcquireInFlightLock("teacher-a"), true); // liberado, pode tentar de novo
});
