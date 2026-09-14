/**
 * Seleção do modo de autenticação — `IAH_AUTH_MODE` (hardening de
 * prontidão comercial do login).
 *
 * A regra que estes testes protegem: o modo é DECLARADO, nunca inferido.
 * Antes, "nenhuma variável definida" virava demonstração automaticamente
 * — uma instalação comercial mal configurada se apresentava como
 * ambiente de demonstração, com o provider local aceitando contas
 * fictícias. Agora, ausência, valor inválido ou configuração parcial
 * levam ao estado INDISPONÍVEL: nada autentica.
 *
 * Todos os valores aqui são fictícios; nenhuma credencial real é usada,
 * e nenhum teste toca Supabase ou rede.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  enableDemoMode,
  enableRealMode,
  enableUnavailableMode,
} from "./support/test-env.mjs";

const FLAGS = "@/lib/auth-flags";

/** Zera todas as variáveis que participam da decisão de modo. */
function resetEnv() {
  enableUnavailableMode();
}

function sourceOf(relative) {
  return readFileSync(new URL(`../src/${relative}`, import.meta.url), "utf8");
}

// ---------------------------------------------------------------- 1
test("modo demo explícito seleciona o provider local", async () => {
  resetEnv();
  enableDemoMode();
  const { getAuthMode, isDemoMode, isAuthConfigured } = await import(FLAGS);

  assert.equal(getAuthMode(), "demo");
  assert.equal(isDemoMode(), true);
  assert.equal(isAuthConfigured(), false, "demo nunca ativa o modo real");

  const { getWorkspaceAuthProvider } = await import("@/modules/workspace");
  assert.equal(getWorkspaceAuthProvider().id, "local");
});

// ---------------------------------------------------------------- 2
test("modo supabase completo seleciona a autenticação real", async () => {
  resetEnv();
  enableRealMode();
  const { getAuthMode, isAuthConfigured, isDemoMode } = await import(FLAGS);

  assert.equal(getAuthMode(), "supabase");
  assert.equal(isAuthConfigured(), true);
  assert.equal(isDemoMode(), false, "modo real jamais é demonstração");
});

// ---------------------------------------------------------------- 3
test("modo ausente NÃO seleciona demonstração", async () => {
  resetEnv();
  const { getAuthMode, isDemoMode, isAuthConfigured, isPlatformUnavailable } =
    await import(FLAGS);

  assert.equal(getAuthMode(), "unavailable");
  assert.equal(isDemoMode(), false, "omissão não pode virar demonstração");
  assert.equal(isAuthConfigured(), false);
  assert.equal(isPlatformUnavailable(), true);
});

// ---------------------------------------------------------------- 4
test("valor inválido resulta em indisponibilidade", async () => {
  resetEnv();
  const { getAuthMode, isDemoMode } = await import(FLAGS);

  for (const valor of ["DEMO ", "producao", "true", "1", "supabase-ish", " "]) {
    process.env.IAH_AUTH_MODE = valor;
    const modo = getAuthMode();
    if (valor.trim().toLowerCase() === "demo") continue; // normalização válida
    assert.equal(modo, "unavailable", `valor ${JSON.stringify(valor)}`);
    assert.equal(isDemoMode(), false);
  }
  delete process.env.IAH_AUTH_MODE;
});

test("modo demo é normalizado (espaços e caixa não invalidam)", async () => {
  resetEnv();
  const { getAuthMode } = await import(FLAGS);
  process.env.IAH_AUTH_MODE = "  Demo ";
  assert.equal(getAuthMode(), "demo");
  delete process.env.IAH_AUTH_MODE;
});

// ---------------------------------------------------------------- 5
test("configuração supabase parcial resulta em indisponibilidade", async () => {
  const { getAuthMode, isDemoMode, isAuthConfigured } = await import(FLAGS);

  const combinacoes = [
    ["AUTH_SECRET"],
    ["NEXT_PUBLIC_SUPABASE_URL"],
    ["SUPABASE_SERVICE_ROLE_KEY"],
    ["AUTH_SECRET", "NEXT_PUBLIC_SUPABASE_URL"],
    ["AUTH_SECRET", "SUPABASE_SERVICE_ROLE_KEY"],
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  ];

  for (const presentes of combinacoes) {
    resetEnv();
    process.env.IAH_AUTH_MODE = "supabase";
    for (const nome of presentes) process.env[nome] = "valor-ficticio";

    assert.equal(
      getAuthMode(),
      "unavailable",
      `parcial com ${presentes.join("+")} não pode autenticar`,
    );
    assert.equal(isAuthConfigured(), false);
    assert.equal(
      isDemoMode(),
      false,
      "configuração parcial JAMAIS pode habilitar demonstração",
    );
  }
  resetEnv();
});

