/**
 * Prontidão para um diagnóstico real e fila de revisão filtrada (D-055) —
 * pela rede, com login normal. Dados sintéticos do arranque: recorte
 * provisório com itens demonstrativos (escola) e acervo sintético no
 * Catálogo IAH (série sugerida 1ª).
 */

import assert from "node:assert/strict";
import test, { before } from "node:test";

import { textoVisivel } from "./support/http-client.mjs";
import { autenticar } from "./support/sessoes.mjs";
import { CATALOGO, TURMA, conta } from "./support/ambiente.mjs";

let professor;
let gestao;

before(async () => {
  professor = await autenticar(conta(TURMA, "professor"));
  gestao = await autenticar(conta(CATALOGO, "gestor"));
});

test("1. o professor vê a prontidão: ainda demonstrativo, com planejamento provisório e faltas por habilidade", async () => {
  const { status, html } = await professor.html(`/professor/diagnostico?turma=${encodeURIComponent(TURMA.classroomId)}`);
  assert.equal(status, 200);
  const texto = textoVisivel(html);
  assert.match(texto, /Prontidão para um diagnóstico real/);
  assert.match(texto, /Ainda demonstrativo · 0 de 4 habilidade\(s\) prontas/);
  assert.match(texto, /Planejamento provisório em 4 habilidade\(s\)/);
  // Itens sintéticos do recorte não contam; itens do Catálogo aprovados por
  // outras suítes (revisor humano, fonte não sintética) podem contar.
  assert.match(texto, /Faltam questões revisadas \(não demonstrativas\) em [1-4] habilidade\(s\): .*EM13MAT101 \(faltam 3\)/);
  assert.ok(html.includes("/professor/revisao?habilidade=EM13MAT101"), "atalho para a fila da habilidade");
});

/** Códigos dos itens listados em todas as situações da fila com os filtros dados. */
async function codigos(sessao, filtros) {
  const out = new Set();
  for (const status of ["em_revisao", "devolvida", "rascunho", "aprovada"]) {
    const q = new URLSearchParams({ status, ...filtros });
    const { status: http, html } = await sessao.html(`/gestor/revisao?${q}`);
    assert.equal(http, 200);
    for (const m of html.matchAll(/IAH-EM-[A-Z]{2}-\d{3}/g)) out.add(m[0]);
  }
  return out;
}

test("2. a fila do catálogo filtra por série sugerida e por habilidade", async () => {
  const todas = await codigos(gestao, {});
  assert.ok(todas.has("IAH-EM-LC-903") && todas.has("IAH-EM-CN-901"), "itens sintéticos do acervo na fila");
  assert.equal((await codigos(gestao, { serie: "em3" })).size, 0, "nenhum item sugerido para a 3ª série");
  const lp = await codigos(gestao, { habilidade: "EM13LP01" });
  assert.ok(lp.has("IAH-EM-LC-903"));
  assert.ok(!lp.has("IAH-EM-CN-901"), "item de outra habilidade fica de fora");
  const texto = textoVisivel((await gestao.html("/gestor/revisao?serie=em1&habilidade=EM13LP01")).html);
  assert.match(texto, /Habilidade EM13LP01 ✕/);
});
