/**
 * Privacidade e coerência dos dados de demonstração.
 *
 * Critério de aceitação 9: nenhum dado real. O ambiente do Instituto
 * Horizonte é inteiramente fictício, e há um risco concreto e nomeado —
 * o branch `feature/mentor-persistence-*` carrega nomes reais de
 * menores. Eles NÃO são portados (LGPD), e este teste é a trava que
 * impede que voltem por um merge distraído.
 *
 * Junto disso, as asserções positivas que sustentam o roteiro: a turma
 * da jornada é 1º EM A nos dois modos, `aluno01@` e `aluno02@` são
 * literalmente Aluno 01 e Aluno 02, a Direção é a persona fictícia
 * Helena Duarte, e a senha das contas nunca é versionada.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const SEED_FILES = {
  "db/seed/seed-demo.mjs": read("../db/seed/seed-demo.mjs"),
  "modules/platform/seeds/demo-seed.ts": read(
    "../src/modules/platform/seeds/demo-seed.ts",
  ),
  "modules/workspace/seeds/institution-seed.ts": read(
    "../src/modules/workspace/seeds/institution-seed.ts",
  ),
  "modules/lesson/seeds/demo-seed.ts": read(
    "../src/modules/lesson/seeds/demo-seed.ts",
  ),
};

/**
 * Nomes reais de menores que existem em outro branch e não podem
 * atravessar para o ambiente demonstrativo. Lista literal e explícita:
 * o valor deste teste está em nomear o risco, não em adivinhá-lo.
 */
const NOMES_REAIS_DE_MENORES = ["Sophia Ege", "Nicolas Ege", "Sophia", "Nicolas"];

test("nenhum seed contém nome real de estudante", () => {
  for (const [file, content] of Object.entries(SEED_FILES)) {
    for (const nome of NOMES_REAIS_DE_MENORES) {
      assert.equal(
        content.includes(nome),
        false,
        `"${nome}" apareceu em ${file} — dado real de menor (LGPD)`,
      );
    }
  }
});

test("todo estudante dos seeds é rotulado como fictício", async () => {
  const { DEMO_STUDENTS } = await import(
    "../src/modules/platform/seeds/demo-seed.ts"
  );
  assert.equal(DEMO_STUDENTS.length, 10);
  for (const student of DEMO_STUDENTS) {
    assert.match(student.name, /^Aluno\(a\) de demonstração \d{2}$/);
    assert.match(student.email, /^aluno\d{2}@institutohorizonte\.edu\.br$/);
  }
});

test("o seed do banco real usa os mesmos nomes rotulados", () => {
  const seed = SEED_FILES["db/seed/seed-demo.mjs"];
  assert.match(seed, /Aluno\(a\) de demonstração \$\{nn\}/);
  assert.match(seed, /aluno\$\{nn\}@\$\{DOMAIN\}/);
});

test("a Direção é a persona fictícia Helena Duarte", () => {
  const seed = SEED_FILES["db/seed/seed-demo.mjs"];
  assert.match(seed, /name: "Helena Duarte"/);
  assert.match(seed, /role: "administrador"/);
});

test("nenhum nome inesperado entra no seed do banco real", () => {
  // Fabio Ege é adulto, autor do projeto e consente com a própria
  // presença — é a única pessoa real, e a lista abaixo é fechada:
  // qualquer nome novo (pessoa ou entidade) tem de ser justificado aqui
  // antes de chegar ao banco.
  const PERMITIDOS = [
    "Fabio Ege", // professor fundador (adulto, consentido)
    "Helena Duarte", // persona fictícia da Direção (D-015/D-039)
    "Instituto Horizonte", // instituição fictícia (D-039)
    "Inteligência Artificial & Humanidades", // disciplina
  ];
  const seed = SEED_FILES["db/seed/seed-demo.mjs"];
  const literais = [...seed.matchAll(/name: "([^"$]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(literais)].sort(), [...PERMITIDOS].sort());
});

