#!/usr/bin/env node
/**
 * Ensaio da aula do piloto (1ª série A) — contas SINTÉTICAS, pela rede.
 *
 * Cenário (definido pela escola, não ajustável para "passar"):
 *   35 alunos + professor + gestor conectados; no máximo 25 alunos
 *   ENVIANDO ao mesmo tempo (os demais enviam assim que uma vaga libera);
 *   todos concluem produção, registro de uso da IA e reflexão; o
 *   professor acompanha durante o envio e devolve orientação.
 *
 * O limite de 25 é do GERADOR (simula a sala), não da aplicação: nenhuma
 * fila foi introduzida no servidor. Por isso o relatório separa:
 *   - alunos enviando ao mesmo tempo (pico ≤ 25 por construção);
 *   - requisições HTTP simultâneas em voo (o que o servidor sentiu);
 *   - espera no gerador (tempo na fila da simulação, não do servidor);
 *   - tempo total percebido por aluno (espera + envio).
 *
 * Critérios (iguais aos da homologação; reprovação é registrada, não
 * afrouxada): zero erros; integridade completa; p95 login ≤ 2000 ms;
 * leitura da missão ≤ 1000 ms; gravação ≤ 1500 ms; leitura do professor
 * ≤ 1500 ms.
 *
 * Modos:
 *   --modo=local      sobe banco efêmero + build + servidor nesta máquina.
 *                     Mede a aplicação, NÃO a hospedagem.
 *   --modo=hospedado  fala com o endereço publicado (--base-url). Exige:
 *                     --contas=<csv perfil;nome;email;senha_inicial> (saída
 *                     da importação SINTÉTICA, fora do repositório),
 *                     --contas-extra=<csv da turma sintética extra>,
 *                     --institution, --turma, --turma-extra (turma
 *                     sintética adicional da mesma instituição, sem o
 *                     professor), ENSAIO_SENHA_BASE no ambiente (base das
 *                     senhas trocadas no preparo) e, para conferir a
 *                     integridade, NEXT_PUBLIC_SUPABASE_URL +
 *                     SUPABASE_SERVICE_ROLE_KEY + --confirm-project.
 *   Controles do gerador (pilot-gerador-controles.mjs):
 *   --max-rps=<n>     teto global de requisições/s de TODO o gerador (balde
 *                     de fichas); 0 ou ausente = sem teto (o relatório diz).
 *   --rps-burst=<n>   rajada do balde (padrão 1): até n saem juntas; em T s,
 *                     no máximo n + rps×T. Diferente de --peak-submitters
 *                     (alunos enviando) e das requisições em voo (medidas).
 *   --timeout-ms=<n>  limite por requisição, inclusive o corpo (padrão 30000).
 *   --max-duration-s=<n>  duração máxima da rodada (padrão: sem limite).
 *   Parada: o 1º erro inesperado (429, 5xx fora dos controles negativos,
 *   timeout, erro de rede, falha registrada no fluxo), o operador (Ctrl+C)
 *   ou a duração máxima impedem NOVAS requisições; o relatório sai parcial,
 *   com motivo, amostras e o que estava em voo, e nunca aprovado.
 *   --somente-isolamento-turmas  com --modo=hospedado, roda só o isolamento
 *                     entre a turma e a turma extra sobre o trabalho já
 *                     gravado por uma rodada completa (sem escrever nele).
 *
 *   node --experimental-strip-types scripts/pilot-ensaio-1a.mjs --modo=local
 *   node --experimental-strip-types scripts/pilot-ensaio-1a.mjs --modo=hospedado \
 *     --base-url=https://... --contas=C:\piloto\ensaio\credenciais.csv \
 *     --institution=inst-beryon --turma=class-beryon-2026-1a \
 *     --turma-extra=class-beryon-ensaio-extra --confirm-project=<ref> \
 *     --out=C:\piloto\ensaio\resultado.json
 *
 * Nunca imprime senha, cookie ou chave. Só use contas sintéticas.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

import { SessaoHttp, acaoRecusada, valorDaAcao } from "../tests/e2e/support/http-client.mjs";
import {
  PREFIXO_PARADA,
  comoRecusaEsperada,
  criarControle,
  criarLimitador,
  criarTransporte,
  medirComEspera,
  relatorioInterrompido,
} from "./pilot-gerador-controles.mjs";

const LIMITES = {
  errosDeEscrita: 0,
  p95LoginMs: 2000,
  p95LeituraMissaoMs: 1000,
  p95GravacaoMs: 1500,
  p95LeituraProfessorMs: 1500,
};
const MISSAO = "01-a-fabrica-de-noticias";
const PAGINA = `/missoes/${MISSAO}`;
const TRILHA = "/professor/trilha-ia";

function arg(nome, padrao = null) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
}

const MODO = arg("modo", "local");
const ALUNOS = Number(arg("students", "35"));
const PICO = Number(arg("peak-submitters", "25"));
const JANELA_S = Number(arg("entry-window", "60"));
const RASCUNHOS = Number(arg("drafts", "3"));
const DEVOLUTIVAS = Number(arg("reviews", "5"));
// Digitação com salvamento automático (a tela salva ~0,8 s depois que o
// aluno para de digitar): cada aluno grava um rascunho a cada 8–12 s
// durante N minutos, todos ao mesmo tempo, antes do envio final.
const DIGITACAO_MIN = Number(arg("autosave-min", "0"));
const SAIDA = arg("out");
// Só o isolamento entre turmas, sobre o trabalho já gravado por uma rodada
// completa anterior: não escreve produção, reflexão nem devolutiva.
const SOMENTE_ISOLAMENTO = process.argv.includes("--somente-isolamento-turmas");
// Controles do gerador (pilot-gerador-controles.mjs). Sem `--max-rps` não há
// teto de requisições por segundo; o relatório diz isso explicitamente.
const MAX_RPS = Number(arg("max-rps", "0"));
const RAJADA_RPS = Number(arg("rps-burst", "1"));
const TIMEOUT_MS = Number(arg("timeout-ms", "30000"));
const DURACAO_MAX_S = Number(arg("max-duration-s", "0"));

// ------------------------------------------------------------ instrumentos
let enviando = 0;
let picoEnviando = 0;
const amostrasEmVoo = [];
let faseAtual = "preparo";

// O próprio controle agenda a parada por duração máxima (e cancela as esperas do limitador).
const controle = criarControle({ duracaoMaximaMs: DURACAO_MAX_S * 1000, faseAtual: () => faseAtual });
const limitador = criarLimitador({ rps: MAX_RPS, rajada: RAJADA_RPS });
const transporte = criarTransporte({
  controle,
  limitador,
  timeoutMs: TIMEOUT_MS,
  aoEsperar: (ms) => metricas.esperaLimitador.push(ms),
  faseAtual: () => faseAtual,
});

class SessaoMedida extends SessaoHttp {
  async requisitar(caminho, options = {}) {
    // Navegadores mandam Origin em todo POST; o Next confere Origin × Host
    // nas Server Actions. Mandar aqui deixa o ensaio igual ao uso real.
    const comOrigem =
      options.method === "POST" ? { ...options, headers: { ...(options.headers ?? {}), origin: this.baseUrl } } : options;
    const resposta = await transporte(
      `${this.baseUrl}${caminho}`,
      {
        ...comOrigem,
        redirect: "manual",
        headers: { ...(comOrigem.headers ?? {}), ...(this.cookies.size ? { cookie: this.cabecalhoCookie() } : {}) },
      },
      { caminho, sessao: this.rotulo, acao: comOrigem.headers?.["next-action"] ? "Server Action" : null },
    );
    this.guardarCookies(resposta);
    return resposta;
  }
}

const metricas = {
  login: [],
  leituraMissao: [],
  leituraPainelAluno: [],
  gravacao: [],
  autosave: [],
  leituraProfessor: [],
  leituraGestor: [],
  devolutiva: [],
  esperaGerador: [],
  tempoPercebidoEnvio: [],
  // Espera imposta pelo limitador de req/s (por requisição) e tempo completo
  // de cada operação medida (rede + servidor + esperas do gerador).
  esperaLimitador: [],
  tempoCompletoOperacao: [],
};
const erros = [];
const verificacoes = [];

/**
 * Erro INESPERADO: registra e para a rodada (nenhuma requisição nova começa).
 * Uma requisição recusada só porque o gerador já parou não é erro novo.
 * Recusas ESPERADAS (controles negativos) não passam por aqui.
 */
