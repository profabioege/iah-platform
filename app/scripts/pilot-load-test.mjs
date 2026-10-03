#!/usr/bin/env node
/**
 * Ensaio de carga do piloto — 45 alunos (e 65, para medir margem).
 *
 * ESCOPO HONESTO DESTA MEDIÇÃO: ela exercita o caminho de dados completo
 * (autenticação real, Server-Actions-equivalentes, PostgREST, PostgreSQL)
 * numa máquina local. Ela NÃO mede a hospedagem: não há rede da escola,
 * nem cold start de função, nem limite de conexões do provedor. O número
 * que vale para decidir o piloto é o do ensaio em homologação, com
 * configuração equivalente à de produção (ver docs/operations/
 * homologacao-piloto-beryon.md).
 *
 * Limites declarados ANTES da execução (o ensaio passa ou falha por eles):
 *   - erros de escrita confirmada: 0
 *   - integridade: 1 produção entregue e 1 reflexão por aluno, sem mistura
 *   - p95 de login: até 2000 ms
 *   - p95 de gravação (rascunho/entrega/reflexão): até 1500 ms
 *
 * Fases, na ordem de uma aula real:
 *   1. entrada concentrada — todos entram na mesma janela;
 *   2. atividade — leitura e rascunhos intercalados;
 *   3. pico final — entrega + reflexão de todos ao mesmo tempo;
 *   4. acompanhamento — o professor lê a turma durante as fases 2 e 3.
 *
 * Uso:
 *   node --experimental-strip-types scripts/pilot-load-test.mjs --students=45
 *   node --experimental-strip-types scripts/pilot-load-test.mjs --students=65
 */

// Mesma resolução de módulo dos testes do piloto (alias @/… e stubs do
// runtime do Next). O ensaio usa o código real da aplicação.
import "../tests/pilot/support/pilot-hooks.mjs";

import { createHmac } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { startPilotDatabase, stopPilotDatabase } from "./pilot-db-env.mjs";

const LIMITES = {
  errosDeEscrita: 0,
  p95LoginMs: 2000,
  p95GravacaoMs: 1500,
};

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const TOTAL = Number(arg("students", "45"));
const RASCUNHOS_POR_ALUNO = Number(arg("drafts", "3"));
/**
 * Janela de entrada, em segundos. 0 = todos no mesmo instante (pior caso
 * sintético). Numa aula real a turma entra ao longo de alguns minutos —
 * `--entry-window=60` mede esse cenário.
 */
const JANELA_ENTRADA_S = Number(arg("entry-window", "0"));
/** Todos os alunos saem do mesmo IP — é assim numa sala de aula. */
const IP_DA_ESCOLA = "203.0.113.77";

