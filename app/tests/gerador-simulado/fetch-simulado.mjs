/**
 * Transporte SIMULADO para validar o gerador (`scripts/pilot-ensaio-1a.mjs`)
 * sem rede: carregado com `node --import`, troca o `fetch` global por uma
 * aplicação de mentira em `https://gerador-simulado.invalid`. Qualquer outro
 * destino é recusado — nada sai desta máquina, nem para a hospedagem nem para
 * o banco.
 *
 * Cenários (variável SIMULACAO):
 *   ok        tudo responde em ~5 ms;
 *   erro-500  a N-ésima gravação de rascunho (SIMULACAO_FALHA_EM, padrão 3) devolve 500;
 *   lento     toda resposta leva 300 ms;
 *   trava     GET /dashboard nunca responde (só o timeout do gerador encerra);
 *   operador  na N-ésima requisição (SIMULACAO_OPERADOR_EM) o "operador" aperta Ctrl+C.
 * SIMULACAO_LOG: arquivo onde cada requisição anota `instante;método;caminho;ação`.
 */
import { appendFileSync } from "node:fs";

const BASE = "https://gerador-simulado.invalid";
const CENARIO = process.env.SIMULACAO ?? "ok";
const LOG = process.env.SIMULACAO_LOG;
const IDS = {
  assignAiMissionAction: "a".repeat(40),
  reviewSubmissionAction: "b".repeat(40),
  startMissionAction: "c".repeat(40),
  saveProductionDraftAction: "d".repeat(40),
  saveAiEvidenceDraftAction: "e".repeat(40),
  setProductionDeliveredAction: "f".repeat(40),
  saveReflectionDraftAction: "1".repeat(40),
  setReflectionRecordedAction: "2".repeat(40),
};
const NOME = Object.fromEntries(Object.entries(IDS).map(([k, v]) => [v, k]));
const chunk = (nomes) => nomes.map((n) => `(0,r.createServerReference)("${IDS[n]}",r.callServer,void 0,r.findSourceMapURL,"${n}")`).join(";");
const CHUNKS = {
  "/_next/static/chunks/prof.js": chunk(["assignAiMissionAction", "reviewSubmissionAction"]),
  "/_next/static/chunks/aluno.js": chunk(["startMissionAction", "saveProductionDraftAction", "saveAiEvidenceDraftAction", "setProductionDeliveredAction", "saveReflectionDraftAction", "setReflectionRecordedAction"]),
};
const contagem = {};
let n = 0;

const html = (corpo, script) => new Response(`<html><body>${corpo}${script ? `<script src="${script}"></script>` : ""}</body></html>`, { status: 200, headers: [["content-type", "text/html"]] });
const rsc = (valor) => new Response(`0:{"a":"$@1"}\n1:${JSON.stringify(valor)}\n`, { status: 200, headers: [["content-type", "text/x-component"]] });
const esperar = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

globalThis.fetch = async (entrada, opts = {}) => {
  const url = String(entrada);
  if (!url.startsWith(`${BASE}/`)) throw new Error(`fetch simulado: destino não permitido (${url})`);
  n += 1;
  const { pathname: caminho } = new URL(url);
  const metodo = opts.method ?? "GET";
  const acao = NOME[opts.headers?.["next-action"]] ?? "";
  if (LOG) appendFileSync(LOG, `${performance.now().toFixed(1)};${metodo};${caminho};${acao}\n`);
  if (CENARIO === "operador" && n === Number(process.env.SIMULACAO_OPERADOR_EM ?? 30)) setTimeout(() => process.emit("SIGINT"), 0);
  if (CENARIO === "trava" && caminho === "/dashboard") {
    await esperar(10 * 60_000, opts.signal);
  }
  await esperar(CENARIO === "lento" ? 300 : 5, opts.signal);

  if (caminho === "/api/auth/csrf") return new Response(JSON.stringify({ csrfToken: "simulado" }), { status: 200, headers: [["content-type", "application/json"]] });
  if (caminho === "/api/auth/callback/credentials") {
    return new Response("", { status: 302, headers: [["location", `${BASE}/entrar`], ["set-cookie", "authjs.session-token=simulado; Path=/"]] });
  }
  if (caminho === "/api/auth/signout") {
    return new Response("", { status: 302, headers: [["location", `${BASE}/`], ["set-cookie", "authjs.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"]] });
  }
  if (CHUNKS[caminho]) return new Response(CHUNKS[caminho], { status: 200, headers: [["content-type", "application/javascript"]] });
  if (acao) {
    contagem[acao] = (contagem[acao] ?? 0) + 1;
    if (CENARIO === "erro-500" && acao === "saveProductionDraftAction" && contagem[acao] === Number(process.env.SIMULACAO_FALHA_EM ?? 3)) {
      return new Response("erro simulado", { status: 500 });
    }
    const args = JSON.parse(opts.body ?? "[]");
    if (acao === "assignAiMissionAction") {
      return rsc(args[0]?.classroomId === "class-ensaio-extra" ? { ok: false, error: "Turma fora do seu alcance." } : { ok: true });
    }
    return rsc({ production: "simulada", productionDeliveredAt: acao === "setProductionDeliveredAction" ? new Date().toISOString() : null });
  }
  if (caminho.startsWith("/professor")) return html("painel do professor (simulado)", "/_next/static/chunks/prof.js");
  if (caminho.startsWith("/missoes/")) return html("missão simulada EM13CHS101", "/_next/static/chunks/aluno.js");
  return html("página simulada");
};
