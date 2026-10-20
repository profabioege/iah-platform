/**
 * Controles do GERADOR do ensaio (`pilot-ensaio-1a.mjs`). Nada daqui roda na
 * aplicação: são freios do lado de quem gera o tráfego.
 *
 * Três limites diferentes, que não se confundem:
 *   - alunos ENVIANDO ao mesmo tempo (`--peak-submitters`): quantos "alunos"
 *     estão na fase de envio; imposto pela fila de trabalhadores do ensaio;
 *   - requisições SIMULTÂNEAS (em voo): consequência dos alunos ativos (cada
 *     sessão faz uma requisição por vez); aqui só é MEDIDA (`picoEmAndamento`);
 *   - requisições POR SEGUNDO (`--max-rps`, `--rps-burst`): teto global sobre
 *     TODAS as requisições do gerador, imposto por este limitador.
 *
 * Limitador (balde de fichas): o balde guarda até `rajada` fichas e recebe
 * `rps` fichas por segundo; cada requisição gasta 1 ficha antes de sair. Começa
 * cheio, então até `rajada` requisições podem sair juntas; depois a vazão
 * sustentada é `rps`. Em qualquer janela de T segundos saem no máximo
 * `rajada + rps × T` requisições. Quem chega sem ficha espera em ordem de
 * chegada (FIFO); essa espera é medida à parte e NÃO entra na latência.
 *
 * Parada: o primeiro erro inesperado (ou o operador, ou a duração máxima)
 * impede o INÍCIO de novas requisições; as que já estavam em voo terminam (ou
 * caem no timeout) e ficam listadas no relatório parcial.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export const PREFIXO_PARADA = "[gerador parado]";

export class ParadaDoGerador extends Error {
  constructor(motivo) {
    super(`${PREFIXO_PARADA} ${motivo}`);
    this.name = "ParadaDoGerador";
  }
}

const contexto = new AsyncLocalStorage();

/**
 * Executa `fn` como controle NEGATIVO: aqui uma recusa (4xx/5xx) é o resultado
 * esperado e não para a rodada. 429, timeout e erro de rede continuam
 * inesperados.
 */
export function comoRecusaEsperada(fn) {
  return contexto.run({ ...(contexto.getStore() ?? {}), recusaEsperada: true }, fn);
}

/** Mede `fn` separando a espera imposta pelo limitador do tempo restante (rede + servidor). */
export async function medirComEspera(fn, agora = () => performance.now()) {
  const marcador = { esperaMs: 0 };
  const t0 = agora();
  try {
    const valor = await contexto.run({ ...(contexto.getStore() ?? {}), marcador }, fn);
    return { valor, totalMs: agora() - t0, esperaMs: marcador.esperaMs };
  } catch (erro) {
    erro.medicao = { totalMs: agora() - t0, esperaMs: marcador.esperaMs };
    throw erro;
  }
}

const dormirReal = (ms) => new Promise((r) => setTimeout(r, ms));

export function criarLimitador({ rps = 0, rajada = 1, agora = () => performance.now(), dormir = dormirReal } = {}) {
  if (!(rps > 0)) return { ativo: false, descricao: "sem limite de requisições por segundo", aguardar: async () => 0 };
  if (!(rajada >= 1)) throw new Error("--rps-burst precisa ser ≥ 1.");
  let fichas = rajada;
  let ultimo = agora();
  let fila = Promise.resolve();
  const repor = () => {
    const t = agora();
    fichas = Math.min(rajada, fichas + ((t - ultimo) * rps) / 1000);
    ultimo = t;
  };
  const tomar = async () => {
    for (;;) {
      repor();
      if (fichas >= 1) {
        fichas -= 1;
        return;
      }
      await dormir(((1 - fichas) * 1000) / rps);
    }
  };
  return {
    ativo: true,
    descricao: `${rps} req/s sustentadas; rajada de até ${rajada} (no máximo ${rajada} + ${rps}×T requisições em T segundos)`,
    async aguardar() {
      const t0 = agora();
      const minha = fila.then(tomar);
      fila = minha.catch(() => {});
      await minha;
      return agora() - t0;
    },
  };
}

