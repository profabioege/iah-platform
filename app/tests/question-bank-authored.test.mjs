/**
 * Acervo autoral IAH (D-052) — regras puras: leitura dos dois formatos de
 * arquivo, conversão para marcacao_v2 (tabelas), plano de carga e
 * devolutiva por alternativa na devolutiva automática. Itens 100%
 * SINTÉTICOS (nenhuma questão real do acervo no repositório).
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { parseAuthoredMarkdown, buildAuthoredImportPlan } = await import(
  "@/modules/question-bank/catalog/iah-authored-import"
);
const { parseBlocks, markdownToMarkupV2 } = await import("@/modules/question-bank/domain/markup");
const { buildAttemptReport } = await import("@/modules/question-bank/domain/report");

const devolutivas = (correta) =>
  ["A", "B", "C", "D", "E"].map((l) => `**${l} — ${l === correta ? "correta" : "incorreta"}:** Motivo sintético ${l}.`).join("\n\n");

const ACERVO_01 = `# Acervo sintético 01

---

## Questão 01 — Matemática

**ID:** IAH-EM-MT-901

Enunciado sintético com tabela:

| x | y |
| --- | --- |
| 1 | 2 |
| 3 | 6 |

Qual a razão & a regra?

**A)** y = 2x

**B)** y = x + 1

**C)** y = 3x

**D)** y = x

**E)** y = x²

**Gabarito: A.**

### Devolutivas

${devolutivas("A")}

---

## Questão 02 — Linguagens

**ID:** IAH-EM-LC-902

Enunciado sem gabarito coerente.

**A)** um

**B)** dois

**C)** três

**D)** quatro

**E)** cinco

**Gabarito: B.**

### Devolutivas

${devolutivas("C")}
`;

const ACERVO_02 = `# Acervo sintético 02

## IAH-EM-CH-903 — Título sintético

**Área:** Ciências Humanas · **Série sugerida:** 2ª · **Versão:** 1.0.0

Contexto sintético.

Pergunta sintética?

**A)** alfa

**B)** beta

**C)** gama

**D)** delta

**E)** épsilon

**Gabarito: C.**

### Devolutivas por alternativa

**A — incorreta:** Motivo A.

**B — incorreta:** Motivo B.

**C — correta:** Explicação da correta. Habilidade trabalhada (CH-H14): Comparar pontos de vista sintéticos.

**D — incorreta:** Motivo D.

**E — incorreta:** Motivo E.

**BNCC:** EM13CHS101. Associação editorial por recorte: Recorte sintético.

**Referência histórica:** [Documento sintético](https://exemplo.test/doc) — Nota sintética.

---
`;

test("acervo 01: lê itens, tabela e devolutivas; acusa devolutiva 'correta' ≠ gabarito", () => {
  const { items, problems } = parseAuthoredMarkdown(ACERVO_01, "acervo-01.md");
  assert.deepEqual(items.map((i) => i.codigo), ["IAH-EM-MT-901"]);
  const mt = items[0];
  assert.equal(mt.area, "MT");
  assert.equal(mt.gabarito, "A");
  assert.equal(mt.options.length, 5);
  assert.equal(mt.options[4].text, "y = x²");
  assert.match(mt.stem, /\| 3 \| 6 \|/);
  assert.equal(mt.bncc, null);
  assert.deepEqual(problems, [{ codigo: "IAH-EM-LC-902", problema: 'devolutiva "correta" (C) ≠ gabarito (B)' }]);
});

test("acervo 02: série, versão, BNCC do autor, Matriz extraída da devolutiva e referência", () => {
  const { items, problems } = parseAuthoredMarkdown(ACERVO_02, "acervo-02.md");
  assert.deepEqual(problems, []);
  const [ch] = items;
  assert.equal(ch.titulo, "Título sintético");
  assert.equal(ch.serie, "2ª");
  assert.equal(ch.versaoAutor, "1.0.0");
  assert.deepEqual(ch.bncc, { codigo: "EM13CHS101", associacao: "Recorte sintético." });
  assert.deepEqual(ch.matriz, { codigo: "CH-H14", texto: "Comparar pontos de vista sintéticos." });
  assert.equal(ch.feedback.C, "Explicação da correta.", "linha da habilidade sai da devolutiva");
  assert.deepEqual(ch.referencias, [{ titulo: "Documento sintético", url: "https://exemplo.test/doc", nota: "Nota sintética." }]);
});

test("markdown → marcacao_v2: escapa, preserva tabela e vira blocos", () => {
  const v2 = markdownToMarkupV2("Texto <b> & **forte**\n\n\n\n| a | b |\n| --- | --- |\n| 1 | **2** |");
  assert.equal(v2, "Texto &lt;b&gt; &amp; <strong>forte</strong>\n\n| a | b |\n| --- | --- |\n| 1 | <strong>2</strong> |");
  const blocks = parseBlocks(v2, "marcacao_v2");
  assert.equal(blocks.length, 2);
  assert.equal(blocks[1].type, "table");
  assert.equal(blocks[1].header.length, 2);
  assert.equal(blocks[1].rows[0][1][0].tag, "strong");
  assert.equal(parseBlocks(v2, "marcacao_v1").length, 1, "v1 não interpreta tabela");
});

const KNOWN = new Set(["bncc-em13mat302", "bncc-em13chs101", "enem-ch-h14", "enem-mt-h19"]);

test("plano: BNCC do autor ou proposta por IA, sempre marcada; Matriz como sugestão; devolutivas guardadas", () => {
  const plan = buildAuthoredImportPlan({
    files: [
      { arquivo: "acervo-01.md", items: parseAuthoredMarkdown(ACERVO_01, "a").items },
      { arquivo: "acervo-02.md", items: parseAuthoredMarkdown(ACERVO_02, "b").items },
    ],
    proposals: [{ codigo: "IAH-EM-MT-901", bncc: "EM13MAT302", confianca_bncc: "alta", matriz: "MT-H19", confianca_matriz: "media", serie: "1ª", motivo: "sintético" }],
    catalogInstitutionId: "cat",
    authorUserId: "autor",
    knownSkillIds: KNOWN,
  });
  assert.deepEqual(plan.problems, []);
  assert.equal(plan.source.kind, "autoral_iah");
  assert.equal(plan.source.rights_status, undefined, "direitos ficam pendentes (default do banco)");
  const [mt, ch] = plan.items;
  assert.equal(mt.question.skill_id, "bncc-em13mat302");
  assert.equal(mt.question.external_ref.classificacao.origem, "ia");
  assert.equal(mt.question.external_ref.serie_origem, "ia");
  assert.equal(mt.suggestion.origin, "ia");
  assert.equal(mt.suggestion.confidence, "media");
  assert.equal(mt.version.content_format, "marcacao_v2");
  assert.match(mt.version.stem, /Qual a razão &amp; a regra\?/);
  assert.equal(mt.key.resolution, "Motivo sintético A.");
  assert.equal(Object.keys(mt.key.option_feedback).length, 5);
  assert.equal(ch.question.external_ref.classificacao.origem, "autor");
  assert.equal(ch.suggestion.skill_id, "enem-ch-h14");
  assert.equal(ch.suggestion.origin, "equipe");
  assert.equal(ch.question.component_id, "comp-chs-area");
});

test("plano: sem classificação ou com código fora da referência, o item não entra", () => {
  const plan = buildAuthoredImportPlan({
    files: [{ arquivo: "a", items: parseAuthoredMarkdown(ACERVO_01, "a").items }],
    proposals: [],
    catalogInstitutionId: "cat",
    authorUserId: "autor",
    knownSkillIds: KNOWN,
  });
  assert.deepEqual(plan.items, []);
  assert.match(plan.problems[0].problema, /sem BNCC/);
  const fora = buildAuthoredImportPlan({
    files: [{ arquivo: "a", items: parseAuthoredMarkdown(ACERVO_01, "a").items }],
    proposals: [{ codigo: "IAH-EM-MT-901", bncc: "EM13MAT999", confianca_bncc: "alta", matriz: "MT-H19", confianca_matriz: "alta", serie: "1ª", motivo: "x" }],
    catalogInstitutionId: "cat",
    authorUserId: "autor",
    knownSkillIds: KNOWN,
  });
  assert.match(fora.problems[0].problema, /fora da referência/);
});

test("devolutiva automática traz a devolutiva da alternativa marcada", () => {
  const report = buildAttemptReport({
    items: [{ id: "i1", listId: "l", position: 1, questionVersionId: "v1", skillId: "s" }],
    versions: [{ id: "v1", institutionId: "i", questionId: "q", version: 1, stem: "x", options: [{ key: "A", text: "a" }, { key: "B", text: "b" }], editorialDifficulty: null, sourceId: "s", authorship: "x", status: "aprovada", createdBy: "u", decidedBy: "r", decidedAt: null, contentFormat: "texto" }],
    keys: [{ versionId: "v1", answerKey: "A", resolution: "Porque A.", optionFeedback: { A: "Certo.", B: "B confunde x com y." } }],
    answers: [{ id: "a1", attemptId: "t", listItemId: "i1", studentId: "s1", selectedKey: "B", isCorrect: false }],
    skills: [],
  });
  assert.equal(report.items[0].selectedFeedback, "B confunde x com y.");
  assert.equal(report.items[0].optionFeedback.A, "Certo.");
});