function registrarErro(quem, etapa, detalhe) {
  if (String(detalhe).startsWith(PREFIXO_PARADA)) return;
  erros.push({ quem, etapa, detalhe: String(detalhe).slice(0, 160) });
  controle.parar("erro inesperado", `${quem} · ${etapa}: ${detalhe}`, faseAtual);
}
function verificar(nome, ok, detalhe = "") {
  verificacoes.push({ verificacao: nome, resultado: ok ? "ok" : "FALHOU", detalhe });
}

/**
 * A amostra de cada etapa (julgada pelos LIMITES) exclui a espera que o
 * próprio gerador impôs (limitador de req/s); o tempo completo vai à parte.
 */
async function medir(lista, fn) {
  let medicao;
  try {
    const r = await medirComEspera(fn);
    medicao = r;
    return r.valor;
  } catch (e) {
    // Requisição que nem saiu porque o gerador já tinha parado não é amostra.
    medicao = String(e?.message ?? "").startsWith(PREFIXO_PARADA) ? null : e?.medicao;
    throw e;
  } finally {
    if (medicao) {
      lista.push(medicao.totalMs - medicao.esperaMs);
      metricas.tempoCompletoOperacao.push(medicao.totalMs);
    }
  }
}

/** Interrompe o fluxo principal assim que o gerador parou. */
class InterrupcaoDaRodada extends Error {}
function checarParada() {
  if (controle.parada) throw new InterrupcaoDaRodada(controle.parada.motivo);
}

function percentil(valores, p) {
  if (valores.length === 0) return 0;
  const o = [...valores].sort((a, b) => a - b);
  return Math.round(o[Math.min(o.length - 1, Math.ceil((p / 100) * o.length) - 1)]);
}
function resumo(nome, v) {
  return { etapa: nome, amostras: v.length, p50: percentil(v, 50), p95: percentil(v, 95), max: Math.round(Math.max(0, ...v)) };
}

/** Marcador por aluno no texto: prova que o conteúdo não foi trocado. */
const marcador = (email) => `[m:${createHash("sha256").update(email).digest("hex").slice(0, 10)}]`;

async function chamar(sessao, quem, etapa, lista, pagina, acaoId, args) {
  let r;
  try {
    r = await medir(lista, () => sessao.acao(pagina, acaoId, args));
  } catch (e) {
    registrarErro(quem, etapa, e instanceof Error ? e.message : e);
    return null;
  }
  if (acaoRecusada(r)) {
    registrarErro(quem, etapa, `recusada (HTTP ${r.status})`);
    return null;
  }
  return valorDaAcao(r.texto);
}

async function ler(sessao, quem, etapa, lista, caminho) {
  try {
    const { resposta } = await medir(lista, () => sessao.navegar(caminho));
    const html = await resposta.text();
    if (resposta.status !== 200) registrarErro(quem, etapa, `HTTP ${resposta.status}`);
    return html;
  } catch (e) {
    registrarErro(quem, etapa, e instanceof Error ? e.message : e);
    return "";
  }
}

// ----------------------------------------------------------------- ambiente
async function prepararLocal() {
  const { startHttpHomologation } = await import("./pilot-http-env.mjs");
  const ambiente = await startHttpHomologation({ students: ALUNOS, dbPool: 30 });
  const turma = ambiente.turmas.find((t) => t.prefixo === "beryon");
  // Turma sintética adicional NA MESMA instituição, com outro professor:
  // o professor da 1ª A não pode alcançá-la.
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(ambiente.env.NEXT_PUBLIC_SUPABASE_URL, ambiente.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { provisionPilotClass } = await import("../src/modules/identity/provisioning/pilot-provisioning.ts");
  const extra = await provisionPilotClass(
    admin,
    {
      institution: { id: turma.institutionId, name: "Instituição sintética beryon", slug: turma.institutionId, domain: "beryon.test" },
      academicYear: { id: "ay-beryon-2026", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
      classroom: { id: "class-beryon-extra", name: "Turma sintética extra", grade: "1ª série E.M." },
      teacher: { id: "teacher-beryon-extra", name: "Professor sintético extra", email: "professor.extra@beryon.test" },
      managers: [],
      students: [{ externalId: "aluno-extra-01", name: "Aluno extra sintético", email: "aluno.extra.01@beryon.test" }],
    },
    { dryRun: false, actor: "cli:ensaio-local" },
  );
  const contas = turma.contas.map((c) => ({ perfil: c.perfil, email: c.email, senhaInicial: c.senha, referencia: c.referencia }));
  for (const a of extra.accounts.filter((x) => x.temporaryPassword)) {
    contas.push({ perfil: `${a.kind}-extra`, email: a.email, senhaInicial: a.temporaryPassword, referencia: a.reference });
  }
  return {
    baseUrl: ambiente.baseUrl,
    actions: ambiente.actions,
    institutionId: turma.institutionId,
    classroomId: turma.classroomId,
    turmaExtra: "class-beryon-extra",
    contas,
    admin,
    senhaBase: "Ensaio-local-",
    preparadas: new Set(),
    marcarPreparada: () => {},
    encerrar: async () => {
      const { stopHttpHomologation } = await import("./pilot-http-env.mjs");
      await stopHttpHomologation(ambiente);
    },
    rotulo: "LOCAL (aplicação, banco e gerador na mesma máquina) — não mede a hospedagem",
  };
}

/**
 * Lê os IDs das Server Actions nos chunks do build PUBLICADO (os IDs mudam
 * a cada build). Cada página só é alcançada pelo próprio papel
 * (src/auth.config.ts: `/missoes` só para aluno, `/professor` só para
 * professor); com o papel errado o middleware redireciona e o chunk da
 * página nunca é lido. Por isso a descoberta recebe a sessão e as páginas
 * daquele papel.
 */
async function descobrirAcoesRemotas(baseUrl, sessao, caminhos) {
  const encontrados = new Map();
  const chunks = new Set();
  for (const caminho of caminhos) {
    const { resposta } = await sessao.navegar(caminho);
    const html = await resposta.text();
    for (const m of html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)) chunks.add(m[0]);
  }
  for (const c of chunks) {
    // Pelo transporte do gerador: o arquivo estático também conta no teto de req/s.
    const r = await transporte(`${baseUrl}${c}`, { method: "GET" }, { caminho: c, sessao: "descoberta de ações" });
    const js = await r.text();
    const re = /createServerReference\)?\("([0-9a-f]{40,})"[^)]*?"([A-Za-z0-9_]+)"\)/g;
    let m;
    while ((m = re.exec(js))) encontrados.set(m[2], m[1]);
  }
  return Object.fromEntries(encontrados);
}

