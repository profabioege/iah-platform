/**
 * Catálogo IAH (D-050) — regras puras: marcação por lista de permissão,
 * leitura dos microdados e plano de carga do Enem. Dados 100% SINTÉTICOS:
 * nenhum enunciado do Enem entra no repositório. Acesso e integridade no
 * banco real: tests/pilot/question-bank-catalog.test.mjs.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { parseMarkup, figureRefs, decodeEntities } = await import("@/modules/question-bank/domain/markup");
const { parseItensProvaCsv, matchProva, buildCatalogImportPlan, pngSize, versionIdFor } = await import(
  "@/modules/question-bank/catalog/enem-import"
);

// ---------------------------------------------------------------------
// Marcação
// ---------------------------------------------------------------------
test("marcação: só sub/sup/em/strong/small e {{figura:N}} viram estrutura", () => {
  assert.deepEqual(parseMarkup("H<sub>2</sub>O e <em>x</em>{{figura:2}}"), [
    { type: "text", text: "H" },
    { type: "tag", tag: "sub", children: [{ type: "text", text: "2" }] },
    { type: "text", text: "O e " },
    { type: "tag", tag: "em", children: [{ type: "text", text: "x" }] },
    { type: "figura", n: 2 },
  ]);
});

test("marcação: tag desconhecida, atributo e script ficam como TEXTO literal", () => {
  const nodes = parseMarkup('<script>alert(1)</script><em onclick="x">a</em>&lt;b&gt;');
  assert.ok(nodes.every((n) => n.type === "text"), JSON.stringify(nodes));
  assert.equal(nodes.map((n) => n.text).join(""), '<script>alert(1)</script><em onclick="x">a</em><b>');
});

test("marcação: fechamento órfão vira texto; tag sem fechamento fecha no fim", () => {
  assert.deepEqual(parseMarkup("a</sup>b"), [{ type: "text", text: "a</sup>b" }]);
  assert.deepEqual(parseMarkup("<strong>c"), [
    { type: "tag", tag: "strong", children: [{ type: "text", text: "c" }] },
  ]);
});

test("entidades e referências de figura", () => {
  assert.equal(decodeEntities("&amp; &lt; &gt; &quot; &#x27; &#39; &foo;"), "& < > \" ' ' &foo;");
  assert.deepEqual(figureRefs("{{figura:1}} x {{figura:3}}"), [1, 3]);
});

// ---------------------------------------------------------------------
// Microdados e casamento do caderno
// ---------------------------------------------------------------------
const CSV = [
  "CO_POSICAO;SG_AREA;CO_ITEM;TX_GABARITO;CO_HABILIDADE;IN_ITEM_ABAN;NU_PARAM_A;NU_PARAM_B;NU_PARAM_C;TX_COR;CO_PROVA",
  // prova 501: ordem A
  "91;CN;7001;A;5;0;1,5;0,8;0,2;AZUL;501",
  "92;CN;7002;C;12;0;2,0;1,1;0,1;AZUL;501",
  "93;CN;7003;B;3;1;;;;AZUL;501",
  "136;MT;7004;E;20;0;1,1;-0,3;0,2;AZUL;501",
  // prova 502: outra ordem (gabaritos diferentes nas posições)
  "91;CN;7002;C;12;0;2,0;1,1;0,1;AMARELA;502",
  "92;CN;7001;A;5;0;1,5;0,8;0,2;AMARELA;502",
  "93;CN;7003;B;3;1;;;;AMARELA;502",
  "136;MT;7004;E;20;0;1,1;-0,3;0,2;AMARELA;502",
].join("\r\n");

const opts = (n) => ["A", "B", "C", "D", "E"].map((key) => ({ key, text: `alternativa sintética ${n}${key}` }));
const item = (numero, area, gabarito, extra = {}) => ({
  numero, area, gabarito, anulada: gabarito === null,
  enunciado: `Enunciado sintético ${numero} com x<sup>2</sup>.`,
  alternativas: opts(numero), figuras: [], paginas: [1], alertas: [], ...extra,
});

const EXTRACTION = {
  meta: { ano: 2099, dia: 2, caderno: 5, arquivo_prova: "sintetico.pdf", arquivo_gabarito: "sintetico-gb.pdf" },
  itens: [
    item(91, "CN", "A", { enunciado: "Sintético com figura\n\n{{figura:1}}", figuras: [{ n: 1, arquivo: "q091-fig1.png", pagina: 1 }] }),
    item(92, "CN", "C"),
    item(93, "CN", null),
    item(136, "MT", "E"),
  ],
};

test("microdados: lê ; com decimal em vírgula, BOM e CRLF", () => {
  const rows = parseItensProvaCsv(`﻿${CSV}`);
  assert.equal(rows.length, 8);
  assert.deepEqual(rows[0], {
    posicao: 91, area: "CN", coItem: "7001", gabarito: "A", habilidade: 5,
    paramA: 1.5, paramB: 0.8, paramC: 0.2, cor: "AZUL", coProva: "501", abandonado: false,
  });
  assert.equal(rows[2].abandonado, true);
  assert.equal(rows[2].paramB, null);
  assert.throws(() => parseItensProvaCsv("CO_POSICAO;SG_AREA\n1;CN"), /CO_ITEM/);
});

test("casamento pela sequência de gabaritos escolhe a prova certa", () => {
  const m = matchProva(parseItensProvaCsv(CSV), EXTRACTION.itens);
  assert.deepEqual(m.coProvas, ["501"]);
  assert.equal(m.cor, "AZUL");
  assert.equal(m.byPosition.get(92).coItem, "7002");
});

test("casamento recusa caderno sem prova correspondente", () => {
  const outro = { ...EXTRACTION, itens: [item(91, "CN", "D")] };
  assert.throws(() => matchProva(parseItensProvaCsv(CSV), outro.itens), /Nenhuma prova/);
});

// ---------------------------------------------------------------------
// Plano de carga
// ---------------------------------------------------------------------
const plan = () => buildCatalogImportPlan({
  extraction: EXTRACTION,
  microdados: parseItensProvaCsv(CSV),
  suggestions: { origem: "sugestao_ia", aviso: "x", sugestoes: [{ numero: 91, bncc: "EM13CNT101", confianca: "media", motivo: "sintético" }] },
  catalogInstitutionId: "cat",
  authorUserId: "autor",
});

test("plano: rascunho sem resolução, fonte licenciada pendente, Matriz como habilidade oficial", () => {
  const p = plan();
  assert.equal(p.source.kind, "licenciado");
  assert.equal(p.source.rights_status, undefined, "status fica no default do banco: pendente");
  assert.equal(p.source.evidence, null);
  assert.deepEqual(p.items.map((i) => i.numero), [91, 92, 136]);
  const q91 = p.items[0];
  assert.equal(q91.question.skill_id, "enem-cn-h5");
  assert.equal(q91.question.component_id, "comp-cnt-area");
  assert.equal(p.items[2].question.skill_id, "enem-mt-h20");
  assert.equal(q91.version.status, undefined, "status fica no default do banco: rascunho");
  assert.equal(q91.version.content_format, "marcacao_v1");
  assert.equal(q91.version.editorial_difficulty, null, "TRI nunca vira dificuldade editorial");
  assert.deepEqual(q91.key, { version_id: versionIdFor("cat", "7001"), institution_id: "cat", answer_key: "A", resolution: null });
  assert.deepEqual(q91.figures, [{ n: 1, arquivo: "q091-fig1.png" }]);
  assert.equal(q91.question.external_ref.chave, "enem-item:7001");
  assert.equal(q91.question.external_ref.tri.b, 0.8);
  assert.match(q91.question.external_ref.tri.procedencia, /não é dificuldade editorial/);
  assert.equal(q91.suggestion.skill_id, "bncc-em13cnt101");
  assert.equal(q91.suggestion.origin, "ia");
  assert.equal(q91.suggestion.status, undefined, "sugestão entra no default: sugerida");
  assert.equal(p.items[1].suggestion, null);
});

test("plano: anulada fica de fora, com motivo", () => {
  assert.deepEqual(plan().skipped, [{ numero: 93, motivo: "anulada no gabarito oficial" }]);
});

test("plano: figura citada sem arquivo e marcação fora da lista bloqueiam o item", () => {
  const ruim = {
    ...EXTRACTION,
    itens: [
      item(91, "CN", "A", { enunciado: "Sem arquivo {{figura:2}}" }),
      item(92, "CN", "C", { enunciado: "Com <img src=x> estranho" }),
      item(136, "MT", "E"),
    ],
  };
  const p = buildCatalogImportPlan({
    extraction: ruim, microdados: parseItensProvaCsv(CSV), suggestions: null,
    catalogInstitutionId: "cat", authorUserId: "autor",
  });
  assert.deepEqual(p.items.map((i) => i.numero), [136]);
  assert.deepEqual(p.problems.map((x) => x.numero), [91, 92]);
});

test("PNG: lê largura e altura do IHDR e recusa outro formato", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 44, 0, 0, 0, 90]);
  assert.deepEqual(pngSize(png), { width: 300, height: 90 });
  assert.equal(pngSize(new Uint8Array(30)), null);
});
