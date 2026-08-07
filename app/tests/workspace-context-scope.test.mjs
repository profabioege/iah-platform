/**
 * Escopo do contexto do Workspace — quem enxerga qual turma.
 *
 * Critério de aceitação 4 do ambiente demonstrativo: o Aluno 01 não vê
 * dados do Aluno 02. O corte acontece NO SERVIDOR, dentro de
 * `getWorkspaceContext()`: as turmas do aluno saem das matrículas dele,
 * as do professor das turmas que ele leciona, e só a Direção enxerga a
 * instituição inteira. Nenhuma tela repete essa regra — é este ponto
 * único que os testes precisam prender.
 *
 * O fio institucional (Instituto Horizonte, 5 turmas, 10 alunos, dois
 * por turma) vem do seed de verdade: se a turma da jornada deixar de
 * ser 1º EM A, ou `aluno01`/`aluno02` deixarem de ser colegas, estes
 * testes caem junto.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

import { createFakeRepositories } from "./support/fake-repositories.mjs";
import { createFakeSupabase } from "./support/fake-supabase.mjs";
import {
  enableDemoMode,
  enableRealMode,
  resetTestEnv,
  testEnv,
} from "./support/test-env.mjs";

const seed = await import("@/modules/platform/seeds/demo-seed");

const INSTITUTION = seed.DEMO_INSTITUTION;
const CLASSROOMS = seed.DEMO_CLASSROOMS;
const STUDENTS = seed.DEMO_STUDENTS;
const ENROLLMENTS = seed.DEMO_ENROLLMENTS;
const TEACHER = seed.DEMO_TEACHER;

const classroomOf = (studentId) =>
  ENROLLMENTS.find((e) => e.studentId === studentId).classroomId;

const ALUNO_01 = STUDENTS[0];
const ALUNO_02 = STUDENTS[1];
const ALUNO_03 = STUDENTS[2];

/** Linhas do banco (snake_case) equivalentes ao seed. */
function databaseRows() {
  return {
    teachers: [
      {
        id: TEACHER.id,
        user_id: "user-fabio",
        institution_id: INSTITUTION.id,
      },
    ],
    students: STUDENTS.map((student) => ({
      id: student.id,
      user_id: `user-${student.id}`,
      institution_id: INSTITUTION.id,
    })),
    enrollments: ENROLLMENTS.map((enrollment) => ({
      classroom_id: enrollment.classroomId,
      student_id: enrollment.studentId,
      institution_id: enrollment.institutionId,
      status: enrollment.status,
    })),
    subjects: [
      {
        id: "subject-iah",
        institution_id: INSTITUTION.id,
        name: "Inteligência Artificial & Humanidades",
      },
    ],
  };
}

function session({ userId, role, institutionId = INSTITUTION.id, name = "X" }) {
  return { user: { platformUserId: userId, institutionId, role, name } };
}

function arrangeRealMode(sessionValue, { classrooms = CLASSROOMS } = {}) {
  resetTestEnv();
  enableRealMode();
  testEnv.session = sessionValue;
  testEnv.db = createFakeSupabase(databaseRows());
  testEnv.repositories = createFakeRepositories({
    institution: INSTITUTION,
    academicYears: [seed.DEMO_ACADEMIC_YEAR],
    classrooms,
  });
}

const names = (context) => context.classrooms.map((c) => c.name).sort();

// ------------------------------------------------------------ alunos

test("Aluno 01 enxerga só a turma em que está matriculado", async () => {
  arrangeRealMode(session({ userId: `user-${ALUNO_01.id}`, role: "aluno" }));
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  const context = await getWorkspaceContext();

  assert.equal(context.role, "student");
  assert.equal(context.user.studentId, ALUNO_01.id);
  assert.deepEqual(
    context.classrooms.map((c) => c.id),
    [classroomOf(ALUNO_01.id)],
  );
  assert.deepEqual(names(context), ["1º EM A"]);
});

test("Aluno 02 é colega do Aluno 01 — mesma turma da jornada", async () => {
  arrangeRealMode(session({ userId: `user-${ALUNO_02.id}`, role: "aluno" }));
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  const context = await getWorkspaceContext();
  assert.deepEqual(names(context), ["1º EM A"]);
  assert.equal(classroomOf(ALUNO_02.id), classroomOf(ALUNO_01.id));
});

test("um aluno de outra turma não alcança a turma da jornada", async () => {
  arrangeRealMode(session({ userId: `user-${ALUNO_03.id}`, role: "aluno" }));
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  const context = await getWorkspaceContext();

  const visible = context.classrooms.map((c) => c.id);
  assert.deepEqual(visible, [classroomOf(ALUNO_03.id)]);
  assert.equal(visible.includes(classroomOf(ALUNO_01.id)), false);
  assert.equal(context.classrooms.length, 1);
});

