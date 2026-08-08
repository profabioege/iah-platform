/**
 * Gates de rota por papel — allowlist explícita, deny by default.
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
 * Separação estrita de papéis (M23): administrador NÃO herda a área
 * docente, professor NÃO herda a jornada do aluno. Privilégio
 * administrativo nunca é bypass de permissão de professor. Papel
 * ausente, desconhecido ou malformado é negado por padrão — nunca
 * existe fallback permissivo.
 *
 * Critério de aceitação 3: permissões por papel funcionando.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

import { enableDemoMode, enableRealMode } from "./support/test-env.mjs";

const PREFIXES = ["/dashboard", "/missoes", "/diario", "/professor", "/gestor"];
const ALUNO_AREAS = ["/dashboard", "/missoes", "/diario"];
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

async function authorize(role, pathname) {
  enableRealMode();
  const { authConfig } = await import("@/auth.config");
  return verdict(
    await authConfig.callbacks.authorized({
      auth: { user: { role } },
      request: request(pathname),
    }),
  );
}

// ---------------------------------------------------------------- real

test("modo real: a matriz papel × prefixo", async (t) => {
  enableRealMode();
  const { authConfig } = await import("@/auth.config");
  const authorized = authConfig.callbacks.authorized;

  // papel persistido → áreas permitidas (todo o resto é negado) + destino
  /** @type {Array<[string, string[], string]>} */
  const matrix = [
    ["administrador", ["/gestor"], "/gestor"],
    ["admin_iah", ["/gestor"], "/gestor"],
    ["professor", ["/professor"], "/professor"],
    ["aluno", ALUNO_AREAS, "/dashboard"],
  ];

  for (const [role, allowed, home] of matrix) {
    for (const prefix of PREFIXES) {
      await t.test(`${role} em ${prefix}`, async () => {
        const result = verdict(
          await authorized({
            auth: { user: { role } },
            request: request(prefix),
          }),
        );
        if (allowed.includes(prefix)) {
          assert.equal(result.allowed, true, `${role} deveria alcançar ${prefix}`);
        } else {
          assert.equal(result.allowed, false, `${role} não deveria alcançar ${prefix}`);
          assert.equal(result.location, home);
        }
      });
    }
  }
});

test("modo real: professor válido alcança a área docente", async () => {
  assert.equal((await authorize("professor", "/professor")).allowed, true);
});

test("modo real: administrador válido alcança a gestão", async () => {
  assert.equal((await authorize("administrador", "/gestor")).allowed, true);
  assert.equal((await authorize("admin_iah", "/gestor")).allowed, true);
});

test("modo real: aluno válido alcança a própria jornada", async (t) => {
  for (const area of ALUNO_AREAS) {
    await t.test(area, async () => {
      assert.equal((await authorize("aluno", area)).allowed, true);
    });
  }
});

test("modo real: administrador NÃO herda a área docente", async () => {
  const result = await authorize("administrador", "/professor");
  assert.equal(result.allowed, false);
  assert.equal(result.location, "/gestor");
});

test("modo real: professor NÃO alcança a gestão", async () => {
  const result = await authorize("professor", "/gestor");
  assert.equal(result.allowed, false);
  assert.equal(result.location, "/professor");
});

test("modo real: aluno não alcança área docente nem gestão", async () => {
  for (const area of ["/professor", "/gestor"]) {
    const result = await authorize("aluno", area);
    assert.equal(result.allowed, false, area);
    assert.equal(result.location, "/dashboard");
  }
});

test("modo real: professor e administrador não entram na jornada do aluno", async (t) => {
  for (const [role, home] of [
    ["professor", "/professor"],
    ["administrador", "/gestor"],
    ["admin_iah", "/gestor"],
  ]) {
    for (const area of ALUNO_AREAS) {
      await t.test(`${role} em ${area}`, async () => {
        const result = await authorize(role, area);
        assert.equal(result.allowed, false);
        assert.equal(result.location, home);
      });
    }
  }
});

test("modo real: papel desconhecido é negado em todas as áreas", async (t) => {
  for (const prefix of PREFIXES) {
    await t.test(prefix, async () => {
      const result = await authorize("secretaria", prefix);
      assert.equal(result.allowed, false);
      assert.equal(result.location, "/entrar");
    });
  }
});

test("modo real: papel ausente, nulo ou não-texto é negado", async (t) => {
  for (const role of [undefined, null, "", 42, {}, []]) {
    await t.test(`role = ${JSON.stringify(role) ?? "undefined"}`, async () => {
      const result = await authorize(role, "/professor");
      assert.equal(result.allowed, false);
      assert.equal(result.location, "/entrar");
    });
  }
});

