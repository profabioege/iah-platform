/**
 * SEED DE DEMONSTRAÇÃO — Colégio Beryon (M16: fonte institucional
 * ÚNICA da plataforma; o seed do Institutional Workspace importa
 * daqui, nunca o contrário). Dados 100% fictícios, autorizados e
 * rotulados (D-015): alunos são "Aluno(a) de demonstração NN", a
 * escola é o Colégio Beryon por pedido explícito da Sprint M15.
 *
 * REGRA (docs/PERSISTENCE.md): estes dados NUNCA entram em migration
 * nem são persistidos no banco oficial. O banco real nasce vazio; a
 * demonstração roda sobre estes seeds em memória, injetados pelos
 * SeedRepositories.
 *
 * ARQUIVO EDGE-SAFE: só dados e imports de tipo — o middleware chega
 * aqui via modules/workspace/seeds.
 *
 * O acompanhamento da turma no Painel do Professor
 * (simulated-class-monitor, modules/classroom) segue sendo um roster
 * simulado próprio, rotulado "Turma de demonstração" — aposentá-lo em
 * favor destes dados é o item 7 do checklist Mock → Banco Real.
 */

import type {
  AcademicYear,
  Classroom,
  Enrollment,
  Institution,
  MissionProgress,
  MissionRecord,
  Student,
  Teacher,
} from "../domain/entities";
import type { StudentMissionStatus } from "@/modules/classroom";

export const DEMO_INSTITUTION: Institution = {
  id: "inst-beryon",
  name: "Colégio Beryon",
  status: "active",
  createdAt: "2026-01-15T00:00:00-03:00",
};

export const DEMO_ACADEMIC_YEAR: AcademicYear = {
  id: "year-beryon-2026",
  institutionId: DEMO_INSTITUTION.id,
  label: "2026",
  startsOn: "2026-02-02",
  endsOn: "2026-12-11",
  status: "active",
};

export const DEMO_TEACHER: Teacher = {
  id: "teacher-fabio",
  institutionId: DEMO_INSTITUTION.id,
  name: "Professor Fábio",
  email: "fabio@beryon.edu.br",
};

const CLASSROOM_LABELS = [
  ["class-1em-a", "1º EM A", "1º ano E.M."],
  ["class-1em-b", "1º EM B", "1º ano E.M."],
  ["class-2em-a", "2º EM A", "2º ano E.M."],
  ["class-2em-b", "2º EM B", "2º ano E.M."],
  ["class-3em-a", "3º EM A", "3º ano E.M."],
] as const;

export const DEMO_CLASSROOMS: Classroom[] = CLASSROOM_LABELS.map(
  ([id, name, grade]) => ({
    id,
    institutionId: DEMO_INSTITUTION.id,
    academicYearId: DEMO_ACADEMIC_YEAR.id,
    name,
    grade,
    teacherIds: [DEMO_TEACHER.id],
  }),
);

/** Turma em que a Missão 01 está ativa na demonstração. */
export const DEMO_CLASSROOM: Classroom =
  DEMO_CLASSROOMS.find((c) => c.id === "class-2em-a") ?? DEMO_CLASSROOMS[0];

export const DEMO_MISSION_RECORD: MissionRecord = {
  id: "01-a-fabrica-de-noticias",
  number: 1,
  title: "A Fábrica de Notícias",
  module: "Módulo 1 — O Auditor da Realidade",
  status: "published",
  version: 1,
};

/** 10 alunos fictícios (2 por turma) — as mesmas contas de login do Workspace (M15). */
const DEMO_ROSTER: Array<{
  status: StudentMissionStatus;
  lastAccessAt: string | null;
}> = [
  { status: "concluiu", lastAccessAt: "2026-07-16T10:42:00-03:00" },
  { status: "reflexao", lastAccessAt: "2026-07-16T10:41:00-03:00" },
  { status: "entregue", lastAccessAt: "2026-07-16T10:35:00-03:00" },
  { status: "entregue", lastAccessAt: "2026-07-16T10:33:00-03:00" },
  { status: "rascunho", lastAccessAt: "2026-07-16T10:40:00-03:00" },
  { status: "produzindo", lastAccessAt: "2026-07-16T10:43:00-03:00" },
  { status: "investigando", lastAccessAt: "2026-07-16T10:39:00-03:00" },
  { status: "visualizou", lastAccessAt: "2026-07-16T10:29:00-03:00" },
  { status: "nao_acessou", lastAccessAt: null },
  { status: "nao_acessou", lastAccessAt: null },
];

export const DEMO_STUDENTS: Student[] = DEMO_ROSTER.map((_, i) => {
  const number = String(i + 1).padStart(2, "0");
  return {
    id: `student-beryon-${number}`,
    institutionId: DEMO_INSTITUTION.id,
    name: `Aluno(a) de demonstração ${number}`,
    email: `aluno${number}@beryon.edu.br`,
  };
});

export const DEMO_ENROLLMENTS: Enrollment[] = DEMO_STUDENTS.map(
  (student, i) => ({
    id: `enroll-beryon-${String(i + 1).padStart(2, "0")}`,
    institutionId: DEMO_INSTITUTION.id,
    classroomId: DEMO_CLASSROOMS[Math.floor(i / 2)].id,
    studentId: student.id,
    status: "active",
    enrolledAt: "2026-02-02T08:00:00-03:00",
  }),
);

/**
 * Progresso da Missão 01 por aluno, na turma de cada um — base do
 * futuro indicator-service; os estados variados espelham o mesmo
 * espectro do acompanhamento simulado.
 */
export const DEMO_MISSION_PROGRESS: MissionProgress[] = DEMO_STUDENTS.map(
  (student, i) => ({
    id: `prog-${student.id}`,
    institutionId: DEMO_INSTITUTION.id,
    classroomId: DEMO_ENROLLMENTS[i].classroomId,
    studentId: student.id,
    missionId: DEMO_MISSION_RECORD.id,
    status: DEMO_ROSTER[i].status,
    lastAccessAt: DEMO_ROSTER[i].lastAccessAt,
  }),
);