export function criarControle({ agora = () => performance.now(), duracaoMaximaMs = 0 } = {}) {
  const inicio = agora();
  const emAndamento = new Map();
  let seq = 0;
  let parada = null;
  let naoIniciadas = 0;
  let picoEmAndamento = 0;
  let avisarParada;
  const quandoParar = new Promise((r) => {
    avisarParada = r;
  });
  const instantaneo = () =>
    [...emAndamento.values()].map((r) => ({ ...r, ha: Math.round(agora() - r.inicioMs), inicioMs: Math.round(r.inicioMs - inicio) }));
  const controle = {
    inicio,
    get parada() {
      return parada;
    },
    get naoIniciadas() {
      return naoIniciadas;
    },
    get picoEmAndamento() {
      return picoEmAndamento;
    },
    get quantidadeEmAndamento() {
      return emAndamento.size;
    },
    parar(motivo, detalhe = "", fase = null) {
      if (parada) return false;
      parada = { motivo, detalhe: String(detalhe).slice(0, 200), fase, aposMs: Math.round(agora() - inicio), emAndamentoNaParada: instantaneo() };
      avisarParada(parada);
      return true;
    },
    /** Resolve quando o gerador para (por qualquer motivo). */
    quandoParar,
    /** Pausa de `ms` que termina antes se o gerador parar. Devolve `false` se parou. */
    async pausa(ms) {
      if (parada) return false;
      let relogio;
      await Promise.race([new Promise((r) => (relogio = setTimeout(r, ms))), quandoParar]);
      clearTimeout(relogio);
      return !parada;
    },
    conferirDuracao() {
      if (duracaoMaximaMs > 0 && agora() - inicio > duracaoMaximaMs) {
        controle.parar("duração máxima da rodada", `${Math.round(duracaoMaximaMs / 1000)} s`);
      }
      return !parada;
    },
    recusarInicio() {
      naoIniciadas += 1;
      throw new ParadaDoGerador(parada?.motivo ?? "parado");
    },
    iniciar(info) {
      const id = ++seq;
      emAndamento.set(id, { id, ...info, inicioMs: agora() });
      picoEmAndamento = Math.max(picoEmAndamento, emAndamento.size);
      return id;
    },
    concluir(id) {
      emAndamento.delete(id);
    },
    emAndamentoAgora: instantaneo,
    async aguardarEmAndamento(limiteMs, dormir = dormirReal) {
      const fim = agora() + limiteMs;
      while (emAndamento.size > 0 && agora() < fim) await dormir(Math.min(50, Math.max(1, fim - agora())));
      return instantaneo();
    },
  };
  return controle;
}

/** Classifica uma resposta HTTP: `null` = segue; texto = falha inesperada (para a rodada). */
export function falhaInesperada(status, recusaEsperada) {
  if (status === 429) return "HTTP 429 (limite de taxa)";
  if (!recusaEsperada && status >= 500) return `HTTP ${status}`;
  return null;
}

/**
 * Transporte com os controles: parada → limitador → timeout → registro de
 * requisição em voo. O corpo é lido aqui dentro, para que o timeout cubra a
 * troca inteira e "em andamento" signifique "ainda sem resposta completa".
 */
export function criarTransporte({
  controle,
  limitador,
  timeoutMs = 30_000,
  fetch: fetchFn = (...a) => globalThis.fetch(...a),
  aoEsperar,
  faseAtual = () => null,
} = {}) {
  return async function requisitarControlado(url, options = {}, info = {}) {
    const ctx = contexto.getStore() ?? {};
    if (controle.parada || !controle.conferirDuracao()) controle.recusarInicio();
    const espera = await limitador.aguardar();
    if (ctx.marcador) ctx.marcador.esperaMs += espera;
    aoEsperar?.(espera);
    if (controle.parada || !controle.conferirDuracao()) controle.recusarInicio();
    const id = controle.iniciar({ metodo: options.method ?? "GET", caminho: info.caminho ?? url, sessao: info.sessao ?? "", acao: info.acao ?? null });
    const abortador = new AbortController();
    const relogio = timeoutMs > 0 ? setTimeout(() => abortador.abort(), timeoutMs) : null;
    try {
      let resposta;
      try {
        resposta = await fetchFn(url, { ...options, signal: abortador.signal });
        const semCorpo = [101, 204, 205, 304].includes(resposta.status);
        const corpo = semCorpo ? null : await resposta.arrayBuffer();
        resposta = new Response(corpo, { status: resposta.status, statusText: resposta.statusText, headers: resposta.headers });
      } catch (erro) {
        const motivo = abortador.signal.aborted ? `tempo esgotado (${timeoutMs} ms)` : `erro de rede: ${erro?.message ?? erro}`;
        controle.parar("falha inesperada", `${motivo} — ${options.method ?? "GET"} ${info.caminho ?? url}`, faseAtual());
        throw new Error(motivo);
      }
      const falha = falhaInesperada(resposta.status, Boolean(ctx.recusaEsperada));
      if (falha) controle.parar("falha inesperada", `${falha} — ${options.method ?? "GET"} ${info.caminho ?? url}`, faseAtual());
      return resposta;
    } finally {
      if (relogio) clearTimeout(relogio);
      controle.concluir(id);
    }
  };
}

/**
 * Relatório de rodada INTERROMPIDA: nunca aprovado; leva o motivo, as amostras
 * coletadas até a parada e o que estava em voo.
 */
export function relatorioInterrompido({ controle, emAndamentoAoFinal, base }) {
  return {
    ...base,
    interrompido: true,
    parada: controle.parada,
    requisicoesNaoIniciadasPorCausaDaParada: controle.naoIniciadas,
    emAndamentoNaParada: controle.parada?.emAndamentoNaParada ?? [],
    emAndamentoAoFinal: emAndamentoAoFinal ?? [],
    aprovado: false,
    reprovacoes: [`rodada interrompida: ${controle.parada?.motivo ?? "?"}${controle.parada?.detalhe ? ` (${controle.parada.detalhe})` : ""}`, ...(base?.reprovacoes ?? [])],
  };
}
