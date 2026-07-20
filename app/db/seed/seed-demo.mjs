/**
 * IAH Educacional — Seed de demonstração do banco real (M22).
 *
 * Popula o cenário institucional fictício e neutro (Instituto Horizonte,
 * D-039) num projeto Supabase JÁ migrado (0001–0005). É um script
 * EXPLÍCITO, separado das migrations (que nunca inserem dados —
 * docs/PERSISTENCE.md): executá-lo é uma decisão deliberada do ambiente
 * de demonstração, nunca um efeito colateral.
 *
 * Uso (na pasta app/):
 *   IAH_DEMO_PASSWORD="<senha das contas demo>" node db/seed/seed-demo.mjs
 *
 * Variáveis exigidas (ver app/.env.example):
 *   NEXT_PUBLIC_SUPABASE_URL   — URL do projeto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  — service role (só servidor/CLI)
 *   IAH_DEMO_PASSWORD          — senha única das contas de demonstração
 *                                (nunca em código; nunca no cliente)
 *
 * Idempotente: usa upsert por id — reexecutar não duplica dados.
 * NÃO insere progresso/entregas fictícias: a jornada nasce limpa e os
 * dados pedagógicos reais são produzidos pelo uso.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.IAH_DEMO_PASSWORD;

if (!url || !serviceKey || !demoPassword) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e " +
      "IAH_DEMO_PASSWORD antes de executar o seed.",
  );
  process.exit(1);
}

// Mesmo formato de src/lib/password.ts (scrypt:1:salt:hash) — mudanças
// lá exigem mudança aqui.
function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:1:${salt.toString("base64")}:${hash.toString("base64")}`;
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const INSTITUTION_ID = "inst-horizonte";
const DOMAIN = "institutohorizonte.edu.br";
const YEAR_ID = "year-horizonte-2026";
const TEACHER_ID = "teacher-fabio";

const CLASSROOMS = [
  ["class-1em-a", "1º EM A", "1º ano E.M."],
  ["class-1em-b", "1º EM B", "1º ano E.M."],
  ["class-2em-a", "2º EM A", "2º ano E.M."],
  ["class-2em-b", "2º EM B", "2º ano E.M."],
  ["class-3em-a", "3º EM A", "3º ano E.M."],
];

async function upsert(table, rows, onConflict = "id") {
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) {
    throw new Error(`Falha em ${table}: ${error.message}`);
  }
  console.log(`✓ ${table} (${rows.length})`);
}

async function main() {
  await upsert("institutions", [
    {
      id: INSTITUTION_ID,
      slug: "horizonte",
      name: "Instituto Horizonte",
      domain: DOMAIN,
      timezone: "America/Sao_Paulo",
      status: "active",
    },
  ]);

  await upsert("academic_years", [
    {
      id: YEAR_ID,
      institution_id: INSTITUTION_ID,
      label: "2026",
      starts_on: "2026-02-02",
      ends_on: "2026-12-11",
      status: "active",
    },
  ]);

  // Identidades autenticáveis (Auth.js Credentials — hash scrypt).
  const passwordHash = hashPassword(demoPassword);
  const users = [
    {
      id: "user-diretor",
      institution_id: INSTITUTION_ID,
      name: "Direção Instituto Horizonte",
      email: `diretor@${DOMAIN}`,
      password_hash: passwordHash,
      status: "active",
    },
    {
      id: "user-fabio",
      institution_id: INSTITUTION_ID,
      name: "Fabio Ege",
      email: `fabio.ege@${DOMAIN}`,
      password_hash: passwordHash,
      status: "active",
    },
    ...Array.from({ length: 10 }, (_, i) => {
      const nn = String(i + 1).padStart(2, "0");
      return {
        id: `user-student-horizonte-${nn}`,
        institution_id: INSTITUTION_ID,
        name: `Aluno(a) de demonstração ${nn}`,
        email: `aluno${nn}@${DOMAIN}`,
        password_hash: passwordHash,
        status: "active",
      };
    }),
  ];
  await upsert("users", users);

  await upsert("profiles", [
    {
      id: "profile-diretor",
      user_id: "user-diretor",
      institution_id: INSTITUTION_ID,
      role: "administrador",
      status: "active",
    },
    {
      id: "profile-fabio",
      user_id: "user-fabio",
      institution_id: INSTITUTION_ID,
      role: "professor",
      status: "active",
    },
    ...Array.from({ length: 10 }, (_, i) => {
      const nn = String(i + 1).padStart(2, "0");
      return {
        id: `profile-student-${nn}`,
        user_id: `user-student-horizonte-${nn}`,
        institution_id: INSTITUTION_ID,
        role: "aluno",
        status: "active",
      };
    }),
  ]);

  await upsert("teachers", [
    {
      id: TEACHER_ID,
      institution_id: INSTITUTION_ID,
      name: "Fabio Ege",
      email: `fabio.ege@${DOMAIN}`,
      user_id: "user-fabio",
    },
  ]);

  await upsert(
    "classrooms",
    CLASSROOMS.map(([id, name, grade]) => ({
      id,
      institution_id: INSTITUTION_ID,
      academic_year_id: YEAR_ID,
      name,
      grade,
    })),
  );

  await upsert(
    "classroom_teachers",
    CLASSROOMS.map(([id]) => ({
      institution_id: INSTITUTION_ID,
      classroom_id: id,
      teacher_id: TEACHER_ID,
    })),
    "classroom_id,teacher_id",
  );

  const students = Array.from({ length: 10 }, (_, i) => {
    const nn = String(i + 1).padStart(2, "0");
    return {
      id: `student-horizonte-${nn}`,
      institution_id: INSTITUTION_ID,
      name: `Aluno(a) de demonstração ${nn}`,
      email: `aluno${nn}@${DOMAIN}`,
      user_id: `user-student-horizonte-${nn}`,
    };
  });
  await upsert("students", students);

  await upsert(
    "enrollments",
    students.map((student, i) => ({
      id: `enroll-horizonte-${String(i + 1).padStart(2, "0")}`,
      institution_id: INSTITUTION_ID,
      classroom_id: CLASSROOMS[Math.floor(i / 2)][0],
      student_id: student.id,
      status: "active",
      enrolled_at: "2026-02-02T08:00:00-03:00",
    })),
  );

  await upsert("subjects", [
    {
      id: "subject-iah",
      institution_id: INSTITUTION_ID,
      name: "Inteligência Artificial & Humanidades",
    },
  ]);

  // Metadados da Missão 01 (conteúdo continua em arquivo versionado).
  await upsert("missions", [
    {
      id: "01-a-fabrica-de-noticias",
      number: 1,
      title: "A Fábrica de Notícias",
      module: "Módulo 1 — O Auditor da Realidade",
      status: "published",
      version: 1,
    },
  ]);

  // Lesson da jornada demonstrativa (M21) — turma 2º EM A.
  await upsert("lessons", [
    {
      id: "lesson-horizonte-fabrica-noticias-2em-a",
      institution_id: INSTITUTION_ID,
      author: "Fabio Ege",
      grade: "2º ano E.M.",
      classroom_id: "class-2em-a",
      classroom_label: "2º EM A",
      estimated_minutes: 50,
      topic: "Desinformação e verificação de fontes",
      objective:
        "Investigar conteúdos potencialmente manipulados e justificar um veredito com evidências verificáveis.",
      planning_axis: "Módulo 1 — O Auditor da Realidade",
      bncc_competencies: [
        "Pensamento crítico e ceticismo saudável",
        "Verificação de fontes e checagem de evidências",
        "Uso ético e crítico da Inteligência Artificial",
        "Letramento midiático e digital",
      ],
      bncc_computacao_competencies: [],
      format: "investigacao",
      knowledge_document_ids: ["doc-como-uma-ia-escreve-noticia"],
      mission_id: "01-a-fabrica-de-noticias",
      assessment_notes:
        "Observar a qualidade das evidências, a justificativa do veredito e a clareza da reflexão final.",
      created_at: "2026-07-19T09:00:00-03:00",
      updated_at: "2026-07-19T09:00:00-03:00",
      saved_at: "2026-07-19T09:00:00-03:00",
    },
  ]);

  console.log("Seed de demonstração concluído.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
