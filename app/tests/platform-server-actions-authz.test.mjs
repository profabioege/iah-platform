/**
 * Autorização das Server Actions — a barreira que a interface não pode
 * substituir.
 *
 * Uma Server Action é um endpoint HTTP: esconder um botão não impede a
 * chamada. Por isso o que se testa aqui não é a tela, é a recusa —
 * aluno não avalia, professor não produz como aluno, e nenhuma ação
 * aceita `institutionId`/`classroomId`/`studentId` vindos do cliente.
 *
 * Só a persistência é falsa; o serviço de ciclo de aprendizagem que as
 * ações chamam é o de produção.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

import { createFakeRepositories } from "./support/fake-repositories.mjs";
import { createFakeSupabase } from "./support/fake-supabase.mjs";
import { enableRealMode, resetTestEnv, testEnv } from "./support/test-env.mjs";

const seed = await import("@/modules/platform/seeds/demo-seed");

const INSTITUTION = seed.DEMO_INSTITUTION;
const CLASSROOMS = seed.DEMO_CLASSROOMS;
const TEACHER = seed.DEMO_TEACHER;
const ALUNO_01 = seed.DEMO_STUDENTS[0];
const ALUNO_02 = seed.DEMO_STUDENTS[1];
const TURMA_JORNADA = seed.DEMO_ENROLLMENTS.find(
  (e) => e.studentId === ALUNO_01.id,
).classroomId;
const OUTRA_TURMA = CLASSROOMS.find((c) => c.id !== TURMA_JORNADA).id;
const MISSION = seed.DEMO_MISSION_RECORD.id;

function databaseRows() {
  return {
    teachers: [
      { id: TEACHER.id, user_id: "user-fabio", institution_id: INSTITUTION.id },
    ],
    students: seed.DEMO_STUDENTS.map((student) => ({
      id: student.id,
      user_id: `user-${student.id}`,
      institution_id: INSTITUTION.id,
    })),
    enrollments: seed.DEMO_ENROLLMENTS.map((enrollment) => ({
      classroom_id: enrollment.classroomId,
      student_id: enrollment.studentId,
      institution_id: enrollment.institutionId,
      status: enrollment.status,
    })),
    subjects: [
      { id: "subject-iah", institution_id: INSTITUTION.id, name: "IAH" },
    ],
  };
}

/**
 * Ciclo do Aluno 01 já concluído — Produção entregue E Reflexão
 * registrada. É a pré-condição do serviço para aceitar avaliação
 * (`getStudentSubmissionStatus` só chega a "submitted" com as duas).
 */
function cicloConcluidoDoAluno01() {
  const escopo = {
    institutionId: INSTITUTION.id,
    classroomId: TURMA_JORNADA,
    studentId: ALUNO_01.id,
    missionId: MISSION,
  };
  return {
    productions: [
      {
        ...escopo,
        id: `production-${ALUNO_01.id}-${MISSION}`,
        startedAt: "2026-08-06T10:00:00-03:00",
        content: "Vereditos: falsa, real, falsa, real.",
        status: "delivered",
        deliveredAt: "2026-08-06T10:20:00-03:00",
        updatedAt: "2026-08-06T10:20:00-03:00",
      },
    ],
    reflections: [
      {
        ...escopo,
        id: `reflection-${ALUNO_01.id}-${MISSION}`,
        text: "Aprendi a procurar a data original da imagem.",
        recordedAt: "2026-08-06T10:25:00-03:00",
        visibility: "shared_with_teacher",
      },
    ],
  };
}

/** Autentica um usuário e prepara banco e repositórios falsos. */
function signedInAs(userId, role, { productions = [], reflections = [] } = {}) {
  resetTestEnv();
  enableRealMode();
  testEnv.session = {
    user: {
      platformUserId: userId,
      institutionId: INSTITUTION.id,
      role,
      name: userId,
    },
  };
  testEnv.db = createFakeSupabase(databaseRows());
  testEnv.repositories = createFakeRepositories({
    institution: INSTITUTION,
    academicYears: [seed.DEMO_ACADEMIC_YEAR],
    classrooms: CLASSROOMS,
    productions,
    reflections,
  });
  return testEnv.repositories;
}

const professorActions = () => import("@/app/(platform)/professor/actions");
const alunoActions = () =>
  import("@/app/(platform)/missoes/[id]/mission-flow/actions");

const review = {
  studentId: ALUNO_01.id,
  missionId: MISSION,
  grade: "Atingiu",
  observedCriteria: ["Justificou o veredito"],
  feedback: "Boa checagem de fontes.",
};

// ----------------------------------------------- avaliação (professor)

test("aluno não avalia entrega", async () => {
  signedInAs(`user-${ALUNO_01.id}`, "aluno");
  const { reviewSubmissionAction } = await professorActions();
  await assert.rejects(
    () => reviewSubmissionAction({ classroomId: TURMA_JORNADA, ...review }),
    /Apenas a equipe pedagógica pode avaliar entregas/,
  );
});

test("sem sessão ninguém avalia", async () => {
  signedInAs(`user-${ALUNO_01.id}`, "aluno");
  testEnv.session = null;
  const { reviewSubmissionAction } = await professorActions();
  await assert.rejects(() =>
    reviewSubmissionAction({ classroomId: TURMA_JORNADA, ...review }),
  );
});

