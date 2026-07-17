/**
 * SEED DE DEMONSTRAÇÃO — dados 100% fictícios, autorizados e rotulados
 * (mesmo padrão D-015: nunca dado fictício silencioso).
 *
 * REGRA (docs/PERSISTENCE.md): estes dados NUNCA entram em migration
 * nem são persistidos no banco oficial. O banco real nasce vazio; a
 * demonstração roda sobre estes seeds em memória, injetados pelos
 * SeedRepositories. Dados reais e dados de demonstração jamais se
 * misturam na mesma fonte.
 *
 * A turma espelha a "Turma de demonstração" já usada pelo Painel do
 * Professor (simulated-class-monitor) — mesma escola, mesmos 11 alunos,
 * mesmos estados — agora expressa no modelo institucional completo.
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
  id: "inst-demo",
  name: "Escola de Demonstração IAH",
  status: "active",
  createdAt: "2026-07-01T00:00:00-03:00",
};

export const DEMO_ACADEMIC_YEAR: AcademicYear = {
  id: "year-2026-demo",
  institutionId: DEMO_INSTITUTION.id,
  label: "2026",
  startsOn: "2026-02-02",
  endsOn: "2026-12-11",
  status: "active",
};

export const DEMO_TEACHER: Teacher = {
  id: "teacher-demo",
  institutionId: DEMO_INSTITUTION.id,
  name: "Professor(a) de demonstração",
  email: "professor@demonstracao.iaheducacional.com.br",
};

export const DEMO_CLASSROOM: Classroom = {
  id: "class-demo",
  institutionId: DEMO_INSTITUTION.id,
  academicYearId: DEMO_ACADEMIC_YEAR.id,
  name: "Turma de demonstração",
  grade: "Ensino Médio",
  teacherIds: [DEMO_TEACHER.id],
};

export const DEMO_MISSION_RECORD: MissionRecord = {
  id: "01-a-fabrica-de-noticias",
  number: 1,
  title: "A Fábrica de Notícias",
  module: "Módulo 1 — O Auditor da Realidade",
  status: "published",
  version: 1,
};

/** Nome, status e último acesso — espelho da turma simulada existente. */
const DEMO_ROSTER: Array<{
  id: string;
  name: string;
  status: StudentMissionStatus;
  lastAccessAt: string | null;
}> = [
  { id: "a01", name: "Ana Beatriz Souza", status: "concluiu", lastAccessAt: "2026-07-16T10:42:00-03:00" },
  { id: "a02", name: "Bruno Ferreira Lima", status: "concluiu", lastAccessAt: "2026-07-16T10:38:00-03:00" },
  { id: "a03", name: "Carla Mendes Rocha", status: "reflexao", lastAccessAt: "2026-07-16T10:41:00-03:00" },
  { id: "a04", name: "Diego Santana Alves", status: "entregue", lastAccessAt: "2026-07-16T10:35:00-03:00" },
  { id: "a05", name: "Eduarda Pacheco Nunes", status: "entregue", lastAccessAt: "2026-07-16T10:33:00-03:00" },
  { id: "a06", name: "Felipe Andrade Costa", status: "rascunho", lastAccessAt: "2026-07-16T10:40:00-03:00" },
  { id: "a07", name: "Gabriela Martins Dias", status: "produzindo", lastAccessAt: "2026-07-16T10:43:00-03:00" },
  { id: "a08", name: "Henrique Barros Teles", status: "investigando", lastAccessAt: "2026-07-16T10:39:00-03:00" },
  { id: "a09", name: "Isabela Fonseca Prado", status: "investigando", lastAccessAt: "2026-07-16T10:37:00-03:00" },
  { id: "a10", name: "João Pedro Camargo", status: "visualizou", lastAccessAt: "2026-07-16T10:29:00-03:00" },
  { id: "a11", name: "Karina Lopes Amaral", status: "nao_acessou", lastAccessAt: null },
];

function demoEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(" ")
    .filter(Boolean);
  return `${slug[0]}.${slug[slug.length - 1]}@escola-demo.iaheducacional.com.br`;
}

export const DEMO_STUDENTS: Student[] = DEMO_ROSTER.map((s) => ({
  id: s.id,
  institutionId: DEMO_INSTITUTION.id,
  name: s.name,
  email: demoEmail(s.name),
}));

export const DEMO_ENROLLMENTS: Enrollment[] = DEMO_ROSTER.map((s) => ({
  id: `enr-${s.id}`,
  institutionId: DEMO_INSTITUTION.id,
  classroomId: DEMO_CLASSROOM.id,
  studentId: s.id,
  status: "active",
  enrolledAt: "2026-02-02T08:00:00-03:00",
}));

export const DEMO_MISSION_PROGRESS: MissionProgress[] = DEMO_ROSTER.map(
  (s) => ({
    id: `prog-${s.id}`,
    institutionId: DEMO_INSTITUTION.id,
    classroomId: DEMO_CLASSROOM.id,
    studentId: s.id,
    missionId: DEMO_MISSION_RECORD.id,
    status: s.status,
    lastAccessAt: s.lastAccessAt,
  }),
);
