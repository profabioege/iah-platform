#!/usr/bin/env node
/**
 * Indicadores AGREGADOS da aula do piloto, lidos do banco (só leitura).
 *
 *   node scripts/pilot-metricas-aula.mjs --institution=inst-beryon \
 *     --turma=class-beryon-2026-1a --missao=01-a-fabrica-de-noticias \
 *     --inicio=2026-10-20T10:00:00-03:00 --fim=2026-10-20T10:50:00-03:00 \
 *     --confirm-project=<ref> [--out=C:\piloto\aula\metricas.json]
 *
 * Saída sem nome, e-mail ou texto de aluno: só contagens e tempos. A
 * presença física e os pedidos de ajuda vêm do registro manual da aula
 * (docs/piloto/05-registro-da-aula.md) — o banco não sabe quem faltou.
 */
import { writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { assertAuthorizedTarget } from "./pilot-target-guard.mjs";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const fail = (m) => {
  console.error(`✖ ${m}`);
  process.exit(1);
};
for (const n of ["institution", "turma", "missao", "inicio", "fim"]) if (!arg(n)) fail(`Informe --${n}.`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente.");
try {
  assertAuthorizedTarget(url, { confirmProject: arg("confirm-project"), operation: "ler os indicadores da aula" });
} catch (e) {
  fail(e.message);
}
const inicio = new Date(arg("inicio")).toISOString();
const fim = new Date(arg("fim")).toISOString();
const db = createClient(url, key, { auth: { persistSession: false } });

async function q(builder) {
  const { data, error } = await builder;
  if (error) fail(error.message);
  return data ?? [];
}

const matriculas = await q(
  db.from("enrollments").select("student_id").eq("institution_id", arg("institution")).eq("classroom_id", arg("turma")).eq("status", "active"),
);
const ids = matriculas.map((m) => m.student_id);
const alunos = ids.length ? await q(db.from("students").select("id, email").in("id", ids)) : [];
const emails = alunos.map((a) => a.email);
const tentativas = emails.length
  ? await q(db.from("auth_login_attempts").select("email, succeeded").in("email", emails).gte("attempted_at", inicio).lte("attempted_at", fim))
  : [];
const prods = ids.length
  ? await q(db.from("productions").select("student_id, started_at, delivered_at, ai_verification").eq("classroom_id", arg("turma")).eq("mission_id", arg("missao")).in("student_id", ids))
  : [];
const refl = ids.length
  ? await q(db.from("reflections").select("student_id, recorded_at").eq("classroom_id", arg("turma")).eq("mission_id", arg("missao")).in("student_id", ids))
  : [];
const revs = ids.length
  ? await q(db.from("mission_reviews").select("student_id, reviewed_at").eq("classroom_id", arg("turma")).eq("mission_id", arg("missao")).in("student_id", ids))
  : [];

const entraram = new Set(tentativas.filter((t) => t.succeeded).map((t) => t.email));
const falharam = new Set(tentativas.filter((t) => !t.succeeded).map((t) => t.email));
const semEntrarComFalha = [...falharam].filter((e) => !entraram.has(e)).length;
const minutos = prods
  .filter((p) => p.started_at && p.delivered_at)
  .map((p) => (new Date(p.delivered_at) - new Date(p.started_at)) / 60000)
  .sort((a, b) => a - b);
const pct = (v, p) => (v.length ? Math.round(v[Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1)] * 10) / 10 : null);
const reflRegistradas = new Set(refl.filter((r) => r.recorded_at).map((r) => r.student_id));
const concluidos = prods.filter((p) => p.delivered_at && reflRegistradas.has(p.student_id)).length;

const resultado = {
  janela: { inicio, fim },
  matriculados: ids.length,
  acessos: {
    alunosComLoginNaJanela: entraram.size,
    tentativasSemSucesso: tentativas.filter((t) => !t.succeeded).length,
    alunosQueTentaramENaoEntraram: semEntrarComFalha,
  },
  missao: {
    iniciaram: prods.filter((p) => p.started_at).length,
    producoesEntregues: prods.filter((p) => p.delivered_at).length,
    registrosDeUsoDaIA: prods.filter((p) => p.ai_verification).length,
    reflexoesRegistradas: reflRegistradas.size,
    concluiram: concluidos,
    devolutivasDoProfessor: revs.length,
  },
  tempoInicioAteEntregaMin: { amostras: minutos.length, p50: pct(minutos, 50), p90: pct(minutos, 90), max: minutos.length ? Math.round(minutos.at(-1) * 10) / 10 : null },
  ressalva: "Indicadores de uma aula. Presença, pedidos de ajuda e falhas vêm do registro manual.",
};
console.log(JSON.stringify(resultado, null, 2));
if (arg("out")) writeFileSync(arg("out"), `${JSON.stringify(resultado, null, 2)}\n`);
