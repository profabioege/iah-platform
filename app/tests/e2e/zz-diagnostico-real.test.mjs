/**
 * Primeiro diagnóstico NÃO demonstrativo (D-055) — pela rede, sem mudar
 * código: quando a escola carrega o planejamento validado e o banco tem o
 * mínimo de questões revisadas (fonte não sintética) por habilidade, o
 * painel mostra "Pronto" e o diagnóstico nasce sem a marca demonstrativa.
 *
 * Roda por último (prefixo zz): aposenta o planejamento provisório da
 * escola "beryon", do qual as outras suítes dependem. Usa as questões do
 * Catálogo IAH sintético aprovadas pela suíte catalogo-e-revisao (revisor
 * ≠ autor, fonte verificada) — ambiente local efêmero, dados sintéticos.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { before } from "node:test";

import { textoVisivel } from "./support/http-client.mjs";
import { autenticar } from "./support/sessoes.mjs";
import { TURMA, ambiente, conta, consultarBanco } from "./support/ambiente.mjs";

const SKILL = "bncc-em13cnt101";
const PAINEL = `/professor/diagnostico?turma=${encodeURIComponent(TURMA.classroomId)}`;
let professor;

function carga(args) {
  return new Promise((ok, fail) => {
    let saida = "";
    const child = spawn(process.execPath, ["--experimental-strip-types", "scripts/planejamento-escolar-carga.mjs", ...args], {
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: ambiente.supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: ambiente.serviceRoleKey },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (d) => (saida += d));
    child.stderr.on("data", (d) => (saida += d));
    child.on("close", (code) => (code === 0 ? ok(saida) : fail(new Error(`carga saiu com ${code}\n${saida}`))));
  });
}

before(async () => {
  professor = await autenticar(conta(TURMA, "professor"));
});

test("1. pré-condição: há pelo menos 3 questões revisadas, de fonte não sintética, para EM13CNT101", async () => {
  const [{ n }] = await consultarBanco(
    `select count(distinct v.id)::int as n
       from question_versions v
       join questions q on q.id = v.question_id
       join content_sources s on s.id = v.source_id
       left join question_skill_suggestions g on g.question_id = q.id and g.status = 'confirmada'
      where v.status = 'aprovada' and not s.synthetic and (q.skill_id = $1 or g.skill_id = $1)`,
    [SKILL],
  );
  assert.ok(n >= 3, `esperava ≥ 3 questões revisadas de EM13CNT101 (aprovadas pela suíte do catálogo); há ${n}`);
});

test("2. a escola carrega o planejamento validado: simulação primeiro, depois gravação; o provisório é aposentado", async () => {
  const [{ academic_year_id }] = await consultarBanco("select academic_year_id from classrooms where id = $1", [TURMA.classroomId]);
  const dir = mkdtempSync(join(tmpdir(), "iah-planejamento-"));
  const csv = join(dir, "planejamento.csv");
  writeFileSync(csv, "serie;periodo;rotulo_periodo;componente;habilidade;observacao\n1ª;1;1º bimestre;Física;EM13CNT101;\n", "utf8");
  const base = [`--arquivo=${csv}`, `--escola=${TURMA.institutionId}`, `--ano-letivo=${academic_year_id}`, "--validado-pela-escola", "--substituir-provisorio"];
  assert.match(await carga(base), /Simulação — nada foi gravado/);
  // No arranque da homologação as habilidades não-MAT do recorte estão no
  // período 2; a planilha põe EM13CNT101 no período 1 → linha nova, e as 4
  // provisórias saem (aposentadas, não apagadas).
  assert.match(await carga([...base, "--execute"]), /1 linha\(s\) gravada\(s\); 4 provisória\(s\) aposentada\(s\)/);
  const plano = await consultarBanco(
    "select skill_id, status from school_curriculum_plans where institution_id = $1 and grade_code = 'em1' and status <> 'retired'",
    [TURMA.institutionId],
  );
  assert.deepEqual(plano, [{ skill_id: "bncc-em13cnt101", status: "approved" }]);
  const [{ aposentadas }] = await consultarBanco(
    "select count(*)::int as aposentadas from school_curriculum_plans where institution_id = $1 and status = 'retired'",
    [TURMA.institutionId],
  );
  assert.equal(aposentadas, 4, "o provisório continua registrado, com status retired");
});

test("3. o painel do professor mostra 'Pronto para diagnóstico real'", async () => {
  const texto = textoVisivel((await professor.html(PAINEL)).html);
  assert.match(texto, /Pronto para diagnóstico real/);
  assert.doesNotMatch(texto, /Planejamento provisório em/);
});

test("4. o diagnóstico criado nasce sem a marca demonstrativa e sem currículo provisório", async () => {
  const envio = await professor.enviarFormularioCom(PAINEL, 'name="habilidades"', {
    titulo: "Diagnóstico real — homologação",
    habilidades: [SKILL],
  });
  assert.equal(envio.status, 303);
  const [d] = await consultarBanco(
    "select id, demonstrative, curriculum_provisional from diagnostics where title = $1",
    ["Diagnóstico real — homologação"],
  );
  assert.ok(d, "diagnóstico criado");
  assert.equal(d.demonstrative, false, "o banco não encontrou questão de fonte sintética");
  assert.equal(d.curriculum_provisional, false);
  const [{ sinteticas }] = await consultarBanco(
    `select count(*)::int as sinteticas from diagnostic_blocks b
       join practice_list_items i on i.list_id = b.list_id
       join question_versions v on v.id = i.question_version_id
       join content_sources s on s.id = v.source_id
      where b.diagnostic_id = $1 and s.synthetic`,
    [d.id],
  );
  assert.equal(sinteticas, 0);
  const texto = textoVisivel((await professor.html(`${PAINEL}&diagnostico=${encodeURIComponent(d.id)}`)).html);
  assert.doesNotMatch(texto, /Diagnóstico demonstrativo\./);
});