/**
 * Isolamento entre turmas da mesma instituição sintética (1ª A × turma
 * extra). Os controles positivos vêm antes dos negativos — o professor
 * extra entra e vê a PRÓPRIA turma; o professor da 1ª A vê as entregas
 * dela — senão um teste negativo passaria com uma sessão que nem entrou.
 * Confere o conteúdo devolvido e o banco, não só o status HTTP.
 */
async function verificarIsolamentoEntreTurmas({ amb, sProf, actions, professorExtra, senhas, alunos }) {
  const paginaTurma = (id) => `/professor/turmas?turma=${encodeURIComponent(id)}`;
  const marcadores = alunos.map((a) => marcador(a.email));
  const atribuicoesNaExtra = async () => {
    if (!amb.admin) return null;
    const { count, error } = await amb.admin
      .from("mission_assignments")
      .select("id", { count: "exact", head: true })
      .eq("classroom_id", amb.turmaExtra);
    return error ? null : (count ?? 0);
  };

  // Estrutura no banco: turma extra na mesma instituição; professor extra só nela.
  let nomeTurmaExtra = null;
  if (amb.admin) {
    const { data: turma } = await amb.admin.from("classrooms").select("institution_id, name").eq("id", amb.turmaExtra).maybeSingle();
    nomeTurmaExtra = turma?.name ?? null;
    verificar("turma extra existe na mesma instituição sintética", turma?.institution_id === amb.institutionId, turma ? "" : "turma ausente no banco");
    const { data: prof } = professorExtra
      ? await amb.admin.from("teachers").select("id").eq("institution_id", amb.institutionId).eq("email", professorExtra.email).maybeSingle()
      : { data: null };
    const { data: vinculos } = prof ? await amb.admin.from("classroom_teachers").select("classroom_id").eq("teacher_id", prof.id) : { data: [] };
    const turmas = (vinculos ?? []).map((v) => v.classroom_id);
    verificar(
      "professor extra vinculado somente à turma extra",
      turmas.length === 1 && turmas[0] === amb.turmaExtra,
      prof ? `${turmas.length} vínculo(s)` : "professor extra ausente no banco",
    );
  }

  // Professor da 1ª A tenta atribuir à turma extra: o retorno e o banco decidem.
  const antes = await atribuicoesNaExtra();
  const tentativa = valorDaAcao(
    (await comoRecusaEsperada(() => sProf.acao(TRILHA, actions.assignAiMissionAction, [{ classroomId: amb.turmaExtra, missionId: MISSAO }]))).texto,
  );
  const depois = await atribuicoesNaExtra();
  verificar(
    "professor da 1ª A NÃO atribui à turma extra (turma existente)",
    tentativa?.ok !== true && depois !== null && depois === antes,
    `retorno ok=${tentativa?.ok ?? "vazio"}${tentativa?.error ? ` (${String(tentativa.error).slice(0, 80)})` : ""}; atribuições na turma extra ${antes}→${depois} (banco)`,
  );

  // Controle positivo: os marcadores da 1ª A aparecem para o professor dela.
  const htmlProf = await (await sProf.navegar(paginaTurma(amb.classroomId))).resposta.text();
  const controle = marcadores.every((m) => htmlProf.includes(m));
  verificar("controle: professor da 1ª A vê as entregas da 1ª A", controle, `${marcadores.filter((m) => htmlProf.includes(m)).length} de ${marcadores.length} marcadores`);

  if (!professorExtra || !senhas.get(professorExtra.email)) {
    verificar("professor extra autentica", false, professorExtra ? "senha não preparada (ver erros de preparo)" : "conta professor-extra ausente");
    verificar("professor extra NÃO vê as entregas da 1ª A", false, "não executado: professor extra sem sessão");
    return;
  }
  const sx = new SessaoMedida(amb.baseUrl, "professor-extra");
  const ex = await sx.entrar(professorExtra.email, senhas.get(professorExtra.email));
  verificar("professor extra autentica", ex.ok === true, ex.ok ? "" : `status ${ex.status}`);
  if (!ex.ok) {
    verificar("professor extra NÃO vê as entregas da 1ª A", false, "não executado: professor extra sem sessão");
    return;
  }
  const propria = await sx.navegar(paginaTurma(amb.turmaExtra));
  const htmlPropria = await propria.resposta.text();
  const vePropria =
    propria.resposta.status === 200 && propria.caminhoFinal.startsWith("/professor/turmas") && Boolean(nomeTurmaExtra) && htmlPropria.includes(nomeTurmaExtra);
  verificar("professor extra acessa a própria turma", vePropria, `HTTP ${propria.resposta.status} → ${propria.caminhoFinal}${vePropria ? "" : "; nome da turma extra ausente na resposta"}`);

  const alheia = await sx.navegar(paginaTurma(amb.classroomId));
  const htmlAlheia = await alheia.resposta.text();
  const vazados = marcadores.filter((m) => htmlAlheia.includes(m)).length;
  verificar(
    "professor extra NÃO vê as entregas da 1ª A",
    controle && vePropria && vazados === 0,
    `HTTP ${alheia.resposta.status} → ${alheia.caminhoFinal}; ${vazados} de ${marcadores.length} marcadores da 1ª A na resposta${controle && vePropria ? "" : "; inconclusivo sem os controles positivos"}`,
  );
  await sx.sair();
}

