/**
 * Controles do GERADOR do ensaio (scripts/pilot-gerador-controles.mjs) com
 * transporte SIMULADO: nenhuma chamada de rede, nenhum banco. Validam o
 * gerador; não dizem nada sobre a capacidade da hospedagem.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  EsperaCancelada,
  PREFIXO_PARADA,
  ParadaDoGerador,
  comoRecusaEsperada,
  criarControle,
  criarLimitador,
  criarTransporte,
  medirComEspera,
  relatorioInterrompido,
} from "../scripts/pilot-gerador-controles.mjs";

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
/** fetch simulado: responde depois de `atraso` ms com `status`; respeita o AbortSignal. */
function fetchSimulado({ atraso = 0, status = 200, corpo = "ok", headers = [], travar = false } = {}) {
  const chamadas = [];
  const fn = (url, opts = {}) => {
    chamadas.push({ url, t: performance.now() });
    return new Promise((resolve, reject) => {
      const abortar = () => reject(new DOMException("aborted", "AbortError"));
      if (opts.signal?.aborted) return abortar();
      opts.signal?.addEventListener("abort", abortar);
      if (travar) return;
      setTimeout(() => resolve(new Response(corpo, { status, headers })), atraso);
    });
  };
  fn.chamadas = chamadas;
  return fn;
}
const semLimite = () => criarLimitador({});

test("limitador: sem --max-rps não espera e se declara sem teto", async () => {
  const l = semLimite();
  assert.equal(l.ativo, false);
  assert.equal(await l.aguardar(), 0);
  assert.match(l.descricao, /sem limite/);
});

test("limitador: 20 req/s com rajada 1 espaça as saídas em ~50 ms", async () => {
  const l = criarLimitador({ rps: 20, rajada: 1 });
  const saidas = [];
  await Promise.all(Array.from({ length: 6 }, async () => {
    await l.aguardar();
    saidas.push(performance.now());
  }));
  saidas.sort((a, b) => a - b);
  for (let i = 1; i < saidas.length; i += 1) assert.ok(saidas[i] - saidas[i - 1] >= 40, `intervalo ${saidas[i] - saidas[i - 1]} ms`);
  assert.ok(saidas.at(-1) - saidas[0] >= 230);
});

test("limitador: a rajada deixa sair `rajada` requisições juntas e depois volta à vazão sustentada", async () => {
  const l = criarLimitador({ rps: 10, rajada: 3 });
  const t0 = performance.now();
  const saidas = [];
  await Promise.all(Array.from({ length: 4 }, async () => {
    await l.aguardar();
    saidas.push(performance.now() - t0);
  }));
  saidas.sort((a, b) => a - b);
  assert.ok(saidas[2] < 30, `3ª saída em ${saidas[2]} ms (deveria ser imediata)`);
  assert.ok(saidas[3] >= 85, `4ª saída em ${saidas[3]} ms (deveria esperar ~100 ms)`);
});

test("limitador: em qualquer janela de T s saem no máximo rajada + rps×T (30 chamadores ao mesmo tempo)", async () => {
  const rps = 50;
  const rajada = 5;
  const l = criarLimitador({ rps, rajada });
  const saidas = [];
  await Promise.all(Array.from({ length: 30 }, async () => {
    await l.aguardar();
    saidas.push(performance.now());
  }));
  saidas.sort((a, b) => a - b);
  for (let i = 0; i < saidas.length; i += 1) {
    for (let j = i; j < saidas.length; j += 1) {
      const janelaS = (saidas[j] - saidas[i]) / 1000;
      assert.ok(j - i + 1 <= rajada + rps * janelaS + 1, `${j - i + 1} saídas em ${janelaS.toFixed(3)} s`);
    }
  }
});

test("teto de req/s não é teto de simultaneidade: 10 requisições lentas ficam em voo juntas", async () => {
  const controle = criarControle();
  const transporte = criarTransporte({ controle, limitador: criarLimitador({ rps: 1000, rajada: 10 }), fetch: fetchSimulado({ atraso: 100 }) });
  await Promise.all(Array.from({ length: 10 }, (_, i) => transporte(`https://simulado.invalid/r${i}`, {}, { caminho: `/r${i}` })));
  assert.equal(controle.picoEmAndamento, 10);
  assert.equal(controle.quantidadeEmAndamento, 0);
});

test("timeout por requisição: aborta, para a rodada e não deixa a requisição pendurada", async () => {
  const controle = criarControle();
  const transporte = criarTransporte({ controle, limitador: semLimite(), timeoutMs: 80, fetch: fetchSimulado({ travar: true }) });
  await assert.rejects(() => transporte("https://simulado.invalid/lenta", {}, { caminho: "/lenta" }), /tempo esgotado \(80 ms\)/);
  assert.equal(controle.parada.motivo, "falha inesperada");
  assert.match(controle.parada.detalhe, /tempo esgotado.*\/lenta/);
  assert.equal(controle.quantidadeEmAndamento, 0);
});

