#!/usr/bin/env node
/**
 * Dados SINTÉTICOS do banco de questões para a homologação local
 * (`npm run test:homologacao`). Chamado pelo `run-pilot-homologation.mjs`
 * depois do provisionamento das turmas; nunca toca banco remoto.
 *
 *   node --experimental-strip-types scripts/homologacao-seed-banco-questoes.mjs --out=<arquivo.json>
 *
 * Monta, pelo MESMO código de carga dos scripts de produção:
 *  - recorte curricular provisório da turma "beryon" (1ª série) + 4 itens
 *    sintéticos de Matemática aprovados (banco para o circuito adaptativo);
 *  - Catálogo IAH sintético (inquilino `kind = 'catalogo'`, contas de
 *    autoria e de gestão criadas pelo provisionamento real);
 *  - referências BNCC e Matriz do Enem;
 *  - acervo autoral sintético (`tests/e2e/fixtures/acervo-sintetico.md`),
 *    em revisão;
 *  - item sintético no formato do Enem com figura
 *    (`tests/e2e/fixtures/enem-sintetico/`), em rascunho sem resolução.
 *
 * Grava em `--out` as contas do catálogo (senhas iniciais, só para esta
 * execução) e os identificadores que as suítes usam.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { provisionPilotClass } from "../src/modules/identity/provisioning/pilot-provisioning.ts";
import {
  applyCatalogImport,
  buildCatalogImportPlan,
  loadCatalogReferences,
  parseItensProvaCsv,
} from "../src/modules/question-bank/catalog/enem-import.ts";
import {
  applyAuthoredImport,
  buildAuthoredImportPlan,
  parseAuthoredMarkdown,
} from "../src/modules/question-bank/catalog/iah-authored-import.ts";
import { loadProvisionalCut, loadReferenceCatalog } from "../src/modules/question-bank/seeds/recorte-provisorio.ts";
import { assertAuthorizedTarget } from "./pilot-target-guard.mjs";

const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!out || !url || !serviceRole) {
  console.error("✖ Uso: --out=<arquivo>, com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}
// Só banco local descartável: este script não aceita confirmação de projeto remoto.
const alvo = assertAuthorizedTarget(url, { operation: "semear a homologação local" });
if (alvo.escopo !== "local") {
  console.error("✖ Semeadura sintética só em banco local.");
  process.exit(1);
}

const db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const root = resolve(import.meta.dirname, "..");
const fixtures = join(root, "tests/e2e/fixtures");
const reference = join(root, "db/reference");
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const check = (step, { error }) => {
  if (error) throw new Error(`${step}: ${error.message}`);
};
const one = async (step, query) => {
  const { data, error } = await query;
  if (error || !data) throw new Error(`${step}: ${error?.message ?? "não encontrado"}`);
  return data;
};

// ------------------------------------------------------------------
// 1. Escola "beryon": recorte provisório + itens de MAT para o circuito
// ------------------------------------------------------------------
const ESCOLA = "inst-beryon";
const TURMA = "class-beryon-1";
const userOf = async (role) =>
  (await one(`conta ${role}`, db.from("profiles").select("user_id").eq("institution_id", ESCOLA).eq("role", role).limit(1).single())).user_id;
const professor = await userOf("professor");
const gestor = await userOf("administrador");
const anoLetivo = (await one("ano letivo", db.from("classrooms").select("academic_year_id").eq("id", TURMA).single())).academic_year_id;

check("série da turma", await db.from("classrooms").update({ grade_code: "em1" }).eq("id", TURMA));
await loadReferenceCatalog(db);
await loadProvisionalCut(db, { institutionId: ESCOLA, academicYearId: anoLetivo, authorUserId: professor, reviewerUserId: gestor });
// Sequência do circuito: Matemática primeiro.
check("ordem do plano", await db.from("school_curriculum_plans").update({ period_order: 2 }).eq("institution_id", ESCOLA).neq("skill_id", "bncc-em13mat101"));

for (const [i, dificuldade] of ["facil", "media", "media", "dificil"].entries()) {
  const code = `homolog-mat-${i + 1}`;
  const q = `q:${ESCOLA}:${code}`;
  const v = `qv:${ESCOLA}:${code}:1`;
  const { data: existente } = await db.from("question_versions").select("id").eq("id", v).maybeSingle();
  if (existente) continue;
  check(`questão ${code}`, await db.from("questions").insert({ id: q, institution_id: ESCOLA, component_id: "comp-mat-matematica", skill_id: "bncc-em13mat101", created_by: professor }));
  check(`versão ${code}`, await db.from("question_versions").insert({
    id: v, institution_id: ESCOLA, question_id: q, version: 1,
    stem: `Questão sintética ${i + 1} da homologação: uma grandeza dobra a cada hora a partir de 3. Quanto vale após ${i + 2} horas?`,
    options: ["A", "B", "C", "D"].map((key, k) => ({ key, text: String(3 * 2 ** (i + 2) + k * 5) })),
    editorial_difficulty: dificuldade, source_id: `src:${ESCOLA}:sinteticos-recorte-provisorio`,
    authorship: "Homologação local — item sintético", created_by: professor,
  }));
  check(`gabarito ${code}`, await db.from("question_version_keys").insert({ version_id: v, institution_id: ESCOLA, answer_key: "A", resolution: `3 × 2^${i + 2}.` }));
  check(`envio ${code}`, await db.from("question_versions").update({ status: "em_revisao" }).eq("id", v));
  check(`revisão ${code}`, await db.from("question_reviews").insert({
    id: `rev:${v}`, institution_id: ESCOLA, version_id: v, reviewer_id: gestor, decision: "aprovada",
    checklist: { gabarito: true, habilidade: true, direitos: true, linguagem: true }, comment: "Item sintético da homologação.",
  }));
}

// ------------------------------------------------------------------
// 2. Catálogo IAH sintético
// ------------------------------------------------------------------
const CAT = "iah-catalogo-homolog";
const relatorio = await provisionPilotClass(db, {
  institution: { id: CAT, name: "Catálogo IAH (homologação)", slug: "catalogo-iah-homolog", domain: "catalogo-homolog.test" },
  academicYear: { id: "ay-catalogo-homolog", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
  classroom: { id: "class-catalogo-homolog", name: "Equipe editorial", grade: "—" },
  teacher: { id: "teacher-catalogo-homolog", name: "Autoria IAH (sintética)", email: "autoria@catalogo-homolog.test" },
  managers: [{ id: "manager-catalogo-homolog", name: "Gestão IAH (sintética)", email: "gestao@catalogo-homolog.test" }],
  students: [{ externalId: "catalogo-homolog-aluno-01", name: "Estudante sintético" }],
}, { dryRun: false, actor: "cli:homologacao-local" });
check("catálogo", await db.from("institutions").update({ kind: "catalogo" }).eq("id", CAT));
const autoria = (await one("autoria", db.from("users").select("id").eq("email", "autoria@catalogo-homolog.test").single())).id;

const bncc = await readJson(join(reference, "bncc-ensino-medio-2018.json"));
const matrizes = [await readJson(join(reference, "matriz-enem-2009-cn-mt.json")), await readJson(join(reference, "matriz-enem-2009-lc-ch.json"))];
await loadCatalogReferences(db, { bncc, matriz: matrizes });
const conhecidas = new Set((await one("habilidades", db.from("curriculum_skills").select("id"))).map((r) => r.id));

const acervo = parseAuthoredMarkdown(await readFile(join(fixtures, "acervo-sintetico.md"), "utf8"), "acervo-sintetico.md");
const planoAcervo = buildAuthoredImportPlan({
  files: [{ arquivo: "acervo-sintetico.md", items: acervo.items }],
  proposals: (await readJson(join(fixtures, "acervo-sintetico-classificacao.json"))).itens,
  catalogInstitutionId: CAT,
  authorUserId: autoria,
  knownSkillIds: conhecidas,
});
if (acervo.problems.length || planoAcervo.problems.length) {
  throw new Error(`acervo sintético com problemas: ${JSON.stringify([...acervo.problems, ...planoAcervo.problems])}`);
}
await applyAuthoredImport(db, planoAcervo);

const enemDir = join(fixtures, "enem-sintetico");
const planoEnem = buildCatalogImportPlan({
  extraction: await readJson(join(enemDir, "itens.json")),
  microdados: parseItensProvaCsv(await readFile(join(enemDir, "ITENS_PROVA_SINTETICO.csv"), "utf8")),
  suggestions: { origem: "sugestao_ia", aviso: "sintético", sugestoes: [{ numero: 91, bncc: "EM13CNT101", confianca: "media", motivo: "correspondência sintética" }] },
  catalogInstitutionId: CAT,
  authorUserId: autoria,
});
await applyCatalogImport(db, planoEnem, async (arquivo) => new Uint8Array(await readFile(join(enemDir, arquivo))));
// O item do Enem precisa da BNCC confirmada para entrar em lista pela habilidade planejada.
check("sugestão confirmada", await db.from("question_skill_suggestions")
  .update({ status: "confirmada", reviewed_by: (await one("gestão", db.from("users").select("id").eq("email", "gestao@catalogo-homolog.test").single())).id, reviewed_at: new Date().toISOString() })
  .eq("question_id", planoEnem.items[0].questionId));

await writeFile(out, JSON.stringify({
  institutionId: CAT,
  contas: relatorio.accounts
    .filter((a) => a.temporaryPassword)
    .map((a) => ({ perfil: a.kind, referencia: a.reference, email: a.email, senha: a.temporaryPassword })),
  acervo: Object.fromEntries(planoAcervo.items.map((i) => [i.codigo, i.versionId])),
  enem: { versionId: planoEnem.items[0].versionId, sourceId: planoEnem.source.id },
}), "utf8");
console.log(`✔ Banco de questões sintético semeado (catálogo ${CAT}, ${planoAcervo.items.length} itens autorais, 1 item Enem).`);
