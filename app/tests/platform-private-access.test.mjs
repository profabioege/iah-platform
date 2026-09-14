/**
 * Defesa em profundidade das telas privadas — correções P1-A e P1-B.
 *
 * P1-A: a identidade do usuário resolvia pelo cookie do Workspace mesmo
 * quando a instância estava INDISPONÍVEL — um cookie remanescente de
 * demonstração dava identidade de professor semeado numa instalação
 * comercial mal configurada.
 *
 * P1-B: cinco telas privadas decidiam a fonte de dados por um binário
 * (`isAuthConfigured() ? real : seed`), que confunde "demonstração" com
 * "indisponível"; no estado indisponível serviriam seeds, barradas
 * apenas pelo middleware.
 *
 * Limitação técnica registrada: o runner não compila JSX (`.tsx` não é
 * importável aqui), então os cinco Server Components não são renderizados
 * diretamente. Os testes exercitam o ÚNICO ponto de decisão pelo qual as
 * cinco telas e o layout passam agora, e verificam estruturalmente que
 * nenhuma delas mantém a decisão binária.
 *
 * Nada aqui toca rede, Supabase ou autenticação real: `testEnv.db` e
 * `testEnv.repositories` ficam sem configurar de propósito — qualquer
 * acesso a repositório falharia alto.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resetTestEnv, testEnv } from "./support/test-env.mjs";

const PAGINAS_PRIVADAS = [
  "app/(platform)/dashboard/page.tsx",
  "app/(platform)/diario/page.tsx",
  "app/(platform)/missoes/[id]/page.tsx",
  "app/(platform)/professor/aulas/page.tsx",
  "app/(platform)/professor/estudio/page.tsx",
];

const fonte = (rel) =>
  readFileSync(new URL(`../src/${rel}`, import.meta.url), "utf8");

/**
 * Mesma fonte, sem comentários — asserções sobre o que o arquivo FAZ,
 * não sobre o que ele explica. (Os comentários destes arquivos citam,
 * de propósito, o que não deve ser usado.)
 */
