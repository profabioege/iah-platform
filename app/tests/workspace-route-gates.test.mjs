/**
 * Gates de rota por papel — 3 papéis × 5 prefixos, nos DOIS modos.
 *
 * Os cinco prefixos são os do `config.matcher` do middleware
 * (`/dashboard`, `/missoes`, `/diario`, `/professor`, `/gestor`) e a
 * decisão é tomada em lugares diferentes conforme o modo:
 *
 *  - modo REAL (o do ambiente demonstrativo): `authConfig.callbacks.
 *    authorized`, com os papéis PERSISTIDOS (`administrador`,
 *    `admin_iah`, `professor`, `aluno`);
 *  - modo DEMONSTRAÇÃO: o corpo do próprio `middleware.ts`, com os
 *    papéis do Workspace resolvidos pelo cookie de sessão.
 *
 * Critério de aceitação 3: permissões por papel funcionando.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

import { enableDemoMode, enableRealMode } from "./support/test-env.mjs";

const PREFIXES = ["/dashboard", "/missoes", "/diario", "/professor", "/gestor"];
const ORIGIN = "http://localhost:3000";

function request(pathname) {
  return { nextUrl: new URL(ORIGIN + pathname), url: ORIGIN + pathname };
}

/** `authorized` devolve `true`/`false` ou uma `Response` de redirecionamento. */
function verdict(result) {
  if (result === true) return { allowed: true, location: null };
  if (result === false) return { allowed: false, location: null };
  return {
    allowed: false,
    location: new URL(result.headers.get("location")).pathname,
  };
}

// ---------------------------------------------------------------- real

test("modo real: a matriz papel × prefixo", async (t) => {
  enableRealMode();
  const { authConfig } = await import("@/auth.config");
  const authorized = authConfig.callbacks.authorized;

  /** @type {Array<[string, Record<string, string|null>]>} */
  const matrix = [
    // papel persistido → destino esperado por prefixo (null = liberado)
    ["administrador", { "/gestor": null }],
    ["admin_iah", { "/gestor": null }],
    ["professor", { "/gestor": "/professor" }],
    ["aluno", { "/gestor": "/dashboard", "/professor": "/dashboard" }],
  ];

  for (const [role, blocked] of matrix) {
    for (const prefix of PREFIXES) {
      await t.test(`${role} em ${prefix}`, async () => {
        const result = await authorized({
          auth: { user: { role } },
          request: request(prefix),
        });
        const { allowed, location } = verdict(result);
        const expected = blocked[prefix] ?? null;
        if (expected === null) {
          assert.equal(allowed, true, `${role} deveria alcançar ${prefix}`);
        } else {
          assert.equal(allowed, false, `${role} não deveria alcançar ${prefix}`);
          assert.equal(location, expected);
        }
      });
    }
  }
});

test("modo real: sem sessão, nenhuma rota privada é liberada", async () => {
  enableRealMode();
  const { authConfig } = await import("@/auth.config");
  for (const prefix of PREFIXES) {
    const result = await authConfig.callbacks.authorized({
      auth: null,
      request: request(prefix),
    });
    assert.equal(result, false, prefix);
  }
});

test("modo real: subrotas herdam o gate do prefixo", async () => {
  enableRealMode();
  const { authConfig } = await import("@/auth.config");
  const result = await authConfig.callbacks.authorized({
    auth: { user: { role: "aluno" } },
    request: request("/professor/turmas/class-1em-a"),
  });
  assert.equal(verdict(result).location, "/dashboard");
});

test(
  "modo real: papel desconhecido não deveria alcançar /professor",
  {
    todo:
      "LACUNA CONHECIDA: o gate de /professor nega apenas role === 'aluno'. " +
      "Um papel persistido fora do vocabulário (ex.: 'secretaria') passa. " +
      "Correção candidata: negar por allowlist ('professor', 'administrador', " +
      "'admin_iah') em vez de denylist. Decisão pendente do Professor Fabio.",
  },
  async () => {
    enableRealMode();
    const { authConfig } = await import("@/auth.config");
    const result = await authConfig.callbacks.authorized({
      auth: { user: { role: "secretaria" } },
      request: request("/professor"),
    });
    assert.equal(verdict(result).allowed, false);
  },
);

// --------------------------------------------------------- demonstração

const DEMO_SESSION = {
  admin: "user-diretor",
  teacher: "user-fabio",
  student: "user-student-horizonte-01",
};

function demoRequest(pathname, userId) {
  return {
    nextUrl: new URL(ORIGIN + pathname),
    url: ORIGIN + pathname,
    cookies: {
      get: (name) => (userId ? { name, value: userId } : undefined),
    },
  };
}

test("modo demonstração: a matriz papel × prefixo", async (t) => {
  enableDemoMode();
  const { default: middleware } = await import("@/middleware");

  /** @type {Array<[keyof typeof DEMO_SESSION, Record<string, string>]>} */
  const matrix = [
    ["admin", {}],
    ["teacher", { "/gestor": "/professor" }],
    ["student", { "/gestor": "/dashboard", "/professor": "/dashboard" }],
  ];

  for (const [role, blocked] of matrix) {
    for (const prefix of PREFIXES) {
      await t.test(`${role} em ${prefix}`, () => {
        const response = middleware(demoRequest(prefix, DEMO_SESSION[role]));
        const expected = blocked[prefix];
        if (!expected) {
          assert.equal(response.iahKind, "next", `${role} → ${prefix}`);
        } else {
          assert.equal(response.iahKind, "redirect");
          assert.equal(new URL(response.location).pathname, expected);
        }
      });
    }
  }
});

test("modo demonstração: sem cookie, toda rota privada vai para /entrar", async () => {
  enableDemoMode();
  const { default: middleware } = await import("@/middleware");
  for (const prefix of PREFIXES) {
    const response = middleware(demoRequest(prefix, null));
    assert.equal(response.iahKind, "redirect", prefix);
    assert.equal(new URL(response.location).pathname, "/entrar");
  }
});

test("modo demonstração: cookie apontando para usuário inexistente é sessão inválida", async () => {
  enableDemoMode();
  const { default: middleware } = await import("@/middleware");
  const response = middleware(demoRequest("/dashboard", "user-fantasma"));
  assert.equal(new URL(response.location).pathname, "/entrar");
});

// ------------------------------------------------------------- matcher

test("o matcher do middleware cobre as cinco áreas privadas", async () => {
  enableDemoMode();
  const { config } = await import("@/middleware");
  assert.deepEqual(
    config.matcher,
    PREFIXES.map((prefix) => `${prefix}/:path*`),
  );
});
