/**
 * Validação do GERADOR inteiro (`scripts/pilot-ensaio-1a.mjs --modo=hospedado`)
 * com transporte SIMULADO (`tests/gerador-simulado/fetch-simulado.mjs`): o
 * script roda de verdade, mas todo `fetch` é respondido localmente em
 * `https://gerador-simulado.invalid`. Sem rede, sem banco (as variáveis do
 * Supabase são removidas do ambiente). Nada aqui mede a hospedagem.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const APP = fileURLToPath(new URL("..", import.meta.url));
// `--import` exige URL (no Windows, um caminho "C:\…" seria lido como esquema "c:").
const PRELOAD = new URL("./gerador-simulado/fetch-simulado.mjs", import.meta.url).href;

function rodar(cenario, extras = [], envExtra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "gerador-simulado-"));
  const contas = join(dir, "contas.csv");
  const emails = ["professor@sim.invalid", "gestor@sim.invalid", "a1@sim.invalid", "a2@sim.invalid", "a3@sim.invalid", "a4@sim.invalid"];
  writeFileSync(
    contas,
    ["perfil;nome;email;senha_inicial", "professor;P;professor@sim.invalid;x", "gestor;G;gestor@sim.invalid;x", ...emails.slice(2).map((e, i) => `aluno;A${i + 1};${e};x`)].join("\n"),
  );
  writeFileSync(`${contas}.preparadas`, `${emails.join("\n")}\n`); // contas já preparadas: sem troca de senha
  const saida = join(dir, "resultado.json");
  const log = join(dir, "requisicoes.log");
  writeFileSync(log, "");
  const env = { ...process.env, SIMULACAO: cenario, SIMULACAO_LOG: log, ENSAIO_SENHA_BASE: "senha-base-simulada", ...envExtra };
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  const r = spawnSync(
    process.execPath,
    [
      "--import", PRELOAD,
      "--experimental-strip-types",
      "scripts/pilot-ensaio-1a.mjs",
      "--modo=hospedado",
      "--base-url=https://gerador-simulado.invalid",
      `--contas=${contas}`,
      "--institution=inst-simulada",
      "--turma=class-simulada",
      "--turma-extra=class-ensaio-extra",
      "--students=4",
      "--peak-submitters=2",
      "--entry-window=0",
      "--autosave-min=0",
      "--drafts=2",
      "--reviews=1",
      `--out=${saida}`,
      ...extras,
    ],
    { cwd: APP, env, encoding: "utf8", timeout: 60_000 },
  );
  let resultado = null;
  try {
    resultado = JSON.parse(readFileSync(saida, "utf8"));
  } catch {
    // sem relatório
  }
  const requisicoes = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => {
    const [t, metodo, caminho, acao] = l.split(";");
    return { t: Number(t), metodo, caminho, acao };
  });
  rmSync(dir, { recursive: true, force: true });
  return { codigo: r.status, stdout: r.stdout, stderr: r.stderr, resultado, requisicoes };
}

function assertInterrompida(r, motivo) {
  assert.equal(r.codigo, 1, `código de saída ${r.codigo}\n${r.stdout}\n${r.stderr}`);
  assert.ok(r.resultado, `sem relatório parcial\n${r.stdout}\n${r.stderr}`);
  assert.equal(r.resultado.interrompido, true);
  assert.equal(r.resultado.aprovado, false);
  assert.equal(r.resultado.parada.motivo, motivo);
  assert.ok(r.resultado.reprovacoes[0].startsWith(`rodada interrompida: ${motivo}`), r.resultado.reprovacoes[0]);
  assert.ok(Array.isArray(r.resultado.etapas) && r.resultado.etapas.length > 0, "amostras coletadas até a parada");
  assert.ok(Array.isArray(r.resultado.emAndamentoNaParada));
  assert.ok(Array.isArray(r.resultado.emAndamentoAoFinal));
}

test("erro 500 no envio: para os novos envios, relatório parcial e teto de req/s respeitado", () => {
  const r = rodar("erro-500", ["--max-rps=20", "--rps-burst=2", "--timeout-ms=5000"]);
  assertInterrompida(r, "falha inesperada");
  assert.match(r.resultado.parada.detalhe, /HTTP 500 — POST \/missoes\/01-a-fabrica-de-noticias/);
  assert.equal(r.resultado.parada.fase, "fase 2 (envio)");
  assert.ok(r.resultado.totalErros >= 1);
  assert.ok(r.resultado.requisicoesNaoIniciadasPorCausaDaParada > 0, "passos seguintes dos alunos não começaram");
  assert.deepEqual(r.resultado.geradorControles.limiteRequisicoesPorSegundo.rps, 20);
  // nenhum aluno chegou à entrega depois da falha na 3ª gravação de rascunho
  assert.equal(r.requisicoes.filter((q) => q.acao === "setProductionDeliveredAction").length, 0);
  // teto global: em qualquer janela de T s, no máximo rajada + rps×T (+1 de tolerância de relógio)
  const ts = r.requisicoes.map((q) => q.t).sort((a, b) => a - b);
  for (let i = 0; i < ts.length; i += 1) {
    for (let j = i; j < ts.length; j += 1) assert.ok(j - i + 1 <= 2 + 20 * ((ts[j] - ts[i]) / 1000) + 1, `${j - i + 1} requisições em ${(ts[j] - ts[i]).toFixed(0)} ms`);
  }
  const espera = r.resultado.etapas.find((e) => e.etapa.startsWith("espera no limitador"));
  assert.ok(espera.amostras > 0 && espera.max > 0, "espera do limitador medida à parte");
  // requisições recusadas pela parada (não saíram) não viram amostra de latência
  const gravacao = r.resultado.etapas.find((e) => e.etapa === "gravação (por chamada)");
  const gravacoesQueSairam = r.requisicoes.filter((q) => q.acao && q.acao !== "assignAiMissionAction" && q.acao !== "reviewSubmissionAction").length;
  assert.ok(gravacao.amostras <= gravacoesQueSairam, `${gravacao.amostras} amostras para ${gravacoesQueSairam} gravações enviadas`);
  assert.ok(gravacao.p50 >= 3, `p50 ${gravacao.p50} ms: nenhuma amostra ~0 de requisição não enviada`);
});

test("duração máxima da rodada: para sozinho e gera relatório parcial", () => {
  const r = rodar("lento", ["--max-duration-s=2", "--timeout-ms=5000"]);
  assertInterrompida(r, "duração máxima da rodada");
  assert.equal(r.resultado.geradorControles.duracaoMaximaS, 2);
});

test("timeout por requisição: requisição presa encerra a rodada e aparece como em voo na parada", () => {
  const r = rodar("trava", ["--timeout-ms=500"]);
  assertInterrompida(r, "falha inesperada");
  assert.match(r.resultado.parada.detalhe, /tempo esgotado \(500 ms\) — GET \/dashboard/);
  assert.ok(r.resultado.emAndamentoNaParada.some((q) => q.caminho === "/dashboard"), "as outras leituras presas estavam em voo");
  assert.equal(r.resultado.emAndamentoAoFinal.length, 0, "ao final, todas caíram no timeout");
});

test("operador (Ctrl+C): para os novos envios e gera relatório parcial", () => {
  const r = rodar("operador", ["--timeout-ms=5000"], { SIMULACAO_OPERADOR_EM: "25" });
  assertInterrompida(r, "intervenção do operador (Ctrl+C)");
  assert.equal(r.resultado.totalErros, 0, "parada do operador não é erro");
});

test("sem falha: a rodada termina sem interrupção (reprovada só por falta de banco no simulado)", () => {
  const r = rodar("ok", ["--max-rps=50", "--rps-burst=5", "--timeout-ms=5000"]);
  assert.ok(r.resultado, `${r.stdout}\n${r.stderr}`);
  assert.equal(r.resultado.interrompido, false);
  assert.equal(r.resultado.totalErros, 0);
  assert.ok(r.resultado.reprovacoes.includes("integridade não conferida (sem acesso administrativo de leitura)"));
  assert.ok(r.requisicoes.filter((q) => q.acao === "setReflectionRecordedAction").length === 4, "os 4 alunos sintéticos completaram o envio");
});
