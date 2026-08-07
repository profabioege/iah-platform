/**
 * Stub de `next/headers` — expõe o cookie que o teste colocou em
 * `testEnv.cookies`, no mesmo formato que `cookies()` devolve
 * (`{ name, value }` ou `undefined`).
 */

import { testEnv } from "../test-env.mjs";

export async function cookies() {
  return {
    get(name) {
      const value = testEnv.cookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
    has(name) {
      return testEnv.cookies.has(name);
    },
    getAll() {
      return [...testEnv.cookies].map(([name, value]) => ({ name, value }));
    },
  };
}

export async function headers() {
  return new Headers();
}

export async function draftMode() {
  return { isEnabled: false };
}