/** Contagens da 1ª A que uma rodada só de isolamento não pode alterar. */
async function estadoDaTurma(amb) {
  if (!amb.admin) return null;
  const contar = async (tabela, filtro = (q) => q) => {
    const { count } = await filtro(amb.admin.from(tabela).select("id", { count: "exact", head: true }).eq("classroom_id", amb.classroomId));
    return count ?? 0;
  };
  return {
    atribuicoes: await contar("mission_assignments"),
    producoesEntregues: await contar("productions", (q) => q.not("delivered_at", "is", null)),
    reflexoesRegistradas: await contar("reflections", (q) => q.not("recorded_at", "is", null)),
    devolutivas: await contar("mission_reviews"),
  };
}

/** O que a rodada mede e o que NÃO mede — vai explícito no relatório. */
function alcanceDaRodada(etapas, concorrencia) {
  const p95 = (nome) => etapas?.find((e) => e.etapa === nome)?.p95 ?? null;
  return {
    alunosSinteticos: ALUNOS,
    concorrenciaObservada: concorrencia ?? "não medida nesta rodada",
    esperaNoGeradorP95Ms: p95("espera no gerador (fila da simulação)") ?? "não medida nesta rodada",
    tempoCompletoDeEnvioP95Ms: p95("tempo percebido de envio por aluno") ?? "não medido nesta rodada",
    salvamentoAutomaticoPorDigitacao: DIGITACAO_MIN > 0 ? `verificado (${DIGITACAO_MIN} min)` : "NÃO verificado (--autosave-min=0)",
  };
}

const RESSALVA =
  "Resultado de UM ensaio com contas sintéticas. Não comprova capacidade para os 32 alunos da 1ª série A nem eficácia pedagógica.";