test("429 para a rodada; a próxima requisição nem chega ao transporte", async () => {
  const controle = criarControle();
  const f = fetchSimulado({ status: 429 });
  const transporte = criarTransporte({ controle, limitador: semLimite(), fetch: f });
  const r = await transporte("https://simulado.invalid/a", {}, { caminho: "/a" });
  assert.equal(r.status, 429);
  assert.match(controle.parada.detalhe, /HTTP 429/);
  await assert.rejects(() => transporte("https://simulado.invalid/b", {}, { caminho: "/b" }), ParadaDoGerador);
  assert.equal(f.chamadas.length, 1);
  assert.equal(controle.naoIniciadas, 1);
});

test("5xx: recusa ESPERADA num controle negativo não para; o mesmo 5xx fora dele para", async () => {
  const c1 = criarControle();
  const t1 = criarTransporte({ controle: c1, limitador: semLimite(), fetch: fetchSimulado({ status: 500 }) });
  const r = await comoRecusaEsperada(() => t1("https://simulado.invalid/negativo", { method: "POST" }, { caminho: "/negativo" }));
  assert.equal(r.status, 500);
  assert.equal(c1.parada, null);

  const c2 = criarControle();
  const t2 = criarTransporte({ controle: c2, limitador: semLimite(), fetch: fetchSimulado({ status: 503 }) });
  await t2("https://simulado.invalid/fluxo", { method: "POST" }, { caminho: "/fluxo" });
  assert.match(c2.parada.detalhe, /HTTP 503 — POST \/fluxo/);
});

test("429 continua inesperado mesmo dentro de um controle negativo", async () => {
  const c = criarControle();
  const t = criarTransporte({ controle: c, limitador: semLimite(), fetch: fetchSimulado({ status: 429 }) });
  await comoRecusaEsperada(() => t("https://simulado.invalid/x", {}, { caminho: "/x" }));
  assert.match(c.parada.detalhe, /HTTP 429/);
});

test("4xx não para pelo transporte (quem decide é o fluxo: recusa esperada ou erro registrado)", async () => {
  const c = criarControle();
  const t = criarTransporte({ controle: c, limitador: semLimite(), fetch: fetchSimulado({ status: 404 }) });
  await t("https://simulado.invalid/api/versao", {}, { caminho: "/api/versao" });
  assert.equal(c.parada, null);
});

test("erro de rede para a rodada", async () => {
  const c = criarControle();
  const t = criarTransporte({ controle: c, limitador: semLimite(), fetch: () => Promise.reject(new TypeError("fetch failed")) });
  await assert.rejects(() => t("https://simulado.invalid/x", {}, { caminho: "/x" }), /erro de rede: fetch failed/);
  assert.equal(c.parada.motivo, "falha inesperada");
});

test("operador: lista o que estava em voo, recusa o novo e espera os pendentes terminarem", async () => {
  const c = criarControle();
  const t = criarTransporte({ controle: c, limitador: semLimite(), fetch: fetchSimulado({ atraso: 150 }) });
  const voando = [t("https://simulado.invalid/v1", { method: "POST" }, { caminho: "/v1", sessao: "aluno 1" }), t("https://simulado.invalid/v2", {}, { caminho: "/v2", sessao: "aluno 2" })];
  await dormir(30);
  assert.equal(c.parar("intervenção do operador (Ctrl+C)", "", "fase 2 (envio)"), true);
  assert.equal(c.parar("outro motivo"), false, "a primeira parada vale");
  assert.deepEqual(c.parada.emAndamentoNaParada.map((r) => [r.metodo, r.caminho, r.sessao]).sort(), [["GET", "/v2", "aluno 2"], ["POST", "/v1", "aluno 1"]]);
  await assert.rejects(() => t("https://simulado.invalid/novo", {}, { caminho: "/novo" }), ParadaDoGerador);
  const restantes = await c.aguardarEmAndamento(1000);
  assert.equal(restantes.length, 0);
  assert.equal((await Promise.all(voando)).every((r) => r.status === 200), true, "as que já estavam em voo terminam");
});