test("professor não avalia turma fora do seu contexto", async () => {
  signedInAs("user-fabio", "professor");
  testEnv.repositories = createFakeRepositories({
    institution: INSTITUTION,
    academicYears: [seed.DEMO_ACADEMIC_YEAR],
    // Só a turma da jornada é dele — a outra existe, mas não no contexto.
    classrooms: CLASSROOMS.map((c) => ({
      ...c,
      teacherIds: c.id === TURMA_JORNADA ? [TEACHER.id] : ["teacher-outro"],
    })),
  });
  const { reviewSubmissionAction } = await professorActions();
  await assert.rejects(
    () => reviewSubmissionAction({ classroomId: OUTRA_TURMA, ...review }),
    /Turma fora do contexto institucional atual/,
  );
});

test("turma inexistente é recusada como turma fora do contexto", async () => {
  signedInAs("user-fabio", "professor");
  const { reviewSubmissionAction } = await professorActions();
  await assert.rejects(
    () => reviewSubmissionAction({ classroomId: "class-inventada", ...review }),
    /Turma fora do contexto institucional atual/,
  );
});

test("a avaliação persiste com o institutionId da sessão, nunca do cliente", async () => {
  const repositories = signedInAs("user-fabio", "professor", cicloConcluidoDoAluno01());
  const { reviewSubmissionAction } = await professorActions();
  await reviewSubmissionAction({ classroomId: TURMA_JORNADA, ...review });

  const saved = repositories.saved.missionReviews;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].institutionId, INSTITUTION.id);
  assert.equal(saved[0].classroomId, TURMA_JORNADA);
  assert.equal(saved[0].studentId, ALUNO_01.id);
  assert.equal(saved[0].reviewerId, "user-fabio");
  for (const call of repositories.calls) {
    assert.equal(call.institutionId, INSTITUTION.id, call.method);
  }
});

test("avaliar revalida as áreas dos quatro perfis", async () => {
  signedInAs("user-fabio", "professor", cicloConcluidoDoAluno01());
  const { reviewSubmissionAction } = await professorActions();
  await reviewSubmissionAction({ classroomId: TURMA_JORNADA, ...review });
  assert.deepEqual(testEnv.revalidated, [
    "/professor",
    "/professor/turmas",
    "/dashboard",
    "/gestor",
  ]);
});

// ------------------------------------------------- ciclo do aluno

const STUDENT_ACTIONS = [
  ["getStudentWorkAction", (fn) => fn(MISSION)],
  ["startMissionAction", (fn) => fn(MISSION)],
  ["saveProductionDraftAction", (fn) => fn(MISSION, "texto")],
  ["setProductionDeliveredAction", (fn) => fn(MISSION, true)],
  ["saveReflectionDraftAction", (fn) => fn(MISSION, "reflexão")],
];

test("professor e Direção não realizam Missão no lugar do aluno", async (t) => {
  for (const role of ["professor", "administrador"]) {
    for (const [name, call] of STUDENT_ACTIONS) {
      await t.test(`${role} → ${name}`, async () => {
        signedInAs(role === "professor" ? "user-fabio" : "user-diretor", role);
        const actions = await alunoActions();
        await assert.rejects(
          () => call(actions[name]),
          /Apenas Alunos realizam Missões/,
        );
      });
    }
  }
});

test("sem sessão, o ciclo do aluno não abre", async (t) => {
  for (const [name, call] of STUDENT_ACTIONS) {
    await t.test(name, async () => {
      signedInAs(`user-${ALUNO_01.id}`, "aluno");
      testEnv.session = null;
      const actions = await alunoActions();
      await assert.rejects(() => call(actions[name]), /Sessão expirada/);
    });
  }
});

test("aluno sem turma vinculada não produz", async () => {
  signedInAs(`user-${ALUNO_01.id}`, "aluno");
  const rows = databaseRows();
  rows.enrollments = [];
  testEnv.db = createFakeSupabase(rows);
  const { startMissionAction } = await alunoActions();
  await assert.rejects(
    () => startMissionAction(MISSION),
    /Nenhuma Turma vinculada à sua matrícula/,
  );
});

test("o aluno produz sempre no próprio escopo — não no do colega", async () => {
  const repositories = signedInAs(`user-${ALUNO_01.id}`, "aluno");
  const { saveProductionDraftAction } = await alunoActions();
  await saveProductionDraftAction(MISSION, "Manchete 1: falsa — sem autor.");

  const saved = repositories.saved.productions;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].studentId, ALUNO_01.id);
  assert.notEqual(saved[0].studentId, ALUNO_02.id);
  assert.equal(saved[0].classroomId, TURMA_JORNADA);
  assert.equal(saved[0].institutionId, INSTITUTION.id);
});

test("o escopo do aluno ignora qualquer id que não seja o da própria sessão", async () => {
  const repositories = signedInAs(`user-${ALUNO_02.id}`, "aluno");
  const { startMissionAction } = await alunoActions();
  await startMissionAction(MISSION);

  // A assinatura das ações só aceita missionId (e o conteúdo): não há
  // por onde um cliente informar instituição, turma ou aluno.
  assert.equal(startMissionAction.length, 1);
  for (const call of repositories.calls) {
    assert.equal(call.institutionId, INSTITUTION.id, call.method);
  }
  assert.equal(repositories.saved.productions[0].studentId, ALUNO_02.id);
});

test("nenhuma Server Action do aluno aceita mais de dois argumentos", async () => {
  const actions = await alunoActions();
  for (const [name] of STUDENT_ACTIONS) {
    assert.ok(actions[name].length <= 2, `${name} recebe dados demais`);
  }
});
