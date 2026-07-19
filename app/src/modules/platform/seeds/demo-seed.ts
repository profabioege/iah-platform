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
 * M17 — Learning Lifecycle: este seed passou a ser a fonte real do
 * acompanhamento de turma no Painel do Professor (`institutional-class-
 * monitor.ts`), aposentando definitivamente o `simulated-class-monitor`
 * de `modules/classroom`. `DEMO_PRODUCTIONS`/`DEMO_REFLECTIONS` migram o
 * mesmo conteúdo fictício rico que vivia lá — nenhum texto novo, só
 * mudança de fonte.
 */

import type {
  AcademicYear,
  Classroom,
  Enrollment,
  Institution,
  MissionProgress,
  MissionRecord,
  Production,
  Reflection,
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

/** Texto de Produção — só para quem já entregou (índices 0–3: 1º EM A e 1º EM B). */
const DEMO_PRODUCTION_TEXT: Record<number, string> = {
  0:
    "Veredito 1: falsa — nenhuma outra fonte confirma. Veredito 2: real — " +
    "duas agências publicaram no mesmo dia. Veredito 3: falsa — a foto é de " +
    "2019. Veredito 4: real. Minha manchete: \"Prefeitura anuncia aulas de " +
    "drone para o 6º ano\" — engana porque cita uma fonte oficial que não existe.",
  1:
    "Auditoria: 1 falsa (sem autor), 2 real, 3 falsa (site imita portal " +
    "conhecido), 4 real. Manchete criada: \"Escola de Itu proíbe caneta azul\" " +
    "— crível porque parece regra escolar comum; denuncia-se pela ausência de fonte.",
  2:
    "Vereditos: falsa, real, falsa, real. A manchete que gerei usa números " +
    "exatos (\"87% dos alunos\") para parecer pesquisa séria — é isso que a denuncia: " +
    "nenhuma pesquisa é citada.",
  3:
    "1: falsa — o \"jornal\" não existe. 2: real. 3: falsa — IA gerou a imagem " +
    "(mão com seis dedos). 4: real. Manchete: \"Merenda terá robô cozinheiro\".",
};

/** Reflexão registrada — só para quem concluiu o Diário (índices 0–1). */
const DEMO_REFLECTION_TEXT: Record<number, string> = {
  0:
    "Quase acreditei na manchete 3 porque a foto parecia recente. Aprendi a " +
    "procurar a data original da imagem antes de confiar.",
  1:
    "Percebi que manchete boa de compartilhar é justamente a que merece mais " +
    "desconfiança.",
};

export const DEMO_PRODUCTIONS: Production[] = Object.entries(DEMO_PRODUCTION_TEXT).map(
  ([indexStr, content]) => {
    const i = Number(indexStr);
    const student = DEMO_STUDENTS[i];
    return {
      id: `production-${student.id}`,
      institutionId: DEMO_INSTITUTION.id,
      classroomId: DEMO_ENROLLMENTS[i].classroomId,
      studentId: student.id,
      missionId: DEMO_MISSION_RECORD.id,
      content,
      status: "delivered",
      deliveredAt: DEMO_ROSTER[i].lastAccessAt,
      updatedAt: DEMO_ROSTER[i].lastAccessAt ?? DEMO_ACADEMIC_YEAR.startsOn,
    };
  },
);

export const DEMO_REFLECTIONS: Reflection[] = Object.entries(DEMO_REFLECTION_TEXT).map(
  ([indexStr, text]) => {
    const i = Number(indexStr);
    const student = DEMO_STUDENTS[i];
    return {
      id: `reflection-${student.id}`,
      institutionId: DEMO_INSTITUTION.id,
      classroomId: DEMO_ENROLLMENTS[i].classroomId,
      studentId: student.id,
      missionId: DEMO_MISSION_RECORD.id,
      text,
      recordedAt: DEMO_ROSTER[i].lastAccessAt ?? DEMO_ACADEMIC_YEAR.startsOn,
      visibility: "shared_with_teacher",
    };
  },
);