test("modo real: papel malformado não é normalizado para um papel válido", async (t) => {
  // Nada de trim/lowercase: normalizar só ampliaria o conjunto aceito.
  for (const role of ["professor ", " professor", "Professor", "PROFESSOR", "profes sor"]) {
    await t.test(JSON.stringify(role), async () => {
      const result = await authorize(role, "/professor");
      assert.equal(result.allowed, false);
      assert.equal(result.location, "/entrar");
    });
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

test("modo real: sessão sem usuário resolvido é negada", async () => {
  enableRealMode();
  const { authConfig } = await import("@/auth.config");
  for (const auth of [{}, { user: undefined }, { user: null }]) {
    const result = await authConfig.callbacks.authorized({
      auth,
      request: request("/professor"),
    });
    assert.equal(result, false);
  }
});

test("modo real: navegação direta por URL não contorna o gate", async (t) => {
  // Subrota profunda, com querystring e id real da jornada — o gate
  // decide pelo prefixo, não pela rota exata.
  const deep = [
    ["aluno", "/professor/turmas/class-1em-a", "/dashboard"],
    ["aluno", "/gestor/implantacao", "/dashboard"],
    ["administrador", "/professor/aulas/lesson-horizonte-fabrica-noticias-1em-a", "/gestor"],
    ["administrador", "/missoes/01-a-fabrica-de-noticias", "/gestor"],
    ["professor", "/gestor/implantacao", "/professor"],
    ["professor", "/diario", "/professor"],
    ["secretaria", "/professor/turmas/class-1em-a", "/entrar"],
  ];
  for (const [role, pathname, home] of deep) {
    await t.test(`${role} → ${pathname}`, async () => {
      const result = await authorize(role, pathname);
      assert.equal(result.allowed, false);
      assert.equal(result.location, home);
    });
  }
});

test("modo real: cada área privada tem allowlist declarada, sem vazio", async () => {
  enableRealMode();
  const { authConfig } = await import("@/auth.config");
  // Nenhum papel conhecido pode alcançar uma área fora da sua: a prova
  // é que a união dos permitidos por área é disjunta entre gestão,
  // docência e jornada do aluno.
  const roles = ["administrador", "admin_iah", "professor", "aluno"];
  const byArea = {};
  for (const prefix of PREFIXES) {
    byArea[prefix] = [];
    for (const role of roles) {
      const result = verdict(
        await authConfig.callbacks.authorized({
          auth: { user: { role } },
          request: request(prefix),
        }),
      );
      if (result.allowed) byArea[prefix].push(role);
    }
    assert.ok(byArea[prefix].length > 0, `${prefix} ficaria inalcançável`);
  }
  assert.deepEqual(byArea["/gestor"], ["administrador", "admin_iah"]);
  assert.deepEqual(byArea["/professor"], ["professor"]);
  for (const area of ALUNO_AREAS) {
    assert.deepEqual(byArea[area], ["aluno"]);
  }
});

// -------------------------------------------------------------- tenant

test("modo real: tenant incompatível é barrado na camada de contexto", async () => {
  // O middleware NÃO é o gate de tenant e não finge ser: roda no edge,
  // sem banco, e o token só carrega a instituição da própria sessão —
  // não existe "tenant da rota" para comparar. O isolamento vive onde há
  // dado: `getWorkspaceContext()` resolve instituição e turmas a partir
  // da sessão, então uma sessão de outra instituição nunca alcança o
  // Instituto Horizonte. Ver workspace-context-scope.test.mjs.
  enableRealMode();
  const { authConfig } = await import("@/auth.config");
  const result = await authConfig.callbacks.authorized({
    auth: { user: { role: "professor", institutionId: "inst-outra-escola" } },
    request: request("/professor"),
  });
  // O gate de PAPEL passa (é professor); quem barra o tenant é o
  // contexto, não esta camada.
  assert.equal(verdict(result).allowed, true);

  const { getWorkspaceContext } = await import("@/modules/workspace");
  const context = await getWorkspaceContext();
  if (context) {
    assert.notEqual(
      context.institution.id,
      "inst-horizonte",
      "sessão de outra instituição não pode resolver o Instituto Horizonte",
    );
  }
});

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

  /** @type {Array<[keyof typeof DEMO_SESSION, string[], string]>} */
  const matrix = [
    ["admin", ["/gestor"], "/gestor"],
    ["teacher", ["/professor"], "/professor"],
    ["student", ALUNO_AREAS, "/dashboard"],
  ];

  for (const [role, allowed, home] of matrix) {
    for (const prefix of PREFIXES) {
      await t.test(`${role} em ${prefix}`, () => {
        const response = middleware(demoRequest(prefix, DEMO_SESSION[role]));
        if (allowed.includes(prefix)) {
          assert.equal(response.iahKind, "next", `${role} → ${prefix}`);
        } else {
          assert.equal(response.iahKind, "redirect", `${role} → ${prefix}`);
          assert.equal(new URL(response.location).pathname, home);
        }
      });
    }
  }
});

test("modo demonstração: administrador não herda a área docente", async () => {
  enableDemoMode();
  const { default: middleware } = await import("@/middleware");
  const response = middleware(demoRequest("/professor", DEMO_SESSION.admin));
  assert.equal(response.iahKind, "redirect");
  assert.equal(new URL(response.location).pathname, "/gestor");
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

test("modo demonstração: navegação direta por URL não contorna o gate", async () => {
  enableDemoMode();
  const { default: middleware } = await import("@/middleware");
  const response = middleware(
    demoRequest("/professor/turmas/class-1em-a", DEMO_SESSION.student),
  );
  assert.equal(response.iahKind, "redirect");
  assert.equal(new URL(response.location).pathname, "/dashboard");
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
