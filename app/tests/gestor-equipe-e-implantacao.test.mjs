/**
 * Perfil de gestor — correções da homologação de bb7c83e (REGISTRO 14):
 *  - G3: professores com os vínculos efetivos de turma, sem contagem fixa
 *    nem "primeiro professor";
 *  - G1: Implantação no modo real a partir dos dados da instituição;
 *  - G4: rótulos de demonstração só no modo demonstração.
 *
 * As funções puras cobrem contagens, vínculos e escopo; os ramos de modo
 * dos componentes são conferidos no código-fonte (a suíte não renderiza
 * TSX). A tela real renderizada é coberta pelo e2e `gestor-dados-reais`.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildTeacherLinks, countLinkedClassrooms } from "../src/app/(platform)/gestor/teacher-links.ts";
import { buildImplementationData } from "../src/app/(platform)/gestor/implantacao/implementation-data.ts";

// Checkout no Windows pode trazer CRLF; as comparações abaixo usam "\n".
const fonte = (caminho) =>
  readFileSync(new URL(`../src/${caminho}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

// Retrato da base hospedada em 22/10: 2 professores, 1 turma cada.
const PROFESSORES = [
  { id: "teacher-a", name: "Professor A", email: "a@escola.example" },
  { id: "teacher-b", name: "Professor B", email: "b@escola.example" },
];
const TURMAS = [
  { id: "class-a", name: "1ª série A", grade: "1ª série E.M.", teacherIds: ["teacher-a"] },
  { id: "class-b", name: "Turma B", grade: "1ª série E.M.", teacherIds: ["teacher-b"] },
];

// ------------------------------------------------------------ G3 vínculos
test("cada professor aparece com as próprias turmas (2 professores, 1 turma cada)", () => {
  const links = buildTeacherLinks(PROFESSORES, TURMAS);

  assert.deepEqual(
    links.map((l) => [l.name, l.classrooms.map((c) => c.name)]),
    [
      ["Professor A", ["1ª série A"]],
      ["Professor B", ["Turma B"]],
    ],
  );
  assert.equal(countLinkedClassrooms(links), 2);
});

test("professor em várias turmas e turma com dois professores contam certo", () => {
  const links = buildTeacherLinks(PROFESSORES, [
    { id: "c1", name: "C1", teacherIds: ["teacher-a", "teacher-b"] },
    { id: "c2", name: "C2", teacherIds: ["teacher-a"] },
    { id: "c3", name: "C3", teacherIds: [] },
  ]);

  assert.deepEqual(links[0].classrooms.map((c) => c.id), ["c1", "c2"]);
  assert.deepEqual(links[1].classrooms.map((c) => c.id), ["c1"]);
  assert.equal(countLinkedClassrooms(links), 2, "C1 conta uma vez; C3 não tem professor");
});

test("isolamento: vínculo com professor de outra instituição não aparece", () => {
  // O repositório lista só os professores da instituição; um teacherId
  // estranho numa turma não vira professor nem turma de ninguém daqui.
  const links = buildTeacherLinks(PROFESSORES, [
    { id: "class-a", name: "1ª série A", teacherIds: ["teacher-a", "teacher-outra-escola"] },
  ]);

  assert.deepEqual(links.map((l) => l.id), ["teacher-a", "teacher-b"]);
  assert.equal(links.some((l) => l.id === "teacher-outra-escola"), false);
  assert.deepEqual(links[1].classrooms, [], "Professor B continua sem turma");
});

test("isolamento: turma fora do escopo recebido não entra nos vínculos", () => {
  const links = buildTeacherLinks(PROFESSORES, TURMAS.slice(0, 1));
  assert.deepEqual(links[1].classrooms, []);
});

// --------------------------------------------------------- G1 Implantação
test("Implantação usa matrículas, professores e e-mails da instituição", () => {
  const data = buildImplementationData({
    classrooms: TURMAS,
    studentsByClassroom: new Map([
      ["class-a", [{ email: "x@escola.example" }, { email: "y@escola.example" }]],
      ["class-b", [{ email: "z@escola.example" }, { email: "w@ESCOLA.example" }]],
    ]),
    teachers: PROFESSORES,
    institutionDomain: "escola.example",
  });

  assert.equal(data.totalStudents, 4);
  assert.equal(data.classroomsWithStudents, 2);
  assert.equal(data.institutionalEmailShare, 100);
  assert.equal(data.teachers.length, 2);
  assert.deepEqual(
    data.classrooms.map((c) => [c.name, c.studentCount, c.teacherNames]),
    [
      ["1ª série A", 2, ["Professor A"]],
      ["Turma B", 2, ["Professor B"]],
    ],
  );
});

test("Implantação: e-mail fora do domínio, turma vazia e instituição sem alunos", () => {
  const parcial = buildImplementationData({
    classrooms: TURMAS,
    studentsByClassroom: new Map([
      ["class-a", [{ email: "x@escola.example" }, { email: "y@gmail.com" }, { email: null }]],
    ]),
    teachers: PROFESSORES,
    institutionDomain: "escola.example",
  });
  assert.equal(parcial.totalStudents, 3);
  assert.equal(parcial.classroomsWithStudents, 1);
  assert.equal(parcial.institutionalEmailShare, 33);

  const vazia = buildImplementationData({
    classrooms: TURMAS,
    studentsByClassroom: new Map(),
    teachers: [],
    institutionDomain: "escola.example",
  });
  assert.equal(vazia.totalStudents, 0);
  assert.equal(vazia.institutionalEmailShare, null, "sem alunos não há percentual a mostrar");
  assert.deepEqual(vazia.classrooms.map((c) => c.teacherNames), [[], []]);
});

test("isolamento: alunos de turma fora do escopo não entram no total", () => {
  const data = buildImplementationData({
    classrooms: TURMAS.slice(0, 1),
    studentsByClassroom: new Map([
      ["class-a", [{ email: "x@escola.example" }]],
      ["class-outra-escola", [{ email: "o@outra.example" }, { email: "p@outra.example" }]],
    ]),
    teachers: PROFESSORES,
    institutionDomain: "escola.example",
  });
  assert.equal(data.totalStudents, 1);
});

// -------------------------------------------------- modo real × demonstração
test("Implantação real não lê o seed de demonstração", () => {
  const pagina = fonte("app/(platform)/gestor/implantacao/page.tsx");
  const real = pagina.slice(pagina.indexOf("async function loadInstitutionData"), pagina.indexOf("function demoData"));
  assert.match(real, /repositories\.teachers\.listByInstitution/);
  assert.match(real, /repositories\.students\.listByClassroom/);
  assert.doesNotMatch(real, /WORKSPACE_/);
  assert.match(pagina, /realMode \? "Dados da instituição\." : "Ambiente de demonstração, dados simulados\."/);
});

test("Implantação real: recursos só de demonstração ficam indisponíveis, sem link para outro papel", () => {
  const wizard = fonte("app/(platform)/gestor/implantacao/implementation-wizard.tsx");
  assert.doesNotMatch(wizard, /count=\{1\}\s+names=\{\[data\.teacherName\]\}/, "professor fixo removido");
  assert.doesNotMatch(wizard, /label="Professores" value=\{1\}/, "resumo sem professor fixo");
  assert.match(wizard, /realMode \? null : \(\s*<div[^]*?Tudo pronto\./, "'Tudo pronto' só na demonstração");
  // O link para a área do professor só existe no ramo de demonstração.
  const ramoReal = wizard.slice(wizard.indexOf("{realMode ? (\n                <UnavailableNote>\n                  A importação"), wizard.indexOf(") : (\n                <p className=\"text-sm text-muted-foreground\">\n                  Importação de turmas"));
  assert.ok(ramoReal.length > 0);
  assert.doesNotMatch(ramoReal, /\/professor/);
});

test("Painel: rótulos de demonstração dependem do modo; sem contagem fixa de professor", () => {
  const painel = fonte("app/(platform)/gestor/executive-dashboard.tsx");
  const copy = painel.slice(painel.indexOf("const COPY = REAL_MODE"), painel.indexOf("function teacherCountLabel"));
  const [real, demo] = copy.split(/\n\s+: \{/);
  assert.match(real, /dataBadge: "Dados da instituição"/);
  assert.doesNotMatch(real, /simulad|demonstração/i);
  assert.match(demo, /Ambiente de demonstração · dados simulados/);
  assert.match(demo, /Dados simulados para demonstração comercial\./);

  // Nenhum texto "simulado" fora do bloco de rótulos por modo.
  assert.doesNotMatch(painel.replace(copy, ""), /dados simulados/i);
  assert.doesNotMatch(painel, /label="Professor vinculado" value="1"/);
  assert.doesNotMatch(painel, /teachers\[0\]/);
  assert.doesNotMatch(fonte("app/(platform)/gestor/page.tsx"), /teachers\[0\]/);
});

test("Painel: 'aguardam avaliação' no modo real vem de pendingReviewStudents", () => {
  const painel = fonte("app/(platform)/gestor/executive-dashboard.tsx");
  assert.match(painel, /pendingReviews: initialTotals\.pendingReviewStudents/);
  assert.doesNotMatch(painel, /pendingReviews: initialTotals\.completedStudents/);
});