test("duração máxima: depois do limite, nenhuma requisição nova começa", async () => {
  const c = criarControle({ duracaoMaximaMs: 60 });
  const t = criarTransporte({ controle: c, limitador: semLimite(), fetch: fetchSimulado() });
  await t("https://simulado.invalid/antes", {}, { caminho: "/antes" });
  await dormir(90);
  await assert.rejects(() => t("https://simulado.invalid/depois", {}, { caminho: "/depois" }), ParadaDoGerador);
  assert.equal(c.parada.motivo, "duração máxima da rodada");
});

test("pausa do gerador termina antes se a rodada parar", async () => {
  const c = criarControle();
  const t0 = performance.now();
  setTimeout(() => c.parar("intervenção do operador (Ctrl+C)"), 40);
  assert.equal(await c.pausa(5000), false);
  assert.ok(performance.now() - t0 < 500);
});

test("medição separa a espera do limitador do restante (rede + servidor simulados)", async () => {
  const c = criarControle();
  const t = criarTransporte({ controle: c, limitador: criarLimitador({ rps: 10, rajada: 1 }), fetch: fetchSimulado({ atraso: 30 }) });
  const { totalMs, esperaMs } = await medirComEspera(async () => {
    await t("https://simulado.invalid/1", {}, { caminho: "/1" });
    await t("https://simulado.invalid/2", {}, { caminho: "/2" });
  });
  assert.ok(esperaMs >= 50, `espera do limitador ${esperaMs} ms`);
  assert.ok(totalMs - esperaMs >= 55 && totalMs - esperaMs < 200, `restante ${totalMs - esperaMs} ms`);
});

test("transporte preserva status, corpo e todos os Set-Cookie ao ler a resposta inteira", async () => {
  const c = criarControle();
  const headers = [["set-cookie", "a=1; Path=/"], ["set-cookie", "authjs.session-token=xyz; Path=/"], ["location", "/entrar"]];
  const t = criarTransporte({ controle: c, limitador: semLimite(), fetch: fetchSimulado({ status: 303, corpo: "redir", headers }) });
  const r = await t("https://simulado.invalid/login", { method: "POST" }, { caminho: "/login" });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "/entrar");
  assert.deepEqual(r.headers.getSetCookie(), ["a=1; Path=/", "authjs.session-token=xyz; Path=/"]);
  assert.equal(await r.text(), "redir");
});

test("relatório de rodada interrompida: nunca aprovado; motivo, amostras e o que estava em voo", () => {
  const c = criarControle();
  c.iniciar({ metodo: "POST", caminho: "/missoes/01", sessao: "aluno 7" });
  c.parar("erro inesperado", "aluno 7 · entrega: HTTP 500", "fase 2 (envio)");
  const r = relatorioInterrompido({
    controle: c,
    emAndamentoAoFinal: [],
    base: { etapas: [{ etapa: "gravação (por chamada)", amostras: 12 }], aprovado: true, reprovacoes: [] },
  });
  assert.equal(r.interrompido, true);
  assert.equal(r.aprovado, false);
  assert.match(r.reprovacoes[0], /^rodada interrompida: erro inesperado \(aluno 7 · entrega: HTTP 500\)/);
  assert.equal(r.parada.fase, "fase 2 (envio)");
  assert.equal(r.emAndamentoNaParada.length, 1);
  assert.equal(r.emAndamentoNaParada[0].caminho, "/missoes/01");
  assert.equal(r.etapas[0].amostras, 12, "as amostras coletadas até a parada ficam no relatório");
});

// ---------------------------------------------------------------------------
// Regressão (revisão externa sobre 4331ac6): requisições à espera de ficha
// continuavam esperando o escoamento do balde depois da parada (~1,7 s com
// 8 chamadas, 4 req/s). Relógio CONTROLADO: o tempo só anda quando o teste manda.

function relogioControlado() {
  let t = 0;
  let seq = 0;
  const timers = new Map();
  const liberar = () => new Promise((r) => setImmediate(r)); // esvazia as microtarefas pendentes
  return {
    agora: () => t,
    agendar: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { quando: t + Math.max(0, ms), fn });
      return id;
    },
    desagendar: (id) => timers.delete(id),
    pendentes: () => timers.size,
    liberar,
    async avancar(ms) {
      const alvo = t + ms;
      for (;;) {
        await liberar();
        const [id, prox] = [...timers.entries()].filter(([, x]) => x.quando <= alvo).sort((a, b) => a[1].quando - b[1].quando)[0] ?? [];
        if (!prox) break;
        timers.delete(id);
        t = prox.quando;
        prox.fn();
      }
      t = alvo;
      await liberar();
    },
  };
}