// ---------------------------------------------------------------- 6
test("falha do modo real não cai para demonstração", async () => {
  resetEnv();
  enableRealMode();
  const { getAuthMode, isDemoMode } = await import(FLAGS);

  // Perder uma variável em runtime degrada para indisponível, nunca para
  // o provider local — não existe caminho de volta ao simulado.
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(getAuthMode(), "unavailable");
  assert.equal(isDemoMode(), false);
  resetEnv();
});

test("o middleware nega rotas privadas no estado indisponível", async () => {
  resetEnv();
  const { default: middleware } = await import("@/middleware");

  const origem = "http://localhost:3000";
  for (const rota of ["/gestor", "/professor", "/dashboard"]) {
    const resposta = middleware({
      nextUrl: new URL(origem + rota),
      url: origem + rota,
      cookies: { get: () => ({ value: "sessao-remanescente" }) },
    });
    assert.equal(resposta.iahKind, "redirect", `rota ${rota}`);
    assert.match(
      resposta.location,
      /\/entrar$/,
      "cookie remanescente de demonstração não pode liberar rota privada",
    );
  }
});

// ---------------------------------------------------------------- 7 e 8
test("provider local aceita uma conta fictícia válida", async () => {
  resetEnv();
  enableDemoMode();
  const { getWorkspaceAuthProvider, WORKSPACE_DEMO_PASSWORD, WORKSPACE_TEACHER } =
    await import("@/modules/workspace");

  const user = await getWorkspaceAuthProvider().authenticate(
    WORKSPACE_TEACHER.email,
    WORKSPACE_DEMO_PASSWORD,
  );
  assert.ok(user, "a conta fictícia do seed deve autenticar no modo demo");
  assert.equal(user.role, "teacher");
});

test("provider local rejeita credenciais inválidas", async () => {
  resetEnv();
  enableDemoMode();
  const { getWorkspaceAuthProvider, WORKSPACE_DEMO_PASSWORD, WORKSPACE_TEACHER } =
    await import("@/modules/workspace");
  const provider = getWorkspaceAuthProvider();

  assert.equal(
    await provider.authenticate(WORKSPACE_TEACHER.email, "senha-errada"),
    null,
    "senha errada não autentica",
  );
  assert.equal(
    await provider.authenticate("intruso@outrodominio.test", WORKSPACE_DEMO_PASSWORD),
    null,
    "domínio fora da instituição não autentica nem com a senha certa",
  );
  assert.equal(
    await provider.authenticate("", ""),
    null,
    "credenciais vazias não autenticam",
  );
});

// ---------------------------------------------------------------- 9
test("a senha de demonstração não é renderizada na tela de login", () => {
  const page = sourceOf("app/entrar/page.tsx");

  assert.equal(
    page.includes("WORKSPACE_DEMO_PASSWORD"),
    false,
    "a tela não pode referenciar a senha de demonstração",
  );
  assert.equal(
    page.includes("WORKSPACE_TEACHER"),
    false,
    "a tela não pode exibir conta de exemplo",
  );
  assert.match(
    page,
    /Ambiente de demonstração/,
    "o selo de demonstração continua existindo",
  );
});

test("nenhuma tela renderiza a senha de demonstração", () => {
  const alvos = [
    "app/entrar/page.tsx",
    "components/layout/session-controls.tsx",
  ];
  for (const alvo of alvos) {
    assert.equal(
      sourceOf(alvo).includes("WORKSPACE_DEMO_PASSWORD"),
      false,
      `${alvo} não pode renderizar a senha de demonstração`,
    );
  }
});