test("a turma da jornada é 1º EM A nos dois modos", async () => {
  const { DEMO_LESSON } = await import(
    "../src/modules/lesson/seeds/demo-seed.ts"
  );
  assert.equal(DEMO_LESSON.classroomId, "class-1em-a");
  assert.equal(DEMO_LESSON.classroomLabel, "1º EM A");

  const seed = SEED_FILES["db/seed/seed-demo.mjs"];
  assert.match(seed, /classroom_id: "class-1em-a"/);
  assert.match(seed, /classroom_label: "1º EM A"/);
});

test("aluno01 e aluno02 são colegas na turma da jornada", async () => {
  const { DEMO_ENROLLMENTS, DEMO_STUDENTS } = await import(
    "../src/modules/platform/seeds/demo-seed.ts"
  );
  const turmaDe = (email) => {
    const student = DEMO_STUDENTS.find((s) => s.email.startsWith(email));
    return DEMO_ENROLLMENTS.find((e) => e.studentId === student.id).classroomId;
  };
  assert.equal(turmaDe("aluno01@"), "class-1em-a");
  assert.equal(turmaDe("aluno02@"), "class-1em-a");
});

test("a turma da jornada nasce zerada no modo demonstração", async () => {
  // D-008 do roteiro: o painel da Direção começa vazio e é a jornada ao
  // vivo que cria os indicadores. Progresso fictício existe nas OUTRAS
  // turmas, nunca na 1º EM A.
  const { DEMO_MISSION_PROGRESS } = await import(
    "../src/modules/platform/seeds/demo-seed.ts"
  );
  const naTurmaDaJornada = DEMO_MISSION_PROGRESS.filter(
    (progress) => progress.classroomId === "class-1em-a",
  );
  assert.equal(naTurmaDaJornada.length, 2);
  for (const progress of naTurmaDaJornada) {
    assert.equal(progress.status, "nao_acessou");
    assert.equal(progress.lastAccessAt, null);
  }
});

test("o seed do banco real não insere progresso nenhum", () => {
  const seed = SEED_FILES["db/seed/seed-demo.mjs"];
  for (const tabela of [
    "mission_progress",
    "productions",
    "reflections",
    "mission_reviews",
  ]) {
    assert.equal(
      seed.includes(`upsert("${tabela}"`),
      false,
      `o seed real populou ${tabela} — a jornada precisa nascer vazia`,
    );
  }
});

/** Código sem comentários — o exemplo de uso na documentação não é senha. */
function semComentarios(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("a senha das contas reais vem do ambiente, nunca do código", () => {
  const seed = SEED_FILES["db/seed/seed-demo.mjs"];
  assert.match(seed, /process\.env\.IAH_DEMO_PASSWORD/);
  assert.equal(
    /(password|senha)[a-z]*\s*=\s*["'][^"']+["']/i.test(semComentarios(seed)),
    false,
    "há uma senha literal no seed do banco real",
  );
  assert.match(seed, /password_hash: passwordHash/);
  assert.equal(seed.includes("horizonte2026"), false);
});

test("a senha literal existe só no modo demonstração, e é declarada como pública", () => {
  const workspace = SEED_FILES["modules/workspace/seeds/institution-seed.ts"];
  assert.match(workspace, /WORKSPACE_DEMO_PASSWORD = "horizonte2026"/);
  assert.match(workspace, /exibida na tela de login, nunca secreta/);
});

test("nenhum seed carrega credencial de infraestrutura", () => {
  const suspeitos =
    /(SUPABASE_SERVICE_ROLE_KEY|AUTH_SECRET)\s*[:=]\s*["'][^"']+["']|eyJ[A-Za-z0-9_-]{20,}/;
  for (const [file, content] of Object.entries(SEED_FILES)) {
    assert.equal(suspeitos.test(content), false, `credencial em ${file}`);
  }
});