function cenarioComFila({ duracaoMaximaMs = 0 } = {}) {
  const relogio = relogioControlado();
  const controle = criarControle({ ...relogio, duracaoMaximaMs, faseAtual: () => "fase 2 (envio)" });
  const limitador = criarLimitador({ rps: 4, rajada: 1, ...relogio });
  const esperas = [];
  let noFetch = 0;
  const transporte = criarTransporte({
    controle,
    limitador,
    timeoutMs: 0,
    aoEsperar: (ms) => esperas.push(ms),
    fetch: async () => {
      noFetch += 1;
      return new Response("ok");
    },
  });
  const resultados = [];
  const chamadas = Array.from({ length: 8 }, (_, i) =>
    transporte(`https://simulado.invalid/r${i}`, { method: "POST" }, { caminho: `/r${i}` }).then(
      (r) => resultados.push({ i, ok: r.status }),
      (e) => resultados.push({ i, erro: e }),
    ),
  );
  return { relogio, controle, esperas, chamadas, resultados, noFetch: () => noFetch };
}

test("parada antecipada cancela na hora as esperas por ficha: nada novo sai e o encerramento não espera o balde", async () => {
  const c = cenarioComFila();
  await c.relogio.avancar(20); // 1ª chamada usou a única ficha; 7 esperam (a próxima ficha só em t=250 ms)
  assert.equal(c.noFetch(), 1);
  assert.equal(c.resultados.length, 1);
  assert.ok(c.relogio.pendentes() > 0, "há temporizador do limitador esperando a próxima ficha");

  assert.equal(c.controle.parar("intervenção do operador (Ctrl+C)"), true);
  await c.relogio.liberar(); // nenhum avanço de tempo: o encerramento não depende do balde
  assert.equal(c.resultados.length, 8, "todas as 8 chamadas terminaram sem o relógio andar");
  assert.equal(c.relogio.agora(), 20);
  const recusadas = c.resultados.filter((r) => r.erro);
  assert.equal(recusadas.length, 7);
  assert.ok(recusadas.every((r) => r.erro instanceof ParadaDoGerador && r.erro.message.startsWith(PREFIXO_PARADA)), "vira ParadaDoGerador (excluída das amostras de latência)");
  assert.equal(c.controle.naoIniciadas, 7);
  assert.equal(c.relogio.pendentes(), 0, "temporizadores do limitador desfeitos");
  assert.equal(c.esperas.length, 1, "só a chamada que saiu registra espera do limitador");

  await c.relogio.avancar(5000); // mesmo com tempo de sobra, nada mais sai
  assert.equal(c.noFetch(), 1);
  assert.equal(c.controle.parada.motivo, "intervenção do operador (Ctrl+C)");
});

test("parada por duração máxima também cancela as esperas por ficha", async () => {
  const c = cenarioComFila({ duracaoMaximaMs: 300 });
  await c.relogio.avancar(299);
  assert.equal(c.noFetch(), 2, "fichas em t=0 e t=250 ms");
  await c.relogio.avancar(1); // t=300: o controle para sozinho
  assert.equal(c.controle.parada.motivo, "duração máxima da rodada");
  assert.equal(c.controle.parada.fase, "fase 2 (envio)");
  assert.equal(c.resultados.length, 8, "as 6 restantes saem da fila na hora");
  assert.equal(c.controle.naoIniciadas, 6);
  assert.equal(c.relogio.pendentes(), 0);
  await c.relogio.avancar(5000);
  assert.equal(c.noFetch(), 2);
});

test("a primeira causa da parada é preservada; a duração máxima depois não a substitui", async () => {
  const c = cenarioComFila({ duracaoMaximaMs: 300 });
  await c.relogio.avancar(20);
  c.controle.parar("erro inesperado", "aluno 3 · entrega: HTTP 500");
  await c.relogio.avancar(1000);
  assert.equal(c.controle.parada.motivo, "erro inesperado");
  assert.equal(c.controle.parada.detalhe, "aluno 3 · entrega: HTTP 500");
  assert.equal(c.relogio.pendentes(), 0, "o temporizador da duração máxima foi desfeito na parada");
  assert.equal(c.controle.naoIniciadas, 7);
});

test("limitador: espera cancelada rejeita com EsperaCancelada e libera a fila", async () => {
  const relogio = relogioControlado();
  const controle = criarControle(relogio);
  const l = criarLimitador({ rps: 1, rajada: 1, ...relogio });
  await l.aguardar(controle.cancelamento); // ficha imediata
  const fila = [l.aguardar(controle.cancelamento), l.aguardar(controle.cancelamento), l.aguardar(controle.cancelamento)];
  controle.parar("intervenção do operador (Ctrl+C)");
  const r = await Promise.allSettled(fila);
  assert.ok(r.every((x) => x.status === "rejected" && x.reason instanceof EsperaCancelada));
  assert.equal(relogio.pendentes(), 0);
});