// ---------------------------------------------------------------- 10
test("a mensagem enviada ao usuário não revela configuração técnica", async () => {
  resetEnv();
  const { getPlatformConfigError } = await import(FLAGS);
  const page = sourceOf("app/entrar/page.tsx");

  const NEUTRA =
    "A plataforma está temporariamente indisponível. Tente novamente mais tarde.";
  assert.ok(page.includes(NEUTRA), "a tela mostra a mensagem neutra");

  for (const variavel of [
    "IAH_AUTH_MODE",
    "AUTH_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]) {
    assert.equal(
      NEUTRA.includes(variavel),
      false,
      `a mensagem neutra não cita ${variavel}`,
    );
  }

  // O diagnóstico detalhado existe, mas é destinado ao log do servidor.
  const diagnostico = getPlatformConfigError();
  assert.ok(diagnostico, "o operador precisa do diagnóstico no servidor");
  assert.match(diagnostico, /IAH_AUTH_MODE/);
  assert.equal(
    page.includes("getPlatformConfigError"),
    false,
    "a tela nunca toca o diagnóstico durante o render",
  );
  assert.equal(
    page.includes("console."),
    false,
    "nada é logado dentro do render: em dev o Next reencaminha o console " +
      "do servidor para o payload do navegador",
  );
  assert.match(
    page,
    /^logAuthModeDiagnosticsOnce\(\);$/m,
    "o diagnóstico é emitido fora do render, no escopo do módulo",
  );
});

// ---------------------------------------------------------------- 11
test("login Google não aparece no modo demo", async () => {
  resetEnv();
  enableDemoMode();
  process.env.GOOGLE_CLIENT_ID = "client-id-ficticio";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret-ficticio";

  const { isGoogleAuthConfigured } = await import(FLAGS);
  assert.equal(
    isGoogleAuthConfigured(),
    false,
    "nem com credenciais Google definidas o botão pode aparecer em demo",
  );

  resetEnv();
  process.env.IAH_AUTH_MODE = "supabase";
  process.env.GOOGLE_CLIENT_ID = "client-id-ficticio";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret-ficticio";
  assert.equal(
    isGoogleAuthConfigured(),
    false,
    "configuração supabase incompleta também não habilita Google",
  );

  enableRealMode();
  process.env.GOOGLE_CLIENT_ID = "client-id-ficticio";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret-ficticio";
  assert.equal(isGoogleAuthConfigured(), true);
  resetEnv();
});

// ---------------------------------------------------------------- 12
test("envio por botão e por Enter percorrem o mesmo caminho", () => {
  const page = sourceOf("app/entrar/page.tsx");

  // O envio é nativo: um <form> com uma única ação e um único botão
  // type="submit". A submissão implícita (Enter) aciona exatamente esse
  // botão — não há handler de teclado nem onSubmit que possa divergir.
  assert.equal(
    (page.match(/type="submit"/g) ?? []).length >= 1,
    true,
    "existe botão de submit",
  );
  assert.equal(page.includes("onSubmit"), false, "sem onSubmit divergente");
  assert.equal(page.includes("onKeyDown"), false, "sem captura de teclado");
  assert.equal(page.includes("preventDefault"), false, "nada intercepta o envio");
  assert.match(
    page,
    /action=\{realMode \? credentialsLoginAction : demoLoginAction\}/,
    "uma única ação por modo, compartilhada por clique e Enter",
  );
});

// ------------------------------------------------- guardas das actions
test("as Server Actions reconferem o modo declarado", () => {
  const page = sourceOf("app/entrar/page.tsx");

  assert.match(
    page,
    /if \(getAuthMode\(\) !== "supabase"\) redirect\("\/entrar\?erro=indisponivel"\)/,
    "credentialsLoginAction exige modo supabase",
  );
  assert.match(
    page,
    /if \(getAuthMode\(\) !== "demo"\) redirect\("\/entrar\?erro=indisponivel"\)/,
    "demoLoginAction exige modo demo declarado",
  );
});

test("falha de infraestrutura não é apresentada como credencial incorreta", () => {
  const auth = sourceOf("auth.ts");
  const page = sourceOf("app/entrar/page.tsx");

  assert.match(
    auth,
    /throw new Error\("auth_backend_unavailable"\)/,
    "erro de banco é lançado, não devolvido como null",
  );
  assert.match(
    page,
    /error\.type === "CredentialsSignin"[\s\S]*erro=credenciais[\s\S]*erro=indisponivel/,
    "só CredentialsSignin vira mensagem de credenciais",
  );
});
