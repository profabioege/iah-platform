/**
 * Carga do planejamento curricular da escola (D-055) — leitura da
 * planilha e conferências antes de gravar. A gravação contra o banco
 * real está em tests/pilot/school-plan.test.mjs.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { parseSchoolPlanCsv, buildSchoolPlanImport, gradeCodeOf } = await import(
  "@/modules/question-bank/seeds/school-plan-import.ts"
);

const bncc = JSON.parse(readFileSync(new URL("../db/reference/bncc-ensino-medio-2018.json", import.meta.url), "utf8"))
  .habilidades.map((h) => ({ code: h.codigo, area: h.area, componente: h.componente }));
const build = (csv) => {
  const { rows, problems } = parseSchoolPlanCsv(csv);
  const plan = buildSchoolPlanImport({ rows, bncc });
  return { ...plan, problems: [...problems, ...plan.problems] };
};

test("série em vários formatos", () => {
  for (const v of ["1", "1ª", "1ª série", "1a serie", "em1", "1º"]) assert.equal(gradeCodeOf(v), "em1", v);
  assert.equal(gradeCodeOf("3ª série"), "em3");
  assert.equal(gradeCodeOf("4ª"), null);
  assert.equal(gradeCodeOf("9º ano"), null);
});

test("planilha válida: lê ; ou , e aspas, normaliza código e componente", () => {
  const p = build(
    'serie;periodo;rotulo_periodo;componente;habilidade;observacao\n' +
      '1ª;1;1º bimestre;geografia;em13chs106;"Cartografia; dados"\n' +
      '1ª;2;;Matemática;EM13MAT101;\n',
  );
  assert.deepEqual(p.problems, []);
  assert.equal(p.entries.length, 2);
  assert.equal(p.entries[0].componentId, "comp-chs-geografia");
  assert.equal(p.entries[0].skillId, "bncc-em13chs106");
  assert.equal(p.entries[0].notes, "Cartografia; dados");
  assert.equal(p.entries[1].periodLabel, "2º período");
  assert.deepEqual(p.summary, [{ gradeCode: "em1", periods: 2, skills: 2, components: ["Geografia", "Matemática"] }]);
  const virgula = build("serie,periodo,componente,habilidade\n2,1,História,EM13CHS101\n");
  assert.deepEqual(virgula.problems, []);
  assert.equal(virgula.entries[0].gradeCode, "em2");
});

test("recusa código inexistente, área trocada, LP fora de Língua Portuguesa, período e série inválidos, repetição", () => {
  const p = build(
    "serie;periodo;componente;habilidade\n" +
      "1ª;1;História;EM13CHS999\n" +
      "1ª;1;Matemática;EM13CHS101\n" +
      "1ª;1;Arte;EM13LP01\n" +
      "1ª;13;História;EM13CHS101\n" +
      "5ª;1;História;EM13CHS101\n" +
      "1ª;1;Astronomia;EM13CNT101\n" +
      "1ª;1;História;EM13CHS101\n" +
      "1ª;1;historia;em13chs101\n",
  );
  const msgs = p.problems.map((x) => `${x.line}: ${x.problem}`);
  assert.ok(msgs.some((m) => /^2: .*EM13CHS999.*não encontrada/.test(m)));
  assert.ok(msgs.some((m) => /^3: EM13CHS101 é da área CHS/.test(m)));
  assert.ok(msgs.some((m) => /^4: EM13LP01 é habilidade de Língua Portuguesa/.test(m)));
  assert.ok(msgs.some((m) => /^5: Período "13"/.test(m)));
  assert.ok(msgs.some((m) => /^6: Série "5ª"/.test(m)));
  assert.ok(msgs.some((m) => /^7: Componente "Astronomia"/.test(m)));
  assert.ok(msgs.some((m) => /^9: Linha repetida/.test(m)));
  assert.equal(p.entries.length, 1, "só a linha 8 é válida");
});

test("modelo do repositório: linhas de EXEMPLO não são carregadas por engano", () => {
  const p = build(readFileSync(new URL("../db/reference/modelo-planejamento-escolar.csv", import.meta.url), "utf8"));
  assert.equal(p.entries.length, 0);
  assert.ok(p.problems.length >= 4 && p.problems.every((x) => /EXEMPLO/.test(x.problem)));
});

test("planilha vazia ou sem cabeçalho", () => {
  assert.match(build("").problems[0].problem, /vazia/);
  assert.match(build("a;b;c\n1;2;3").problems[0].problem, /Cabeçalho sem as colunas/);
});
