/**
 * Importação da 1ª série A — validação prévia do CSV (sem banco).
 * Dados 100% sintéticos (domínio .example).
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const {
  maskEmail,
  normalizeClassLabel,
  parseClassCsv,
  precheckClassRows,
  studentIdFor,
  toPilotStudents,
} = await import("@/modules/identity/provisioning/class-csv-import.ts");

const expected = { className: "1ª série A", expectedTotal: 3, emailDomains: ["escola.example"] };
const header = "nome,email_institucional,turma";

function csv(...linhas) {
  return [header, ...linhas].join("\n");
}

const ok = [
  "Aluno Um,aluno.um@escola.example,1ª série A",
  "Aluna Dois,ALUNA.DOIS@escola.example ,1a Serie A",
  "Aluno Três,aluno.tres@escola.example,1A",
];

test("arquivo correto passa sem bloqueio", () => {
  const r = precheckClassRows(parseClassCsv(csv(...ok)), expected);
  assert.equal(r.total, 3);
  assert.equal(r.inAuthorizedClass, 3);
  assert.equal(r.blocking, false, JSON.stringify(r.issues));
  assert.equal(r.rows[1].email, "aluna.dois@escola.example", "e-mail normalizado");
});

test("ponto e vírgula, BOM e aspas são aceitos", () => {
  const text = "﻿nome;email_institucional;turma\n\"Silva; Ana\";ana@escola.example;1ª série A\n";
  const r = precheckClassRows(parseClassCsv(text), { ...expected, expectedTotal: 1 });
  assert.equal(r.blocking, false, JSON.stringify(r.issues));
  assert.equal(r.rows[0].nome, "Silva; Ana");
});

test("linha de outra turma bloqueia e é apontada", () => {
  const r = precheckClassRows(parseClassCsv(csv(ok[0], ok[1], "Aluno B,aluno.b@escola.example,1ª série B")), expected);
  assert.equal(r.outOfClass, 1);
  assert.ok(r.issues.some((i) => i.kind === "outra_turma" && i.blocking && i.lines[0] === 4));
});

test("e-mail ausente, inválido, repetido e de outro domínio bloqueiam", () => {
  const r = precheckClassRows(
    parseClassCsv(
      csv(
        "A,,1ª série A",
        "B,nao-e-email,1ª série A",
        "C,c@escola.example,1ª série A",
        "D,C@escola.example,1ª série A",
        "E,e@gmail.com,1ª série A",
      ),
    ),
    { ...expected, expectedTotal: 5 },
  );
  const kinds = new Set(r.issues.filter((i) => i.blocking).map((i) => i.kind));
  for (const k of ["email_ausente", "email_invalido", "email_repetido", "dominio_nao_autorizado"]) {
    assert.ok(kinds.has(k), `faltou ${k}`);
  }
  assert.equal(r.blocking, true);
});

test("total diferente da lista institucional bloqueia", () => {
  const r = precheckClassRows(parseClassCsv(csv(ok[0], ok[1])), expected);
  assert.ok(r.issues.some((i) => i.kind === "total_divergente" && i.blocking));
});

test("coluna extra (dado desnecessário) bloqueia; cabeçalho errado bloqueia", () => {
  const extra = precheckClassRows(parseClassCsv("nome,email_institucional,turma,cpf\nA,a@escola.example,1ª série A,000"), { ...expected, expectedTotal: 1 });
  assert.ok(extra.issues.some((i) => i.kind === "coluna_extra"));
  const ruim = precheckClassRows(parseClassCsv("aluno,email\nA,a@escola.example"), expected);
  assert.ok(ruim.issues.some((i) => i.kind === "cabecalho"));
});

test("sem domínio configurado não importa", () => {
  const r = precheckClassRows(parseClassCsv(csv(...ok)), { ...expected, emailDomains: [] });
  assert.ok(r.issues.some((i) => i.kind === "dominios_nao_configurados" && i.blocking));
});

test("homônimos geram aviso, não bloqueio", () => {
  const r = precheckClassRows(
    parseClassCsv(csv("Ana Lima,ana1@escola.example,1ª série A", "Ana Lima,ana2@escola.example,1ª série A", ok[2])),
    expected,
  );
  const aviso = r.issues.find((i) => i.kind === "nome_repetido");
  assert.ok(aviso && !aviso.blocking);
  assert.equal(r.blocking, false);
});

test("rótulo de turma: variações da 1ª A coincidem; B e 2ª não", () => {
  const a = normalizeClassLabel("1ª série A");
  for (const v of ["1a serie A", "1ª Série A", "1A", "1ª série A - Ensino Médio", "1º A"]) {
    assert.equal(normalizeClassLabel(v), a, v);
  }
  for (const v of ["1ª série B", "2ª série A", "1º ano A fundamental"]) {
    assert.notEqual(normalizeClassLabel(v), a, v);
  }
});

test("identificador do aluno é estável, sem e-mail em claro, e muda por instituição", () => {
  const id1 = studentIdFor("inst-x", "Aluno@Escola.example");
  assert.equal(id1, studentIdFor("inst-x", "aluno@escola.example"));
  assert.notEqual(id1, studentIdFor("inst-y", "aluno@escola.example"));
  assert.ok(!id1.includes("aluno@"));
  const alunos = toPilotStudents(parseClassCsv(csv(...ok)).rows, "inst-x");
  assert.equal(new Set(alunos.map((a) => a.externalId)).size, 3);
});

test("relatório mascara o e-mail", () => {
  assert.equal(maskEmail("maria.souza@escola.example"), "ma***@escola.example");
});