async function prepararHospedado() {
  const baseUrl = arg("base-url");
  const contasPath = arg("contas");
  const senhaBase = process.env.ENSAIO_SENHA_BASE;
  for (const [k, v] of Object.entries({ "base-url": baseUrl, contas: contasPath, institution: arg("institution"), turma: arg("turma"), "turma-extra": arg("turma-extra") })) {
    if (!v) throw new Error(`Informe --${k}.`);
  }
  if (!senhaBase || senhaBase.length < 10) throw new Error("Defina ENSAIO_SENHA_BASE (≥ 10 caracteres) no ambiente.");
  if (!/^https:\/\//.test(baseUrl)) throw new Error("--base-url precisa ser HTTPS.");
  const lerContas = (caminho, sufixo = "") =>
    readFileSync(caminho, "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(1)
      .map((l) => {
        const [perfil, , email, senhaInicial] = l.split(";");
        return { perfil: `${perfil}${sufixo}`, email, senhaInicial, referencia: email };
      });
  // --contas-extra: credenciais da turma sintética extra (o professor dela
  // vira "professor-extra", usado na verificação de isolamento).
  const contas = [...lerContas(contasPath), ...(arg("contas-extra") ? lerContas(arg("contas-extra"), "-extra") : [])];
  let admin = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { assertAuthorizedTarget } = await import("./pilot-target-guard.mjs");
    assertAuthorizedTarget(process.env.NEXT_PUBLIC_SUPABASE_URL, {
      confirmProject: arg("confirm-project"),
      operation: "conferir a integridade do ensaio",
    });
    const { createClient } = await import("@supabase/supabase-js");
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  const marcas = `${contasPath}.preparadas`;
  const preparadas = new Set(existsSync(marcas) ? readFileSync(marcas, "utf8").split(/\r?\n/).filter(Boolean) : []);
  return {
    preparadas,
    marcarPreparada: (email) => appendFileSync(marcas, `${email}\n`),
    baseUrl: baseUrl.replace(/\/$/, ""),
    actions: null,
    institutionId: arg("institution"),
    classroomId: arg("turma"),
    turmaExtra: arg("turma-extra"),
    contas,
    admin,
    senhaBase,
    encerrar: async () => {},
    rotulo: `HOSPEDADO (${new URL(baseUrl).host}) — gerador nesta máquina/rede`,
  };
}

/**
 * Senha do ensaio por conta (derivada da base + e-mail). A troca da
 * senha inicial acontece uma vez, fora da medição; contas já preparadas
 * ficam anotadas em `amb.preparadas` para não gerar tentativas de login
 * erradas (que contam no limitador por origem).
 */
function senhaDoEnsaio(amb, conta) {
  return `${amb.senhaBase}${createHash("sha256").update(conta.email).digest("hex").slice(0, 8)}`;
}

async function prepararConta(amb, conta) {
  const senha = senhaDoEnsaio(amb, conta);
  if (amb.preparadas.has(conta.email)) return senha;
  const s = new SessaoMedida(amb.baseUrl, conta.email);
  const e = await s.entrar(conta.email, conta.senhaInicial);
  if (!e.ok) throw new Error(`login inicial falhou (${e.erro ?? e.status})`);
  const troca = await s.enviarFormulario("/entrar/nova-senha", { atual: conta.senhaInicial, nova: senha, confirmacao: senha });
  if (troca.status >= 400) throw new Error(`troca de senha HTTP ${troca.status}`);
  await s.sair();
  amb.marcarPreparada(conta.email);
  return senha;
}

// -------------------------------------------------------------------- ensaio
async function main() {
  const amb = MODO === "hospedado" ? await prepararHospedado() : await prepararLocal();
  const inicioGeral = new Date().toISOString();
  // Operador: o 1º Ctrl+C para os NOVOS envios e gera o relatório parcial; o 2º sai na hora.
  const aoInterromper = () => {
    if (controle.parar("intervenção do operador (Ctrl+C)", "", faseAtual)) {
      console.log("\n■ Parada pedida pelo operador: nenhuma requisição nova; aguardando as que estão em voo...");
    } else {
      console.log("\n■ Segunda interrupção: saindo sem relatório.");
      process.exit(130);
    }
  };
  process.on("SIGINT", aoInterromper);
  console.log(`Gerador: limitador ${limitador.descricao}; timeout ${TIMEOUT_MS} ms por requisição; duração máxima ${DURACAO_MAX_S > 0 ? `${DURACAO_MAX_S} s` : "sem limite"}.`);
  const parcial = { alunos: [] };
  try {
    const alunos = amb.contas.filter((c) => c.perfil === "aluno").slice(0, ALUNOS);
    parcial.alunos = alunos;
    const professor = amb.contas.find((c) => c.perfil === "professor");
    const gestor = amb.contas.find((c) => c.perfil === "gestor");
    const professorExtra = amb.contas.find((c) => c.perfil === "professor-extra");
    if (alunos.length !== ALUNOS) throw new Error(`Esperava ${ALUNOS} alunos sintéticos; há ${alunos.length}.`);
    if (!professor || !gestor) throw new Error("Faltam as contas sintéticas de professor e gestor.");
    console.log(`Ensaio ${amb.rotulo}\n${ALUNOS} alunos + professor + gestor; pico de ${PICO} enviando; entrada em ${JANELA_S}s.`);

    console.log("Preparo (fora da medição): troca da senha inicial das contas sintéticas...");
    const senhas = new Map();
    const todas = [...alunos, professor, gestor, ...(professorExtra ? [professorExtra] : [])];
    for (const c of todas) {
      try {
        senhas.set(c.email, await prepararConta(amb, c));
      } catch (e) {
        registrarErro(c.email, "preparo", e instanceof Error ? e.message : e);
      }
      if (controle.parada) break;
    }
    checarParada();

    faseAtual = "leitura das ações e atribuição";
    const sProf = new SessaoMedida(amb.baseUrl, "professor");
    const eProf = await sProf.entrar(professor.email, senhas.get(professor.email));
    if (!eProf.ok) throw new Error("Professor sintético não entrou.");
    // Ações do professor: lidas com a sessão do professor, nas páginas dele.
    const actions = amb.actions ?? (await descobrirAcoesRemotas(amb.baseUrl, sProf, [TRILHA, "/professor/turmas"]));
    const exigir = (nomes) => {
      for (const nome of nomes) {
        if (!actions[nome]) throw new Error(`Server Action ${nome} não encontrada no build.`);
      }
    };
    exigir(["assignAiMissionAction", "reviewSubmissionAction"]);

    if (SOMENTE_ISOLAMENTO) {
      console.log("Rodada só de isolamento entre turmas (sem escrita no trabalho da 1ª A)...");
      const estadoAntes = await estadoDaTurma(amb);
      await verificarIsolamentoEntreTurmas({ amb, sProf, actions, professorExtra, senhas, alunos });
      const estadoDepois = await estadoDaTurma(amb);
      checarParada();
      verificar(
        "trabalho da 1ª A preservado nesta rodada",
        estadoAntes !== null && JSON.stringify(estadoAntes) === JSON.stringify(estadoDepois),
        JSON.stringify(estadoDepois),
      );
      const reprov = [
        ...verificacoes.filter((v) => v.resultado !== "ok").map((v) => `verificação: ${v.verificacao}`),
        ...(erros.length > 0 ? [`${erros.length} erro(s) no preparo`] : []),
      ];
      const resultado = {
        modo: `${amb.rotulo} — somente isolamento entre turmas`,
        inicio: inicioGeral,
        alcance: alcanceDaRodada(null, null),
        estadoDaTurma1A: estadoDepois,
        verificacoes,
        erros: erros.slice(0, 50),
        totalErros: erros.length,
        aprovado: reprov.length === 0,
        reprovacoes: reprov,
        ressalva: `${RESSALVA} Esta rodada cobre só o isolamento entre turmas; fluxo e tempos vêm da rodada completa anterior.`,
      };
      console.table(verificacoes);
      console.log("Erros:", erros.length === 0 ? "nenhum" : erros.slice(0, 10));
      console.log(reprov.length === 0 ? "\n✔ APROVADO nas verificações de isolamento." : `\n✖ REPROVADO: ${reprov.join("; ")}`);
      console.log(resultado.ressalva);
      if (SAIDA) writeFileSync(SAIDA, `${JSON.stringify(resultado, null, 2)}\n`);
      if (reprov.length > 0) process.exitCode = 1;
      return;
    }

    // ---- Professor atribui à 1ª A (e não alcança a turma extra).
    const atrib = await chamar(sProf, "professor", "atribuir", [], TRILHA, actions.assignAiMissionAction, [
      { classroomId: amb.classroomId, missionId: MISSAO },
    ]);
    verificar("professor atribui a Missão 01 à 1ª A", atrib?.ok === true);
    const extraAtrib = await comoRecusaEsperada(() =>
      sProf.acao(TRILHA, actions.assignAiMissionAction, [{ classroomId: amb.turmaExtra, missionId: MISSAO }]),
    );
    verificar("professor da 1ª A NÃO atribui à turma sintética extra", valorDaAcao(extraAtrib.texto)?.ok !== true);

    // Ações do aluno: lidas com a sessão de um aluno, na página da missão —
    // que só existe para ele depois da atribuição (missoes/[id]/page.tsx).
    if (!amb.actions) {
      const sDesc = new SessaoMedida(amb.baseUrl, "descoberta (aluno)");
      const eDesc = await sDesc.entrar(alunos[0].email, senhas.get(alunos[0].email) ?? "");
      if (!eDesc.ok) throw new Error("Aluno sintético não entrou para a leitura das ações da missão.");
      Object.assign(actions, await descobrirAcoesRemotas(amb.baseUrl, sDesc, [PAGINA]));
      await sDesc.sair();
    }
    exigir(["startMissionAction", "saveProductionDraftAction", "saveAiEvidenceDraftAction", "setProductionDeliveredAction", "saveReflectionDraftAction", "setReflectionRecordedAction"]);

    checarParada();
    const inicio = performance.now();
    // ---- Fase 1: entrada distribuída e leitura da missão (todos os alunos).
    faseAtual = "fase 1 (entrada)";
    console.log("Fase 1: entrada e leitura da missão...");
    const sessoes = new Map();
    await Promise.all(
      alunos.map(async (c, i) => {
        if (!(await controle.pausa((i / alunos.length) * JANELA_S * 1000))) return;
        const s = new SessaoMedida(amb.baseUrl, c.email);
        const e = await medir(metricas.login, () => s.entrar(c.email, senhas.get(c.email) ?? "")).catch((err) => ({ ok: false, erro: err.message }));
        if (!e.ok) return registrarErro(c.email, "login", e.erro ?? "sem sessão");
        sessoes.set(c.email, s);
        await ler(s, c.email, "painel do aluno", metricas.leituraPainelAluno, "/dashboard");
        const html = await ler(s, c.email, "leitura da missão", metricas.leituraMissao, PAGINA);
        if (html && !html.includes("EM13CHS101")) registrarErro(c.email, "leitura da missão", "missão sem os dois eixos");
      }),
    );
    checarParada();

    // ---- Professor e gestor acompanham enquanto os alunos enviam.
    const sGest = new SessaoMedida(amb.baseUrl, "gestor");
    await sGest.entrar(gestor.email, senhas.get(gestor.email));
    let envioTerminou = false;
    const acompanhamento = (async () => {
      while (!envioTerminou && !controle.parada) {
        await ler(sProf, "professor", "acompanhamento", metricas.leituraProfessor, `/professor/turmas?turma=${encodeURIComponent(amb.classroomId)}`);
        await ler(sProf, "professor", "painel da trilha", metricas.leituraProfessor, TRILHA);
        await ler(sGest, "gestor", "painel do gestor", metricas.leituraGestor, "/gestor");
        amostrasEmVoo.push(controle.quantidadeEmAndamento);
        await controle.pausa(2000);
      }
    })();

    // ---- Fase 1b: digitação com salvamento automático (opcional).
    if (DIGITACAO_MIN > 0) {
      faseAtual = "fase 1b (digitação)";
      console.log(`Fase 1b: ${DIGITACAO_MIN} min de digitação com salvamento automático...`);
      const fimDigitacao = performance.now() + DIGITACAO_MIN * 60_000;
      await Promise.all(
        [...sessoes.entries()].map(async ([email, s]) => {
          await chamar(s, email, "iniciar", metricas.gravacao, PAGINA, actions.startMissionAction, [MISSAO]);
          let n = 0;
          while (performance.now() < fimDigitacao && !controle.parada) {
            if (!(await controle.pausa(8000 + Math.random() * 4000))) break;
            n += 1;
            await chamar(s, email, "salvamento automático", metricas.autosave, PAGINA, actions.saveProductionDraftAction, [
              MISSAO,
              `Rascunho em digitação ${n} ${marcador(email)} ${"texto ".repeat(Math.min(200, n * 10))}`,
            ]);
          }
        }),
      );
    }

    // ---- Fase 2: envio com no máximo PICO alunos ao mesmo tempo (gerador).
    faseAtual = "fase 2 (envio)";
    console.log(`Fase 2: envio (≤ ${PICO} alunos ao mesmo tempo)...`);
    const fila = [...sessoes.entries()];
    const inicioEnvio = performance.now();
    async function trabalhador() {
      for (;;) {
        if (controle.parada) return; // nenhum aluno novo começa a enviar depois da parada
        const proximo = fila.shift();
        if (!proximo) return;
        const [email, s] = proximo;
        const espera = performance.now() - inicioEnvio;
        metricas.esperaGerador.push(espera);
        enviando += 1;
        picoEnviando = Math.max(picoEnviando, enviando);
        const tEnvio = performance.now();
        const m = marcador(email);
        await chamar(s, email, "iniciar", metricas.gravacao, PAGINA, actions.startMissionAction, [MISSAO]);
        await chamar(s, email, "registro de IA", metricas.gravacao, PAGINA, actions.saveAiEvidenceDraftAction, [
          MISSAO,
          { tool: "Assistente (sintético)", request: `Pedido ${m}`, response: "Resposta sintética", verification: "Conferi fonte e data.", decision: "Descartei a afirmação sem fonte." },
        ]);
        for (let i = 1; i <= RASCUNHOS; i += 1) {
          await chamar(s, email, "rascunho", metricas.gravacao, PAGINA, actions.saveProductionDraftAction, [MISSAO, `Rascunho ${i} ${m}`]);
        }
        await chamar(s, email, "rascunho final", metricas.gravacao, PAGINA, actions.saveProductionDraftAction, [MISSAO, `Produção final ${m}`]);
        const ent = await chamar(s, email, "entrega", metricas.gravacao, PAGINA, actions.setProductionDeliveredAction, [MISSAO, true]);
        if (ent && !ent.productionDeliveredAt) registrarErro(email, "entrega", "sem data de entrega");
        await chamar(s, email, "reflexão", metricas.gravacao, PAGINA, actions.saveReflectionDraftAction, [MISSAO, `Reflexão ${m}`]);
        await chamar(s, email, "registro da reflexão", metricas.gravacao, PAGINA, actions.setReflectionRecordedAction, [MISSAO, true]);
        enviando -= 1;
        metricas.tempoPercebidoEnvio.push(espera + (performance.now() - tEnvio));
      }
    }
    await Promise.all(Array.from({ length: Math.min(PICO, sessoes.size) }, trabalhador));
    envioTerminou = true;
    await acompanhamento;
    checarParada();

    // ---- Professor devolve orientação a alguns alunos.
    faseAtual = "fase 3 (devolutivas)";
    console.log("Fase 3: devolutivas do professor...");
    // Eixos da Missão 01 (src/content/missions/01-a-fabrica-de-noticias.ts);
    // o servidor confere contra o arquivo da missão e recusa se divergirem.
    const axes = {
      discipline: { skill: { code: "EM13CHS101" } },
      ai: { competencyIds: ["ia-compreender-01", "ia-avaliar-01", "ia-criar-01"] },
    };
    const idsAlunos = new Map();
    if (amb.admin) {
      const { data } = await amb.admin.from("students").select("id, email").eq("institution_id", amb.institutionId).in("email", alunos.map((a) => a.email));
      for (const r of data ?? []) idsAlunos.set(r.email, r.id);
    }
    for (const c of alunos.slice(0, DEVOLUTIVAS)) {
      const studentId = idsAlunos.get(c.email) ?? c.referencia;
      await chamar(sProf, "professor", "devolutiva", metricas.devolutiva, `/professor/turmas?turma=${encodeURIComponent(amb.classroomId)}`, actions.reviewSubmissionAction, [
        {
          classroomId: amb.classroomId,
          studentId,
          missionId: MISSAO,
          grade: "Bom",
          observedCriteria: [],
          feedback: "Devolutiva sintética do ensaio.",
          axes: {
            discipline: { level: "atingido", observedCriteria: [], note: "", skillCode: axes.discipline.skill.code },
            ai: { level: "em_desenvolvimento", observedCriteria: [], note: "", competencyIds: [...axes.ai.competencyIds] },
          },
        },
      ]);
    }
    const duracaoS = Math.round((performance.now() - inicio) / 1000);

    // ---- Persistência em nova sessão + isolamento entre alunos.
    checarParada();
    faseAtual = "verificações";
    console.log("Verificações: nova sessão, isolamento e computador compartilhado...");
    const [a1, a2] = alunos;
    const nova = new SessaoMedida(amb.baseUrl, a1.email);
    await nova.entrar(a1.email, senhas.get(a1.email));
    const trabalho = await chamar(nova, a1.email, "retomada", [], PAGINA, actions.startMissionAction, [MISSAO]);
    verificar("nova sessão recupera a produção entregue", trabalho?.production === `Produção final ${marcador(a1.email)}` && Boolean(trabalho?.productionDeliveredAt));
    verificar("nova sessão recupera a devolutiva do professor", Boolean(trabalho?.review?.axes));
    const paginaA1 = await (await nova.navegar(PAGINA)).resposta.text();
    verificar("aluno não vê a produção de outro aluno", !paginaA1.includes(marcador(a2.email)));
    // Aluno tenta avaliar a entrega de um colega (ainda sem devolutiva):
    // não pode executar — o banco é quem confirma, logo abaixo.
    const colega = alunos[Math.min(DEVOLUTIVAS, alunos.length - 1)];
    const idColega = idsAlunos.get(colega.email) ?? colega.referencia;
    const revisaoAluno = await comoRecusaEsperada(() =>
      nova.acao(PAGINA, actions.reviewSubmissionAction, [
        {
          classroomId: amb.classroomId,
          studentId: idColega,
          missionId: MISSAO,
          grade: "Tentativa do aluno",
          observedCriteria: [],
          feedback: "Tentativa indevida (ensaio).",
          axes: {
            discipline: { level: "atingido", observedCriteria: [], note: "", skillCode: axes.discipline.skill.code },
            ai: { level: "atingido", observedCriteria: [], note: "", competencyIds: [...axes.ai.competencyIds] },
          },
        },
      ]),
    );
    const executou = Boolean(valorDaAcao(revisaoAluno.texto)?.review);
    let gravouRevisaoIndevida = false;
    if (amb.admin) {
      const { count } = await amb.admin
        .from("mission_reviews")
        .select("id", { count: "exact", head: true })
        .eq("student_id", idColega)
        .eq("mission_id", MISSAO);
      gravouRevisaoIndevida = (count ?? 0) > 0;
    }
    verificar(
      "aluno não consegue avaliar a entrega de um colega",
      !executou && !gravouRevisaoIndevida,
      `HTTP ${revisaoAluno.status}${amb.admin ? "; conferido no banco" : "; banco não conferido"}`,
    );
    // Computador compartilhado: sair e entrar com outro aluno no mesmo "navegador".
    await nova.sair();
    const depoisDeSair = await comoRecusaEsperada(() => nova.acao(PAGINA, actions.startMissionAction, [MISSAO]));
    verificar("depois de sair, a sessão anterior não acessa nada", acaoRecusada(depoisDeSair) || !valorDaAcao(depoisDeSair.texto)?.production);
    await nova.entrar(a2.email, senhas.get(a2.email));
    const t2 = await chamar(nova, a2.email, "troca de aluno", [], PAGINA, actions.startMissionAction, [MISSAO]);
    verificar("troca de aluno no mesmo navegador mostra só o trabalho do novo aluno", t2?.production === `Produção final ${marcador(a2.email)}`);
    await verificarIsolamentoEntreTurmas({ amb, sProf, actions, professorExtra, senhas, alunos });

    checarParada();
    // ---- Integridade: decide o banco, não a tela.
    let integridade = null;
    if (amb.admin) {
      const ids = [...idsAlunos.values()];
      const { data: prods } = await amb.admin.from("productions").select("student_id, content, delivered_at, ai_verification").eq("classroom_id", amb.classroomId).eq("mission_id", MISSAO).in("student_id", ids);
      const { data: refl } = await amb.admin.from("reflections").select("student_id, text, recorded_at").eq("classroom_id", amb.classroomId).eq("mission_id", MISSAO).in("student_id", ids);
      const { data: revs } = await amb.admin.from("mission_reviews").select("student_id").eq("classroom_id", amb.classroomId).eq("mission_id", MISSAO).in("student_id", ids);
      const emailDe = new Map([...idsAlunos.entries()].map(([e, id]) => [id, e]));
      const porAluno = (rows) => new Map((rows ?? []).map((r) => [r.student_id, r]));
      integridade = {
        alunos: ids.length,
        producoesEntregues: (prods ?? []).filter((p) => p.delivered_at).length,
        reflexoesRegistradas: (refl ?? []).filter((r) => r.recorded_at).length,
        registrosDeIA: (prods ?? []).filter((p) => p.ai_verification).length,
        devolutivas: (revs ?? []).length,
        duplicadas: (prods ?? []).length - porAluno(prods).size + (refl ?? []).length - porAluno(refl).size,
        conteudoTrocado: (prods ?? []).filter((p) => !p.content.includes(marcador(emailDe.get(p.student_id)))).length +
          (refl ?? []).filter((r) => !r.text.includes(marcador(emailDe.get(r.student_id)))).length,
      };
    }

    // ---- Relatório.
    const etapas = montarEtapas();
    const reprov = [];
    if (erros.length > LIMITES.errosDeEscrita) reprov.push(`${erros.length} erro(s)`);
    const cmp = [
      ["login", metricas.login, LIMITES.p95LoginMs],
      ["leitura da missão", metricas.leituraMissao, LIMITES.p95LeituraMissaoMs],
      // Cada conjunto é julgado sozinho: misturar os salvamentos automáticos
      // (muitos e rápidos) com o envio final diluiria o p95 do pico.
      ["gravação (envio)", metricas.gravacao, LIMITES.p95GravacaoMs],
      ["gravação (salvamento automático)", metricas.autosave, LIMITES.p95GravacaoMs],
      ["leitura do professor", metricas.leituraProfessor, LIMITES.p95LeituraProfessorMs],
    ];
    for (const [nome, v, lim] of cmp) if (percentil(v, 95) > lim) reprov.push(`p95 ${nome} ${percentil(v, 95)}ms > ${lim}ms`);
    if (!integridade) reprov.push("integridade não conferida (sem acesso administrativo de leitura)");
    else {
      if (integridade.producoesEntregues !== ALUNOS) reprov.push(`entregas ${integridade.producoesEntregues}/${ALUNOS}`);
      if (integridade.reflexoesRegistradas !== ALUNOS) reprov.push(`reflexões ${integridade.reflexoesRegistradas}/${ALUNOS}`);
      if (integridade.registrosDeIA !== ALUNOS) reprov.push(`registros de IA ${integridade.registrosDeIA}/${ALUNOS}`);
      if (integridade.devolutivas !== Math.min(DEVOLUTIVAS, ALUNOS)) reprov.push(`devolutivas ${integridade.devolutivas}`);
      if (integridade.duplicadas > 0) reprov.push("duplicatas");
      if (integridade.conteudoTrocado > 0) reprov.push("conteúdo trocado entre alunos");
    }
    for (const v of verificacoes) if (v.resultado !== "ok") reprov.push(`verificação: ${v.verificacao}`);

    const resultado = {
      modo: amb.rotulo,
      inicio: inicioGeral,
      cenario: cenarioDaRodada(),
      geradorControles: controlesDoGerador(),
      concorrencia: concorrenciaDaRodada(),
      interrompido: false,
      duracaoS,
      etapas,
      integridade,
      verificacoes,
      erros: erros.slice(0, 50),
      totalErros: erros.length,
      limites: LIMITES,
      aprovado: reprov.length === 0,
      reprovacoes: reprov,
      ressalva: RESSALVA,
    };
    resultado.alcance = alcanceDaRodada(etapas, resultado.concorrencia);
    console.log(`\n== Ensaio 1ª A — ${duracaoS}s`);
    console.table(etapas);
    console.log("Concorrência:", resultado.concorrencia);
    console.log("Alcance:", resultado.alcance);
    console.log("Integridade:", integridade);
    console.table(verificacoes);
    console.log("Erros:", erros.length === 0 ? "nenhum" : erros.slice(0, 10));
    console.log(reprov.length === 0 ? "\n✔ APROVADO nos critérios declarados." : `\n✖ REPROVADO: ${reprov.join("; ")}`);
    console.log(resultado.ressalva);
    if (SAIDA) writeFileSync(SAIDA, `${JSON.stringify(resultado, null, 2)}\n`);
    if (reprov.length > 0) process.exitCode = 1;
  } catch (e) {
    // Rodada interrompida (erro inesperado, operador ou duração máxima): relatório
    // PARCIAL, nunca aprovado. Outros erros (configuração) seguem para fora.
    if (!(e instanceof InterrupcaoDaRodada) && !controle.parada) throw e;
    if (!controle.parada) controle.parar("erro inesperado", e instanceof Error ? e.message : String(e), faseAtual);
    await escreverRelatorioInterrompido({ amb, inicioGeral, alunos: parcial.alunos, erroFinal: e });
  } finally {
    controle.encerrar();
    process.off("SIGINT", aoInterromper);
    await amb.encerrar();
  }
}

function montarEtapas() {
  return [
    resumo("login", metricas.login),
    resumo("leitura da missão", metricas.leituraMissao),
    resumo("painel do aluno", metricas.leituraPainelAluno),
    resumo("gravação (por chamada)", metricas.gravacao),
    resumo("salvamento automático (digitação)", metricas.autosave),
    resumo("leitura do professor", metricas.leituraProfessor),
    resumo("painel do gestor", metricas.leituraGestor),
    resumo("devolutiva do professor", metricas.devolutiva),
    resumo("espera no gerador (fila da simulação)", metricas.esperaGerador),
    resumo("tempo percebido de envio por aluno", metricas.tempoPercebidoEnvio),
    resumo("espera no limitador de req/s (por requisição)", metricas.esperaLimitador),
    resumo("tempo completo por operação (com esperas do gerador)", metricas.tempoCompletoOperacao),
  ];
}

function cenarioDaRodada() {
  return { digitacaoMin: DIGITACAO_MIN, alunos: ALUNOS, picoEnviandoConfigurado: PICO, janelaEntradaS: JANELA_S, rascunhosPorAluno: RASCUNHOS, devolutivas: DEVOLUTIVAS };
}

/** Os três limites do gerador, separados (ver pilot-gerador-controles.mjs). */
function controlesDoGerador() {
  return {
    alunosEnviandoNoMaximo: PICO,
    limiteRequisicoesPorSegundo: MAX_RPS > 0 ? { rps: MAX_RPS, rajada: RAJADA_RPS, descricao: limitador.descricao } : "sem limite (não informado como teto)",
    requisicoesSimultaneas: "não limitadas diretamente; medidas em concorrencia.picoRequisicoesHttpEmVoo",
    timeoutPorRequisicaoMs: TIMEOUT_MS,
    duracaoMaximaS: DURACAO_MAX_S > 0 ? DURACAO_MAX_S : "sem limite",
    latenciasJulgadasSemEsperaDoGerador: true,
  };
}

function concorrenciaDaRodada() {
  return {
    picoAlunosEnviando: picoEnviando,
    picoRequisicoesHttpEmVoo: controle.picoEmAndamento,
    mediaRequisicoesEmVooAmostrada: amostrasEmVoo.length ? Math.round((amostrasEmVoo.reduce((a, b) => a + b, 0) / amostrasEmVoo.length) * 10) / 10 : 0,
  };
}

/** Contagem de leitura no banco (só se houver acesso administrativo); não muda nada. */
async function integridadeParcial(amb, alunos) {
  if (!amb.admin || alunos.length === 0) return null;
  const { data: est } = await amb.admin.from("students").select("id").eq("institution_id", amb.institutionId).in("email", alunos.map((a) => a.email));
  const ids = (est ?? []).map((r) => r.id);
  if (ids.length === 0) return { alunos: 0 };
  const contar = async (tabela, filtro) => {
    const { count } = await filtro(amb.admin.from(tabela).select("id", { count: "exact", head: true }).eq("classroom_id", amb.classroomId).eq("mission_id", MISSAO).in("student_id", ids));
    return count ?? 0;
  };
  return {
    alunos: ids.length,
    producoesEntregues: await contar("productions", (q) => q.not("delivered_at", "is", null)),
    reflexoesRegistradas: await contar("reflections", (q) => q.not("recorded_at", "is", null)),
    devolutivas: await contar("mission_reviews", (q) => q),
  };
}

async function escreverRelatorioInterrompido({ amb, inicioGeral, alunos, erroFinal }) {
  const p = controle.parada;
  console.log(`\n■ Rodada INTERROMPIDA na ${p.fase ?? faseAtual}: ${p.motivo}${p.detalhe ? ` — ${p.detalhe}` : ""}`);
  console.log(`  Em voo no instante da parada: ${p.emAndamentoNaParada.length}. Aguardando até ${Math.min(TIMEOUT_MS, 15000)} ms...`);
  const emAndamentoAoFinal = await controle.aguardarEmAndamento(Math.min(TIMEOUT_MS, 15000));
  let integridade = null;
  try {
    integridade = await integridadeParcial(amb, alunos);
  } catch (e) {
    integridade = { erro: e instanceof Error ? e.message : String(e) };
  }
  const etapas = montarEtapas();
  const resultado = relatorioInterrompido({
    controle,
    emAndamentoAoFinal,
    base: {
      modo: amb.rotulo,
      inicio: inicioGeral,
      cenario: cenarioDaRodada(),
      geradorControles: controlesDoGerador(),
      concorrencia: concorrenciaDaRodada(),
      etapas,
      integridadeParcial: integridade,
      verificacoes,
      erros: erros.slice(0, 50),
      totalErros: erros.length,
      ultimoErroDoFluxo: erroFinal instanceof InterrupcaoDaRodada ? null : String(erroFinal?.message ?? erroFinal ?? "").slice(0, 200),
      limites: LIMITES,
      reprovacoes: [],
      ressalva: `${RESSALVA} Rodada interrompida: os números valem só até a parada e não aprovam nada.`,
    },
  });
  resultado.alcance = alcanceDaRodada(etapas, resultado.concorrencia);
  console.table(etapas);
  console.log("Requisições não iniciadas por causa da parada:", resultado.requisicoesNaoIniciadasPorCausaDaParada);
  console.log("Ainda em voo ao final da espera:", emAndamentoAoFinal.length);
  console.log(`\n✖ REPROVADO: ${resultado.reprovacoes.join("; ")}`);
  if (SAIDA) writeFileSync(SAIDA, `${JSON.stringify(resultado, null, 2)}\n`);
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