test("aluno sem matrícula ativa fica sem turma alguma", async () => {
  resetTestEnv();
  enableRealMode();
  testEnv.session = session({
    userId: `user-${ALUNO_01.id}`,
    role: "aluno",
  });
  const rows = databaseRows();
  rows.enrollments = rows.enrollments.map((row) =>
    row.student_id === ALUNO_01.id ? { ...row, status: "inactive" } : row,
  );
  testEnv.db = createFakeSupabase(rows);
  testEnv.repositories = createFakeRepositories({
    institution: INSTITUTION,
    academicYears: [seed.DEMO_ACADEMIC_YEAR],
    classrooms: CLASSROOMS,
  });

  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  const context = await getWorkspaceContext();
  assert.deepEqual(context.classrooms, []);
});

// --------------------------------------------------- professor e direção

test("professor enxerga as turmas que leciona", async () => {
  arrangeRealMode(session({ userId: "user-fabio", role: "professor" }));
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  const context = await getWorkspaceContext();

  assert.equal(context.role, "teacher");
  assert.equal(context.user.teacherId, TEACHER.id);
  assert.deepEqual(
    context.classrooms.map((c) => c.id).sort(),
    CLASSROOMS.filter((c) => c.teacherIds.includes(TEACHER.id))
      .map((c) => c.id)
      .sort(),
  );
});

test("professor sem turma atribuída não herda as turmas da instituição", async () => {
  arrangeRealMode(session({ userId: "user-fabio", role: "professor" }), {
    classrooms: CLASSROOMS.map((c) => ({ ...c, teacherIds: ["teacher-outro"] })),
  });
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  const context = await getWorkspaceContext();
  assert.deepEqual(context.classrooms, []);
});

test("Direção enxerga todas as turmas da instituição", async () => {
  arrangeRealMode(
    session({ userId: "user-diretor", role: "administrador" }),
  );
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  const context = await getWorkspaceContext();

  assert.equal(context.role, "admin");
  assert.equal(context.user.studentId, null);
  assert.equal(context.user.teacherId, null);
  assert.equal(context.classrooms.length, CLASSROOMS.length);
  assert.equal(context.permissions.includes("institution:view"), true);
});

// ----------------------------------------------------------- isolamento

test("toda consulta ao banco filtra por institution_id", async () => {
  arrangeRealMode(session({ userId: `user-${ALUNO_01.id}`, role: "aluno" }));
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  await getWorkspaceContext();

  assert.ok(testEnv.db.calls.length > 0);
  for (const call of testEnv.db.calls) {
    assert.ok(
      call.filters.some(([column]) => column === "institution_id"),
      `consulta em ${call.table} sem filtro de instituição`,
    );
  }
});

test("todo repositório recebe o institutionId da sessão, nunca outro", async () => {
  arrangeRealMode(session({ userId: "user-diretor", role: "administrador" }));
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  await getWorkspaceContext();

  const received = testEnv.repositories.calls.map((c) => c.institutionId);
  assert.ok(received.length > 0);
  assert.deepEqual([...new Set(received)], [INSTITUTION.id]);
});

test("sessão de outra instituição não alcança o Instituto Horizonte", async () => {
  arrangeRealMode(
    session({
      userId: "user-diretor",
      role: "administrador",
      institutionId: "inst-outra",
    }),
  );
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  assert.equal(await getWorkspaceContext(), null);
});

// --------------------------------------------------------- sessão inválida

test("sessão incompleta ou com papel fora do vocabulário não vira contexto", async () => {
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  const invalid = [
    null,
    { user: {} },
    { user: { platformUserId: "user-diretor", role: "administrador" } },
    { user: { platformUserId: "user-diretor", institutionId: INSTITUTION.id } },
    session({ userId: "user-diretor", role: "secretaria" }),
  ];

  for (const value of invalid) {
    arrangeRealMode(value);
    assert.equal(
      await getWorkspaceContext(),
      null,
      JSON.stringify(value ?? null),
    );
  }
});

// -------------------------------------------------- modo demonstração

test("modo demonstração: o corte por matrícula é o mesmo", async () => {
  resetTestEnv();
  enableDemoMode();
  const { WORKSPACE_SESSION_COOKIE } = await import(
    "@/modules/workspace/infrastructure/session-cookie"
  );
  testEnv.cookies.set(WORKSPACE_SESSION_COOKIE, `user-${ALUNO_01.id}`);

  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  const context = await getWorkspaceContext();
  assert.deepEqual(names(context), ["1º EM A"]);
  assert.equal(context.institution.id, INSTITUTION.id);
});

test("modo demonstração: sem cookie não há contexto", async () => {
  resetTestEnv();
  enableDemoMode();
  const { getWorkspaceContext } = await import(
    "@/modules/workspace/infrastructure/session"
  );
  assert.equal(await getWorkspaceContext(), null);
});
