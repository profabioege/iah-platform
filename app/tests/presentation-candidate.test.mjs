/**
 * Garantias da candidata de apresentação (demo/apresentacao-beryon-2026-09-17).
 *
 * A candidata parte de 8f78857 e recebe, de 3246b7f, só o painel do
 * professor de três cartões, o Planejador do DocentIAH e o fluxo
 * demonstrativo da sondagem diagnóstica. Este arquivo trava o que essa
 * integração NÃO pode mudar na base:
 *
 * - toda tela nova passa por `requirePlatformDataMode()` antes de ler
 *   sessão ou repositório, e toda Server Action nova recusa fora do modo
 *   demo antes de resolver o contexto;
 * - nenhuma rota nova cria prefixo privado: a matriz do middleware segue
 *   com as cinco áreas da base;
 * - só existem os papéis técnicos da base (sem divisão experimental);
 * - a sondagem não tem repositório de banco nem cai no seed fora do demo;
 * - os menus levam cada papel apenas a rotas da própria área;
 * - nenhum seed do modo demo exibe o nome do fundador.
 *
 * Mesma limitação registrada em platform-private-access: `.tsx` não é
 * importável no runner, então telas e menus são verificados pela fonte
 * sem comentários.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const SRC = new URL("../src/", import.meta.url);

const fonte = (rel) => readFileSync(new URL(rel, SRC), "utf8");

const codigo = (rel) =>
  fonte(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

function arquivos(dirRel) {
  const dir = new URL(dirRel.endsWith("/") ? dirRel : `${dirRel}/`, SRC);
  return readdirSync(dir).flatMap((nome) => {
    const rel = `${dirRel.replace(/\/$/, "")}/${nome}`;
    return statSync(new URL(rel, SRC)).isDirectory() ? arquivos(rel) : [rel];
  });
}

function modo(valor, extras = {}) {
  for (const v of ["IAH_AUTH_MODE", "AUTH_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
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

const TELAS_NOVAS = [
  "app/(platform)/professor/docente-iah/page.tsx",
  "app/(platform)/professor/avaliacoes/page.tsx",
  "app/(platform)/dashboard/sondagens/page.tsx",
  "app/(platform)/dashboard/sondagens/[id]/page.tsx",
  "app/(platform)/gestor/sondagens/page.tsx",
];

const ACOES_NOVAS = [
  ["app/(platform)/professor/docente-iah/planejador/actions.ts", "requireTeacherWorkspace"],
  ["app/(platform)/professor/avaliacoes/actions.ts", "teacherContext"],
  ["app/(platform)/dashboard/sondagens/[id]/actions.ts", "studentScope"],
];

// ================================================= guardas das telas novas
test("toda tela nova chama requirePlatformDataMode antes de sessão ou repositório", () => {
  for (const tela of TELAS_NOVAS) {
    const src = codigo(tela);
    const gate = src.indexOf("requirePlatformDataMode()");
    assert.ok(gate > -1, `${tela}: sem requirePlatformDataMode()`);
    for (const leitura of ["getWorkspaceContext(", "getDefaultAssessmentRepositories(", "loadPedagogicalOverview("]) {
      const pos = src.indexOf(leitura);
      if (pos > -1) assert.ok(gate < pos, `${tela}: ${leitura} antes da porta de modo`);
    }
  }
});

test("toda Server Action nova recusa fora do modo demo antes de resolver o contexto", () => {
  for (const [arquivo, funcao] of ACOES_NOVAS) {
    const src = codigo(arquivo);
    const corpo = src.slice(src.indexOf(`async function ${funcao}(`));
    const recusa = corpo.indexOf('getAuthMode() !== "demo"');
    const contexto = corpo.indexOf("getWorkspaceContext(");
    assert.ok(recusa > -1, `${arquivo}: ${funcao} não confere o modo demo`);
    assert.ok(recusa < contexto, `${arquivo}: contexto resolvido antes da recusa`);
  }
});

// ================================================= áreas e papéis
test("nenhuma rota nova cria área privada: middleware segue com as cinco da base", () => {
  const middleware = codigo("middleware.ts");
  const areas = [...middleware.matchAll(/"(\/[a-z]+)": \[/g)].map((m) => m[1]).sort();
  assert.deepEqual(areas, ["/dashboard", "/diario", "/gestor", "/missoes", "/professor"]);
  for (const tela of TELAS_NOVAS) {
    const rota = `/${tela.replace("app/(platform)/", "").replace(/\/page\.tsx$/, "")}`;
    assert.ok(areas.some((area) => rota.startsWith(`${area}/`)), `${rota} fora das áreas protegidas`);
  }
});

test("rotas da divisão experimental de papéis não existem nesta candidata", () => {
  for (const rota of ["direcao", "coordenacao", "mantenedor", "avaliacoes"]) {
    assert.equal(existsSync(new URL(`app/(platform)/${rota}`, SRC)), false, `/${rota} não deveria existir`);
  }
});

test("só os papéis técnicos da base aparecem no código", () => {
  const proibidos = /"(director|maintainer|pedagogical_coordinator)"/;
  for (const arquivo of arquivos("app").concat(arquivos("modules"), arquivos("lib"), arquivos("components"))) {
    if (!/\.(ts|tsx)$/.test(arquivo)) continue;
    assert.equal(proibidos.test(codigo(arquivo)), false, `papel experimental em ${arquivo}`);
  }
  assert.match(codigo("app/(platform)/professor/avaliacoes/actions.ts"), /assertRole\(workspace\.role, \["teacher"\]\)/);
});

// ================================================= sondagem
test("sondagem: sem repositório de banco nesta candidata", () => {
  assert.equal(existsSync(new URL("modules/assessment/infrastructure/database", SRC)), false);
  assert.doesNotMatch(codigo("modules/assessment/infrastructure/repository-factory.ts"), /supabase|database/i);
});

test("sondagem: fora do modo demo a fábrica recusa em vez de cair no seed", async () => {
  const { getDefaultAssessmentRepositories } = await import("@/modules/assessment/infrastructure/repository-factory");
  for (const [nome, valor, extras] of [
    ["supabase completo", "supabase", SUPABASE_COMPLETO],
    ["modo ausente", null, {}],
  ]) {
    modo(valor, extras);
    assert.throws(() => getDefaultAssessmentRepositories(), /ambiente de demonstração/, nome);
  }
});

test("sondagem: no modo demo usa o seed fictício da turma da jornada (1º EM A)", async () => {
  modo("demo");
  const { getDefaultAssessmentRepositories } = await import("@/modules/assessment/infrastructure/repository-factory");
  const repositories = getDefaultAssessmentRepositories();
  const aplicacoes = await repositories.assignments.listByInstitution("inst-horizonte");
  assert.ok(aplicacoes.some((item) => item.classroomId === "class-1em-a" && item.publicationStatus === "published"));
});

// ================================================= DocentIAH
test("DocentIAH: planejador sem IA externa, sem salvar e sem slides", () => {
  const acoes = codigo("app/(platform)/professor/docente-iah/planejador/actions.ts");
  assert.doesNotMatch(acoes, /lib\/ai|gateway|saveLessonDraftAction|getDefaultDocentiahRepositories/);
  const fluxo = codigo("app/(platform)/professor/docente-iah/planejador/planner-material-flow.tsx");
  assert.doesNotMatch(fluxo, /apresentacao-slides|saveLessonDraftAction|Salvar/);
  assert.equal(existsSync(new URL("modules/docentiah/infrastructure", SRC)), false);
  assert.equal(existsSync(new URL("lib/ai", SRC)), false);
});

// ================================================= painel e navegação
test("Painel do Professor: três cartões, sem os cartões futuros do painel antigo", () => {
  assert.equal(existsSync(new URL("app/(platform)/professor/teacher-workspace.tsx", SRC)), false);
  const atalhos = codigo("app/(platform)/professor/quick-shortcuts.tsx");
  const secao = atalhos.slice(atalhos.indexOf("export function QuickShortcuts"), atalhos.indexOf("function DocentIahCard"));
  assert.equal((secao.match(/<LinkCard /g) ?? []).length, 2);
  assert.match(secao, /<DocentIahCard \/>/);
  assert.doesNotMatch(atalhos + codigo("app/(platform)/professor/page.tsx"), /Biblioteca Oficial|Avaliação Assistida|Analytics da Turma|Planejamento Anual/);
});

test("menus levam cada papel só a rotas da própria área", () => {
  const sidebar = codigo("components/layout/app-sidebar.tsx");
  const menu = (nome) => {
    const inicio = sidebar.indexOf(`const ${nome}: MenuItem[] = [`);
    const bloco = sidebar.slice(inicio, sidebar.indexOf("];", inicio));
    return [...bloco.matchAll(/href: "([^"]+)"/g)].map((m) => m[1].split("?")[0]);
  };
  const areas = {
    TEACHER_MENU: ["/professor"],
    ADMIN_MENU: ["/gestor"],
    STUDENT_MENU: ["/dashboard", "/missoes", "/diario"],
  };
  for (const [nome, permitidas] of Object.entries(areas)) {
    const hrefs = menu(nome);
    assert.ok(hrefs.length > 0, `${nome} vazio`);
    for (const href of hrefs) {
      assert.ok(permitidas.some((area) => href === area || href.startsWith(`${area}/`)), `${nome}: ${href}`);
    }
  }
  assert.doesNotMatch(sidebar, /href: "[^"]*mentor/i, "Mentor IAH não pode ter link nesta candidata");
});

test("Painel do Gestor não oferece botão para telas de outro papel", () => {
  const painel = codigo("app/(platform)/gestor/executive-dashboard.tsx");
  assert.doesNotMatch(painel, /href(=|: )"\/(professor|missoes|dashboard|diario)/);
});

// ================================================= dados fictícios
test("nenhum seed do modo demo exibe o nome do fundador", async () => {
  for (const arquivo of arquivos("modules").filter((f) => /\/seeds\/.*\.ts$/.test(f))) {
    assert.doesNotMatch(fonte(arquivo), /\bEge\b|fabio\.ege/i, arquivo);
  }
  const { DEMO_TEACHER } = await import("../src/modules/platform/seeds/demo-seed.ts");
  assert.match(DEMO_TEACHER.name, /de demonstração$/);
});