const codigo = (rel) =>
  fonte(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

function modo(valor, extras = {}) {
  for (const v of [
    "IAH_AUTH_MODE",
    "AUTH_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    delete process.env[v];
  }
  if (valor) process.env.IAH_AUTH_MODE = valor;
  for (const [k, v] of Object.entries(extras)) process.env[k] = v;
}

const SUPABASE_COMPLETO = {
  AUTH_SECRET: "secret-ficticio-de-teste",
  NEXT_PUBLIC_SUPABASE_URL: "https://ficticio.supabase.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-ficticia-de-teste",
};

/** Captura o destino de um `redirect()` (o stub lança com digest). */
function destinoDoRedirect(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    const digest = String(error?.digest ?? "");
    if (digest.startsWith("NEXT_REDIRECT;")) return digest.split(";")[1];
    throw error;
  }
}

// ============================================================ P1-B
test("P1-B: modo demo libera a tela e seleciona seed", async () => {
  modo("demo");
  const { requirePlatformDataMode } = await import("@/lib/platform-access");
  assert.equal(requirePlatformDataMode(), "demo");
});

test("P1-B: modo supabase completo seleciona repositório real", async () => {
  modo("supabase", SUPABASE_COMPLETO);
  const { requirePlatformDataMode } = await import("@/lib/platform-access");
  assert.equal(requirePlatformDataMode(), "supabase");
});

test("P1-B: estado indisponível interrompe a tela antes de qualquer repositório", async () => {
  const { requirePlatformDataMode } = await import("@/lib/platform-access");

  const casos = [
    ["modo ausente", null, {}],
    ["valor inválido", "producao", {}],
    ["supabase parcial", "supabase", { AUTH_SECRET: "secret-ficticio" }],
  ];

  for (const [nome, valor, extras] of casos) {
    resetTestEnv(); // repositories e db ficam nulos de propósito
    modo(valor, extras);

    const destino = destinoDoRedirect(() => requirePlatformDataMode());
    assert.equal(destino, "/entrar", `${nome}: deve abandonar a tela`);
    assert.equal(
      testEnv.repositories,
      null,
      `${nome}: nenhum repositório pode ter sido consultado`,
    );
    assert.equal(testEnv.db, null, `${nome}: nenhum cliente de banco`);
  }
});

test("P1-B: nenhuma das cinco telas mantém a decisão binária", () => {
  for (const pagina of PAGINAS_PRIVADAS) {
    const src = fonte(pagina);
    assert.equal(
      src.includes("isAuthConfigured"),
      false,
      `${pagina} não pode mais decidir por isAuthConfigured()`,
    );
    assert.match(
      src,
      /requirePlatformDataMode\(\)/,
      `${pagina} passa pela porta central dos três estados`,
    );
    assert.match(
      src,
      /=== "supabase"/,
      `${pagina} só usa repositório real quando o modo é supabase`,
    );
    assert.equal(
      src.includes("catch"),
      false,
      `${pagina} não pode ter captura de erro que caia para seed`,
    );
  }
});

test("P1-B: o layout privado também se protege, não só o middleware", () => {
  const layout = fonte("app/(platform)/layout.tsx");
  assert.match(layout, /requirePlatformDataMode\(\);/);
});

test("P1-B: a porta de acesso não vaza configuração ao usuário", () => {
  const helper = codigo("lib/platform-access.ts");
  for (const variavel of [
    "AUTH_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]) {
    assert.equal(
      helper.includes(`"${variavel}"`),
      false,
      `a porta não manipula ${variavel}`,
    );
  }
  assert.equal(
    helper.trimStart().startsWith('"use client"'),
    false,
    "a porta é server-side; nunca vai para o bundle do cliente",
  );
});

// ============================================================ P1-A
test("P1-A: cookie de demonstração só vale no modo demo declarado", async () => {
  const ws = await import("@/modules/workspace");
  const seed = await import("@/modules/workspace/seeds/institution-seed");
  const professor = seed.findWorkspaceUserByEmail(seed.WORKSPACE_TEACHER.email);
  assert.ok(professor, "o seed precisa ter o professor fictício");

  // Referência: no modo demo o cookie resolve normalmente.
  resetTestEnv();
  modo("demo");
  testEnv.cookies.set("iah_workspace_session", professor.id);
  const emDemo = await ws.getWorkspaceUser();
  assert.ok(emDemo, "modo demo aceita o cookie do Workspace");
  assert.equal(emDemo.role, "teacher");

  // O que o P1-A corrige: o MESMO cookie não vale fora do modo demo.
  for (const [nome, valor, extras] of [
    ["modo ausente", null, {}],
    ["valor inválido", "producao", {}],
    ["supabase parcial", "supabase", { AUTH_SECRET: "secret-ficticio" }],
  ]) {
    modo(valor, extras);
    assert.equal(
      await ws.getWorkspaceUser(),
      null,
      `${nome}: cookie de demonstração não pode virar sessão`,
    );
    assert.equal(
      await ws.getWorkspaceContext(),
      null,
      `${nome}: nenhum contexto pedagógico fictício`,
    );
  }
  resetTestEnv();
});

test("P1-A: identificador fictício não abre o modo supabase", async () => {
  const ws = await import("@/modules/workspace");
  const seed = await import("@/modules/workspace/seeds/institution-seed");
  const professor = seed.findWorkspaceUserByEmail(seed.WORKSPACE_TEACHER.email);

  resetTestEnv();
  modo("supabase", SUPABASE_COMPLETO);
  testEnv.cookies.set("iah_workspace_session", professor.id);
  testEnv.session = null; // nenhuma sessão Auth.js

  assert.equal(
    await ws.getWorkspaceUser(),
    null,
    "no modo real o cookie do Workspace é irrelevante: vale a sessão Auth.js",
  );
  resetTestEnv();
});

// ================================================== invariantes gerais
test("o espelho público não autoriza ninguém nem escolhe provider", async () => {
  const flags = fonte("lib/auth-flags.ts");

  // O espelho existe só para a UI escolher fonte de dados.
  assert.match(flags, /export function isRealModeClient/);

  const decisores = [
    "middleware.ts",
    "auth.ts",
    "auth.config.ts",
    "lib/platform-access.ts",
    "app/entrar/page.tsx",
    "modules/workspace/infrastructure/session.ts",
  ];
  for (const arquivo of decisores) {
    const src = codigo(arquivo);
    assert.equal(
      src.includes("isRealModeClient"),
      false,
      `${arquivo} não pode decidir autenticação pelo espelho público`,
    );
    assert.equal(
      src.includes("NEXT_PUBLIC_IAH_REAL_MODE"),
      false,
      `${arquivo} não pode ler a variável pública`,
    );
  }

  modo("demo");
  process.env.NEXT_PUBLIC_IAH_REAL_MODE = "true"; // espelho mentindo
  const { getAuthMode } = await import("@/lib/auth-flags");
  assert.equal(
    getAuthMode(),
    "demo",
    "o espelho público não altera o modo resolvido no servidor",
  );
  delete process.env.NEXT_PUBLIC_IAH_REAL_MODE;
  resetTestEnv();
});

// ===================================== ordem de execução (adversarial)
test("P1-B: a recusa vem ANTES de seed, sessão ou repositório", () => {
  // Regressão real encontrada na revisão adversarial: as telas liam
  // `localMissionRepository` e o contexto do Workspace antes de decidir,
  // ou seja, consultavam seed no estado indisponível para só então
  // recusar. O guard precisa vir primeiro no corpo.
  const CONSULTAS = [
    "localMissionRepository.",
    "getWorkspaceContext()",
    "getWorkspaceUser()",
    "getDefaultRepositories()",
    "await auth()",
  ];

  for (const pagina of PAGINAS_PRIVADAS) {
    const src = codigo(pagina);
    const posGuard = src.indexOf("requirePlatformDataMode()");
    assert.ok(posGuard >= 0, `${pagina} precisa passar pela porta`);

    for (const consulta of CONSULTAS) {
      const pos = src.indexOf(consulta);
      if (pos < 0) continue;
      assert.ok(
        posGuard < pos,
        `${pagina}: "${consulta}" não pode ser consultado antes da recusa`,
      );
    }
  }
});

test("P1-B: proteção de regressão — a porta é o único seletor privado", () => {
  for (const pagina of [...PAGINAS_PRIVADAS, "app/(platform)/layout.tsx"]) {
    const src = codigo(pagina);
    assert.equal(
      /isAuthConfigured|isRealModeClient|isDemoMode\(/.test(src),
      false,
      `${pagina} só pode decidir pela porta central`,
    );
  }
});

// ============================================ auth.config.ts (fronteira)
test("authorized() nega fora do modo supabase, em vez de liberar", async () => {
  const { authConfig } = await import("@/auth.config");
  const autorizado = authConfig.callbacks.authorized;
  const requisicao = (rota) => ({
    nextUrl: new URL(`http://localhost:3000${rota}`),
    url: `http://localhost:3000${rota}`,
  });

  for (const [nome, valor, extras] of [
    ["demo", "demo", {}],
    ["modo ausente", null, {}],
    ["valor inválido", "producao", {}],
    ["supabase parcial", "supabase", { AUTH_SECRET: "secret-ficticio" }],
  ]) {
    modo(valor, extras);
    for (const rota of ["/gestor", "/professor", "/dashboard"]) {
      const veredito = await autorizado({
        auth: { user: { role: "administrador" } },
        request: requisicao(rota),
      });
      assert.equal(
        veredito,
        false,
        `${nome}: a porta de autorização não pode liberar ${rota}`,
      );
    }
  }

  // No modo real ela volta a decidir por papel (allowlist), como sempre.
  modo("supabase", SUPABASE_COMPLETO);
  assert.equal(
    await autorizado({
      auth: { user: { role: "administrador" } },
      request: requisicao("/gestor"),
    }),
    true,
    "modo real: administrador entra na gestão",
  );
  assert.equal(
    await autorizado({ auth: null, request: requisicao("/gestor") }),
    false,
    "modo real: sem sessão, falha fechada",
  );
  resetTestEnv();
});

// ============ invocação DIRETA, sem middleware (Server Actions privadas)
test("Server Actions privadas falham fechadas fora do modo declarado", async () => {
  // Estas actions são endpoints próprios. O middleware cobre suas rotas,
  // mas a prova de que não dependem dele é invocá-las diretamente.
  const professor = await import("@/app/(platform)/professor/actions");
  const turmas = await import("@/app/(platform)/professor/turmas/actions");
  const missao = await import("@/app/(platform)/missoes/[id]/mission-flow/actions");

  const chamadas = [
    [
      "reviewSubmissionAction",
      () =>
        professor.reviewSubmissionAction({
          classroomId: "turma-ficticia",
          studentId: "aluno-ficticio",
          missionId: "missao-ficticia",
          grade: "A",
          observedCriteria: [],
          feedback: "teste",
        }),
    ],
    [
      "publishLessonMission",
      () =>
        turmas.publishLessonMission({
          classroomId: "turma-ficticia",
          missionId: "missao-ficticia",
          lessonId: "aula-ficticia",
        }),
    ],
    ["getStudentWorkAction", () => missao.getStudentWorkAction("missao-ficticia")],
  ];

  for (const [nome, valor, extras] of [
    ["modo ausente", null, {}],
    ["valor inválido", "producao", {}],
    ["supabase parcial", "supabase", { AUTH_SECRET: "secret-ficticio" }],
  ]) {
    resetTestEnv(); // nenhum repositório falso configurado
    modo(valor, extras);
    testEnv.cookies.set("iah_workspace_session", "user-fabio"); // cookie de demo

    for (const [acao, executar] of chamadas) {
      await assert.rejects(
        executar,
        (erro) => {
          // Qualquer recusa serve; o proibido é RESOLVER com dado.
          assert.ok(erro instanceof Error, `${acao} deve falhar com erro`);
          return true;
        },
        `${nome}: ${acao} não pode concluir com cookie de demonstração`,
      );
    }
  }
  resetTestEnv();
});