function base64url(value) {
  return Buffer.from(value).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function mintRoleToken(role, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({ role, iat: now, exp: now + 7200 }));
  const sig = base64url(createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

function percentil(valores, p) {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const idx = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return Math.round(ordenados[idx]);
}

function resumo(nome, amostras, erros) {
  return {
    fase: nome,
    amostras: amostras.length,
    erros,
    p50: percentil(amostras, 50),
    p95: percentil(amostras, 95),
    max: amostras.length ? Math.round(Math.max(...amostras)) : 0,
  };
}

async function medir(amostras, fn) {
  const inicio = performance.now();
  try {
    const resultado = await fn();
    amostras.push(performance.now() - inicio);
    return { ok: true, resultado };
  } catch (error) {
    amostras.push(performance.now() - inicio);
    return { ok: false, error };
  }
}

async function main() {
  let db = null;
  const iniciadoEm = Date.now();
  try {
    console.log(`Subindo ambiente efêmero para ensaio com ${TOTAL} estudantes...`);
    db = await startPilotDatabase();

    process.env.IAH_AUTH_MODE = "supabase";
    process.env.AUTH_SECRET = "auth-secret-descartavel-do-ensaio";
    process.env.NEXT_PUBLIC_SUPABASE_URL = db.supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = mintRoleToken("service_role", db.jwtSecret);
    process.env.SUPABASE_JWT_SECRET = db.jwtSecret;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = mintRoleToken("anon", db.jwtSecret);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );

    const { provisionPilotClass } = await import(
      "../src/modules/identity/provisioning/pilot-provisioning.ts"
    );
    const { verifyCredentials } = await import(
      "../src/modules/identity/authentication/verify-credentials.ts"
    );
    const { createDatabaseRepositories } = await import(
      "../src/modules/platform/infrastructure/database/database-repositories.ts"
    );
    const { getScopedDatabaseClient } = await import(
      "../src/modules/platform/infrastructure/database/scoped-client.ts"
    );
    const { createLearningCycleService } = await import(
      "../src/modules/platform/services/learning-cycle-service.ts"
    );
    const { createMissionPublishingService } = await import(
      "../src/modules/platform/services/mission-publishing-service.ts"
    );

    const institutionId = "inst-carga";
    const classroomId = "class-carga";
    const missionId = "missao-carga";
    const domain = "carga.test";

    await admin.from("missions").upsert(
      { id: missionId, number: 1, title: "Missão do ensaio", module: "Ensaio", status: "published", version: 1 },
      { onConflict: "id" },
    );

    const roster = {
      institution: { id: institutionId, name: "Colégio do Ensaio", slug: "colegio-ensaio", domain },
      academicYear: { id: "ay-carga", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
      classroom: { id: classroomId, name: "Turma do ensaio", grade: "1ª série E.M." },
      teacher: { id: "teacher-carga", name: "Professor(a) do ensaio", email: `professor@${domain}` },
      managers: [{ id: "manager-carga", name: "Gestão do ensaio", email: `gestor@${domain}` }],
      students: Array.from({ length: TOTAL }, (_, i) => ({
        externalId: `aluno-carga-${String(i + 1).padStart(3, "0")}`,
        name: `Estudante de ensaio ${i + 1}`,
      })),
    };

    console.log("Provisionando turma sintética...");
    const provisionamento = await provisionPilotClass(admin, roster, {
      dryRun: false,
      actor: "cli:ensaio-de-carga",
    });
    if (provisionamento.summary.failed > 0) {
      throw new Error("Provisionamento do ensaio falhou — ensaio abortado.");
    }
    const senhas = new Map(
      provisionamento.accounts
        .filter((a) => a.temporaryPassword)
        .map((a) => [a.email, a.temporaryPassword]),
    );

    const repositoriosDe = async (ator) =>
      createDatabaseRepositories(
        await getScopedDatabaseClient({
          institutionId,
          role: ator.role,
          userId: ator.platformUserId,
          teacherId: ator.teacherId ?? null,
          studentId: ator.studentId ?? null,
        }),
      );

    // Professor publica a missão antes da aula.
    const professor = await verifyCredentials(`professor@${domain}`, senhas.get(`professor@${domain}`), {
      origin: IP_DA_ESCOLA,
    });
    const professorAtor = { ...professor, teacherId: "teacher-carga", studentId: null };
    await createMissionPublishingService(await repositoriosDe(professorAtor)).publish({
      institutionId,
      classroomId,
      missionId,
      lessonId: null,
    });

    const metricas = { login: [], gravacao: [], leituraProfessor: [] };
    const erros = { login: 0, gravacao: 0, leituraProfessor: 0 };

    // ---------------------------------------------------------- fase 1
    console.log("Fase 1 — entrada concentrada (todos ao mesmo tempo, mesmo IP)...");
    const sessoes = await Promise.all(
      roster.students.map(async (aluno, indice) => {
        const email = `aluno.${aluno.externalId.replace(/[^a-z0-9]/g, "")}@${domain}`;
        if (JANELA_ENTRADA_S > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.round((indice / TOTAL) * JANELA_ENTRADA_S * 1000)),
          );
        }
        const r = await medir(metricas.login, () =>
          verifyCredentials(email, senhas.get(email), { origin: IP_DA_ESCOLA }),
        );
        if (!r.ok || !r.resultado) {
          erros.login += 1;
          return null;
        }
        return { ator: { ...r.resultado, studentId: aluno.externalId, teacherId: null }, aluno };
      }),
    );
    const ativos = sessoes.filter(Boolean);

    // ---------------------------------------------------------- fase 4 (paralela)
    let acompanhando = true;
    const acompanhamento = (async () => {
      while (acompanhando) {
        const r = await medir(metricas.leituraProfessor, async () => {
          const repos = await repositoriosDe(professorAtor);
          return repos.productions.listByClassroomMission(
            institutionId,
            classroomId,
            missionId,
          );
        });
        if (!r.ok) erros.leituraProfessor += 1;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    })();

    // ---------------------------------------------------------- fase 2
    console.log(`Fase 2 — atividade (${RASCUNHOS_POR_ALUNO} rascunhos por aluno)...`);
    await Promise.all(
      ativos.map(async ({ ator, aluno }, indice) => {
        const cycle = createLearningCycleService(await repositoriosDe(ator));
        const escopo = { institutionId, classroomId, studentId: aluno.externalId, missionId };
        // Entrada escalonada, como numa sala real.
        await new Promise((r) => setTimeout(r, (indice % 10) * 120));
        const inicio = await medir(metricas.gravacao, () => cycle.startMission(escopo));
        if (!inicio.ok) erros.gravacao += 1;
        for (let i = 0; i < RASCUNHOS_POR_ALUNO; i += 1) {
          const r = await medir(metricas.gravacao, () =>
            cycle.saveProductionDraft(escopo, `rascunho ${i + 1} de ${aluno.externalId}`),
          );
          if (!r.ok) erros.gravacao += 1;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }),
    );

    // ---------------------------------------------------------- fase 3
    console.log("Fase 3 — pico de envio (entrega + reflexão de todos)...");
    await Promise.all(
      ativos.map(async ({ ator, aluno }) => {
        const cycle = createLearningCycleService(await repositoriosDe(ator));
        const escopo = { institutionId, classroomId, studentId: aluno.externalId, missionId };
        for (const passo of [
          () => cycle.saveProductionDraft(escopo, `texto final de ${aluno.externalId}`),
          () => cycle.setProductionDelivered(escopo, true),
          () => cycle.saveReflectionDraft(escopo, `reflexão de ${aluno.externalId}`),
          () => cycle.setReflectionRecorded(escopo, true),
        ]) {
          const r = await medir(metricas.gravacao, passo);
          if (!r.ok) erros.gravacao += 1;
        }
      }),
    );

    acompanhando = false;
    await acompanhamento;

    // ---------------------------------------------------------- integridade
    const { data: producoes } = await admin
      .from("productions")
      .select("student_id, status, content")
      .eq("classroom_id", classroomId);
    const { data: reflexoes } = await admin
      .from("reflections")
      .select("student_id, text")
      .eq("classroom_id", classroomId);

    const entregues = (producoes ?? []).filter((p) => p.status === "delivered");
    const duplicadas = (producoes ?? []).length - new Set((producoes ?? []).map((p) => p.student_id)).size;
    const trocadas = (producoes ?? []).filter((p) => !p.content.includes(p.student_id)).length;

    const integridade = {
      alunos: TOTAL,
      logins: ativos.length,
      producoesEntregues: entregues.length,
      reflexoes: (reflexoes ?? []).length,
      linhasDuplicadas: duplicadas,
      conteudoTrocadoEntreAlunos: trocadas,
    };

    const relatorio = [
      resumo("login (entrada concentrada)", metricas.login, erros.login),
      resumo("gravações do aluno", metricas.gravacao, erros.gravacao),
      resumo("acompanhamento do professor", metricas.leituraProfessor, erros.leituraProfessor),
    ];

    console.log("\n== Ensaio local — resultado");
    console.table(relatorio);
    console.log("Integridade:", integridade);
    console.log(`Duração total: ${Math.round((Date.now() - iniciadoEm) / 1000)}s`);
    console.log("Limites declarados:", LIMITES);
    console.log(
      `Cenário: ${TOTAL} estudantes · janela de entrada ${JANELA_ENTRADA_S}s · ` +
        `${RASCUNHOS_POR_ALUNO} rascunhos por aluno · mesmo IP (${IP_DA_ESCOLA})`,
    );

    const falhas = [];
    if (erros.login + erros.gravacao > LIMITES.errosDeEscrita) {
      falhas.push(`erros: ${erros.login + erros.gravacao}`);
    }
    if (integridade.producoesEntregues !== TOTAL) falhas.push("entregas incompletas");
    if (integridade.reflexoes !== TOTAL) falhas.push("reflexões incompletas");
    if (integridade.linhasDuplicadas !== 0) falhas.push("linhas duplicadas");
    if (integridade.conteudoTrocadoEntreAlunos !== 0) falhas.push("conteúdo trocado entre alunos");
    const p95Login = percentil(metricas.login, 95);
    const p95Gravacao = percentil(metricas.gravacao, 95);
    if (p95Login > LIMITES.p95LoginMs) falhas.push(`p95 de login ${p95Login}ms`);
    if (p95Gravacao > LIMITES.p95GravacaoMs) falhas.push(`p95 de gravação ${p95Gravacao}ms`);

    if (falhas.length > 0) {
      console.error(`\n✖ Ensaio REPROVADO pelos limites declarados: ${falhas.join("; ")}`);
      process.exitCode = 1;
    } else {
      console.log("\n✔ Ensaio local dentro dos limites declarados.");
      console.log(
        "Lembrete: isto NÃO mede a hospedagem. O ensaio que decide o piloto " +
          "roda em homologação, com configuração equivalente à de produção.",
      );
    }
  } catch (error) {
    console.error(`✖ ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  } finally {
    await stopPilotDatabase(db);
  }
}

await main();
