/**
 * Dados sintéticos do piloto e utilitários de sessão real.
 *
 * Tudo aqui é fictício e criado dentro do banco efêmero da execução:
 * uma instituição "Colégio Sintético" com uma turma de 45 estudantes,
 * um professor e um gestor — e uma SEGUNDA instituição, usada só para
 * provar isolamento. Nenhum nome, e-mail ou identificador corresponde a
 * pessoa real.
 *
 * O provisionamento usa o MESMO módulo que a CLI administrativa
 * (`pilot-provisioning.ts`), então os testes exercitam o caminho que a
 * escola vai usar, não um atalho de teste.
 */

import { createClient } from "@supabase/supabase-js";

import {
  clearPilotSession,
  setPilotSession,
} from "./auth-session-stub.mjs";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",
  "PILOT_TEST_DATABASE_URL",
];

for (const name of REQUIRED) {
  if (!process.env[name]) {
    throw new Error(
      `${name} ausente — rode com \`npm run test:pilot\`, que sobe o ambiente efêmero.`,
    );
  }
}

export const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

export const PILOT = {
  institution: {
    id: "inst-sintetico-a",
    name: "Colégio Sintético A",
    slug: "colegio-sintetico-a",
    domain: "sintetico-a.test",
  },
  academicYear: {
    id: "ay-sintetico-a-2026",
    label: "2026",
    startsOn: "2026-02-01",
    endsOn: "2026-12-15",
  },
  classroom: { id: "class-sintetico-a-1", name: "1ª série A", grade: "1ª série E.M." },
  teacher: {
    id: "teacher-sintetico-a",
    name: "Professor(a) Sintético(a) A",
    email: "professor.a@sintetico-a.test",
  },
  managers: [
    { id: "manager-sintetico-a", name: "Gestão Sintética A", email: "gestor.a@sintetico-a.test" },
  ],
  studentCount: 45,
};

export const OUTRA = {
  institution: {
    id: "inst-sintetico-b",
    name: "Colégio Sintético B",
    slug: "colegio-sintetico-b",
    domain: "sintetico-b.test",
  },
  academicYear: {
    id: "ay-sintetico-b-2026",
    label: "2026",
    startsOn: "2026-02-01",
    endsOn: "2026-12-15",
  },
  classroom: { id: "class-sintetico-b-1", name: "1ª série B", grade: "1ª série E.M." },
  teacher: {
    id: "teacher-sintetico-b",
    name: "Professor(a) Sintético(a) B",
    email: "professor.b@sintetico-b.test",
  },
  managers: [
    { id: "manager-sintetico-b", name: "Gestão Sintética B", email: "gestor.b@sintetico-b.test" },
  ],
  studentCount: 3,
};

export const MISSION = {
  id: "missao-sintetica-01",
  number: 1,
  title: "Missão sintética 01",
  module: "Módulo sintético",
  status: "published",
  version: 1,
};

function buildStudents(prefix, count) {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      externalId: `${prefix}-aluno-${n}`,
      name: `Estudante sintético ${n}`,
    };
  });
}

export function rosterFor(escola) {
  return {
    institution: escola.institution,
    academicYear: escola.academicYear,
    classroom: escola.classroom,
    teacher: escola.teacher,
    managers: escola.managers,
    students: buildStudents(escola.institution.id, escola.studentCount),
  };
}

/** Provisiona as duas escolas sintéticas e devolve as credenciais criadas. */
export async function provisionPilotFixtures() {
  const { provisionPilotClass } = await import(
    "../../../src/modules/identity/provisioning/pilot-provisioning.ts"
  );

  await adminDb.from("missions").upsert(MISSION, { onConflict: "id" });

  const reports = {};
  for (const [chave, escola] of [["a", PILOT], ["b", OUTRA]]) {
    reports[chave] = await provisionPilotClass(adminDb, rosterFor(escola), {
      dryRun: false,
      actor: "cli:teste-do-piloto",
    });
  }
  return reports;
}

/** Mapa e-mail → senha temporária das contas criadas no provisionamento. */
export function credentialsFrom(report) {
  const map = new Map();
  for (const account of report.accounts) {
    if (account.temporaryPassword) map.set(account.email, account.temporaryPassword);
  }
  return map;
}

/**
 * Login REAL: passa pelo mesmo `verifyCredentials` do provider
 * Credentials (limitador, conta ativa, senha, perfil). Devolve o ator ou
 * `null`; quando entra, instala a sessão correspondente.
 */
export async function loginAs(email, password, options = {}) {
  const { verifyCredentials } = await import(
    "../../../src/modules/identity/authentication/verify-credentials.ts"
  );
  const actor = await verifyCredentials(email, password, options);
  if (!actor) {
    clearPilotSession();
    return null;
  }
  setPilotSession({
    user: {
      name: actor.name,
      email: actor.email,
      platformUserId: actor.platformUserId,
      institutionId: actor.institutionId,
      role: actor.role,
      credentialsVersion: actor.credentialsVersion,
      mustChangePassword: actor.mustChangePassword,
    },
  });
  return actor;
}

export function logout() {
  clearPilotSession();
}

/** Sessão arbitrária (para provar que adulterar claims não amplia acesso). */
export function forceSession(user) {
  setPilotSession({ user });
}

export async function resetPilotDatabase() {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: process.env.PILOT_TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      truncate mission_reviews, reflections, productions, mission_progress,
               mission_assignments, lessons, enrollments, students,
               classroom_teachers, teachers, profiles, users, classrooms,
               academic_years, subjects, institutions, missions, admin_audit_log,
               auth_login_attempts
      restart identity cascade;
    `);
  } finally {
    await client.end();
  }
}
