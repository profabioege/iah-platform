#!/usr/bin/env node
/**
 * Gera uma turma SINTÉTICA no formato que o provisionamento espera.
 *
 *   node scripts/pilot-roster.mjs --students=45 --out=./turma.json
 *   node scripts/pilot-roster.mjs --students=3 --prefix=outra --out=./outra.json
 *
 * Os nomes são montados a partir de uma lista fechada de primeiros nomes
 * e sobrenomes comuns, combinados por índice — não correspondem a
 * pessoas, e nenhum deles é o sobrenome do fundador ou de sua família.
 * Não há e-mail pessoal de estudante: o login sai do identificador
 * escolar, como no piloto real.
 *
 * O arquivo gerado não contém senha nenhuma. As credenciais só nascem no
 * provisionamento, individuais, e vão para o arquivo que o operador
 * escolher.
 */

import { writeFileSync } from "node:fs";

const PRIMEIROS = [
  "Alice", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Henrique",
  "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro",
  "Queila", "Rafael", "Sofia", "Thiago", "Úrsula", "Vitor", "Yasmin", "Zeca",
];
const SOBRENOMES = [
  "Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Fonseca", "Gomes",
  "Hidalgo", "Iglesias", "Jardim", "Klein", "Lacerda", "Moraes", "Nunes",
  "Oliveira", "Paiva", "Quaresma", "Ribeiro", "Salgado", "Teixeira",
];

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function nomeSintetico(indice) {
  const primeiro = PRIMEIROS[indice % PRIMEIROS.length];
  const sobrenome = SOBRENOMES[Math.floor(indice / PRIMEIROS.length) % SOBRENOMES.length];
  return `${primeiro} ${sobrenome}`;
}

const total = Number(arg("students", "45"));
const prefixo = String(arg("prefix", "beryon"));
const saida = arg("out");
const turmaNome = String(arg("classroom", "1ª série A"));
const dominio = String(arg("domain", `${prefixo}.test`));

if (!Number.isInteger(total) || total < 1 || total > 500) {
  console.error("✖ --students precisa ser um inteiro entre 1 e 500.");
  process.exit(1);
}
if (!saida) {
  console.error("✖ Informe --out=<arquivo.json>.");
  process.exit(1);
}

const roster = {
  institution: {
    id: `inst-${prefixo}`,
    name: `Instituição sintética ${prefixo}`,
    slug: `inst-${prefixo}`,
    domain: dominio,
  },
  academicYear: {
    id: `ay-${prefixo}-2026`,
    label: "2026",
    startsOn: "2026-02-01",
    endsOn: "2026-12-15",
  },
  classroom: { id: `class-${prefixo}-1`, name: turmaNome, grade: "1ª série E.M." },
  teacher: {
    id: `teacher-${prefixo}-1`,
    name: `Professora ${nomeSintetico(3)}`,
    email: `professor@${dominio}`,
  },
  managers: [
    { id: `manager-${prefixo}-1`, name: `Gestor ${nomeSintetico(7)}`, email: `gestor@${dominio}` },
  ],
  students: Array.from({ length: total }, (_, i) => ({
    externalId: `2026-${prefixo}-${String(i + 1).padStart(3, "0")}`,
    name: nomeSintetico(i),
  })),
};

writeFileSync(saida, `${JSON.stringify(roster, null, 2)}\n`, "utf8");
console.log(
  `Turma sintética gravada em ${saida}: ${total} estudantes, ` +
    `instituição ${roster.institution.id}, turma ${roster.classroom.id}.`,
);
