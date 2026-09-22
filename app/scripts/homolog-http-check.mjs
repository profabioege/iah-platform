#!/usr/bin/env node
/**
 * Verificacao HTTP de homologacao — feita nesta tarefa, fora dos
 * scripts existentes do piloto (nao usa banco efemero nem provisiona
 * pela CLI: reaproveita as contas sinteticas ja criadas direto no
 * projeto iah-beryon-homolog). Fala com um servidor Next de producao
 * real, pela rede, com login normal — mesmo mecanismo de
 * tests/e2e/support/http-client.mjs (nenhum cookie fabricado).
 *
 * Uso:
 *   node scripts/homolog-http-check.mjs run       # build + start + testes 1
 *   node scripts/homolog-http-check.mjs restart   # mata o servidor desta
 *                                                  # tarefa, sobe outro,
 *                                                  # confirma persistencia
 *   node scripts/homolog-http-check.mjs stop      # encerra o servidor
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { writeFileSync, readFileSync, existsSync, openSync } from "node:fs";
import { join } from "node:path";

import { SessaoHttp, acaoRecusada, valorDaAcao } from "../tests/e2e/support/http-client.mjs";
import { discoverServerActions } from "./pilot-http-env.mjs";

const APP_DIR = process.cwd();
const STATE_FILE = join(APP_DIR, ".homolog-run-state.json");
const RESULTS_FILE = join(APP_DIR, ".homolog-run-results.json");
const LOG_FILE = join(APP_DIR, ".homolog-run-server.log");
const NEXT_BIN = "node_modules/next/dist/bin/next";

// As senhas NAO ficam neste arquivo (que e versionado): vem de
// app/.env.local (gitignored), nas 3 variaveis abaixo. Sao as mesmas
// usadas ao provisionar as contas sinteticas em iah-beryon-homolog.
const _env = readEnvLocal();
function _senhaObrigatoria(nomeVar) {
  const v = _env[nomeVar];
  if (!v) {
    throw new Error(
      `Defina ${nomeVar} em app/.env.local (senha da conta sintetica de homologacao).`,
    );
  }
  return v;
}
const CONTAS = {
  aluno: {
    email: "aluno.a@homolog-teste.example",
    senha: _senhaObrigatoria("IAH_HOMOLOG_SENHA_ALUNO"),
  },
  alunoErrada: {
    email: "aluno.a@homolog-teste.example",
    senha: `${_senhaObrigatoria("IAH_HOMOLOG_SENHA_ALUNO")}-errada-proposital`,
  },
  professor: {
    email: "professor.teste@homolog-teste.example",
    senha: _senhaObrigatoria("IAH_HOMOLOG_SENHA_PROFESSOR"),
  },
  gestor: {
    email: "gestor.teste@homolog-teste.example",
    senha: _senhaObrigatoria("IAH_HOMOLOG_SENHA_GESTOR"),
  },
};
const MISSAO_ID = "mission-homolog-1";

function agora() {
  return new Date().toISOString();
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", cwd: APP_DIR });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} saiu com codigo ${code}`))));
  });
}

async function waitForHttp(url, timeoutMs = 120_000) {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(url, { redirect: "manual" });
      if (resposta.status < 500) return;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Servidor nao respondeu em ${url} dentro do tempo.`);
}

async function portLivre(port, tentativas = 40) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
      void r;
    } catch {
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function salvarEstado(estado) {
  writeFileSync(STATE_FILE, JSON.stringify(estado, null, 2));
}
function lerEstado() {
  if (!existsSync(STATE_FILE)) throw new Error(`Estado nao encontrado (${STATE_FILE}). Rode "run" primeiro.`);
  return JSON.parse(readFileSync(STATE_FILE, "utf8"));
}

function matarProcesso(pid) {
  try {
    process.kill(pid);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Reabre o estado sintetico de producao/reflexao/devolutiva ANTES de
 * cada `run` completo.
 *
 * Causa comprovada da falha "aluno_ve_producao_e_reflexao_apos_reinicio":
 * production/reflection sao gravadas com id FIXO
 * (`production-<aluno>-<missao>`), entao ficam "delivered"/"recorded"
 * permanentemente entre execucoes deste script (persistencia real,
 * funcionando como projetado). A propria aplicacao recusa
 * corretamente reescrever conteudo depois da entrega
 * ("A producao ja foi entregue - reabra antes de editar." /
 * "A reflexao ja foi registrada..." - visto em .homolog-run-server.log
 * apos o `run` de 21/09). Ou seja: nao e bug de persistencia nem
 * asserção errada - e o fixture de teste colidindo com entrega
 * anterior (inclusive a validacao de RLS feita por SQL direto numa
 * rodada anterior desta mesma tarefa). Reabrir aqui, antes de cada
 * `run`, e o equivalente a "matricula nova" para o mesmo aluno/missao:
 * mesmo caminho administrativo (service_role) ja documentado em
 * admin-client.ts para provisionamento - nao e usado nos fluxos
 * pedagogicos normais nem altera RLS/policies.
 */
async function reabrirFixtureDeMissao() {
  const env = readEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Nao foi possivel reabrir o fixture: NEXT_PUBLIC_SUPABASE_URL/" +
        "SUPABASE_SERVICE_ROLE_KEY ausentes em app/.env.local.",
    );
  }
  const alvo = [
    { tabela: "mission_reviews", id: "review-student-homolog-1-mission-homolog-1" },
    { tabela: "reflections", id: "reflection-student-homolog-1-mission-homolog-1" },
    { tabela: "productions", id: "production-student-homolog-1-mission-homolog-1" },
  ];
  for (const { tabela, id } of alvo) {
    const resp = await fetch(`${url}/rest/v1/${tabela}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`Falha ao reabrir fixture (${tabela}): HTTP ${resp.status}`);
    }
  }
}

function readEnvLocal() {
  const raw = readFileSync(join(APP_DIR, ".env.local"), "utf8");
  const out = {};
  for (const linha of raw.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function subirServidor(port) {
  const out = openSync(LOG_FILE, "a");
  const server = spawn(
    process.execPath,
    [NEXT_BIN, "start", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: APP_DIR,
      env: {
        ...process.env,
        AUTH_TRUST_HOST: "true",
        AUTH_URL: `http://127.0.0.1:${port}`,
        NEXTAUTH_URL: `http://127.0.0.1:${port}`,
      },
      detached: true,
      stdio: ["ignore", out, out],
    },
  );
  server.unref();
  await waitForHttp(`http://127.0.0.1:${port}/entrar`);
  return server.pid;
}

async function testesLogin(baseUrl, passos) {
  // 1. Senha incorreta rejeitada
  const s1 = new SessaoHttp(baseUrl, "aluno-senha-errada");
  const r1 = await s1.entrar(CONTAS.alunoErrada.email, CONTAS.alunoErrada.senha);
  passos.push({ passo: "senha_incorreta_rejeitada", ok: r1.ok === false, detalhe: { status: r1.status, temErro: !!r1.erro } });

  // 2. Sem sessao: areas privadas bloqueadas
  const anonimo = new SessaoHttp(baseUrl, "anonimo");
  const semDash = await anonimo.get("/dashboard");
  const semProf = await anonimo.get("/professor");
  const semGestor = await anonimo.get("/gestor");
  passos.push({
    passo: "sem_sessao_bloqueado",
    ok: [semDash, semProf, semGestor].every((r) => [302, 307].includes(r.status)),
    detalhe: { dashboard: semDash.status, professor: semProf.status, gestor: semGestor.status },
  });

  // 3. Login correto: aluno, professor, gestor
  const aluno = new SessaoHttp(baseUrl, "aluno");
  const rAluno = await aluno.entrar(CONTAS.aluno.email, CONTAS.aluno.senha);
  const professor = new SessaoHttp(baseUrl, "professor");
  const rProfessor = await professor.entrar(CONTAS.professor.email, CONTAS.professor.senha);
  const gestor = new SessaoHttp(baseUrl, "gestor");
  const rGestor = await gestor.entrar(CONTAS.gestor.email, CONTAS.gestor.senha);
  passos.push({
    passo: "login_correto_tres_perfis",
    ok: rAluno.ok && rProfessor.ok && rGestor.ok,
    detalhe: { aluno: rAluno.ok, professor: rProfessor.ok, gestor: rGestor.ok },
  });

  // 4. Cada perfil acessa a propria area
  const alunoDash = await aluno.navegar("/dashboard");
  const profArea = await professor.navegar("/professor");
  const gestorArea = await gestor.navegar("/gestor");
  passos.push({
    passo: "cada_perfil_acessa_propria_area",
    ok: alunoDash.resposta.status === 200 && profArea.resposta.status === 200 && gestorArea.resposta.status === 200,
    detalhe: { aluno: alunoDash.resposta.status, professor: profArea.resposta.status, gestor: gestorArea.resposta.status },
  });

  // 5. Bloqueio cruzado entre perfis (sem heranca administrativa)
  const alunoNoProf = await aluno.get("/professor");
  const alunoNoGestor = await aluno.get("/gestor");
  const profNoGestor = await professor.get("/gestor");
  const gestorNoProf = await gestor.get("/professor");
  passos.push({
    passo: "bloqueio_cruzado_entre_perfis",
    ok: [alunoNoProf, alunoNoGestor, profNoGestor, gestorNoProf].every((r) => [302, 307].includes(r.status)),
    detalhe: {
      aluno_para_professor: alunoNoProf.status,
      aluno_para_gestor: alunoNoGestor.status,
      professor_para_gestor: profNoGestor.status,
      gestor_para_professor: gestorNoProf.status,
    },
  });

  // 6. Logout efetivo
  await professor.sair();
  const profDepoisLogout = await professor.get("/professor");
  passos.push({
    passo: "logout_efetivo",
    ok: !professor.temSessao && [302, 307].includes(profDepoisLogout.status),
    detalhe: { temSessaoDepois: professor.temSessao, status: profDepoisLogout.status },
  });

  return { aluno, professor: new SessaoHttp(baseUrl, "professor-relogado"), gestor };
}

async function fazerProducaoEReflexao(baseUrl, actions, passos) {
  const aluno = new SessaoHttp(baseUrl, "aluno-producao");
  await aluno.entrar(CONTAS.aluno.email, CONTAS.aluno.senha);

  const textoRascunho = "Rascunho sintetico gravado pela interface na verificacao de homologacao.";
  const textoFinal = "Versao final sintetica entregue pela interface na verificacao de homologacao.";
  const textoReflexao = "Reflexao sintetica registrada pela interface na verificacao de homologacao.";

  const inicio = await aluno.acao(`/missoes/${MISSAO_ID}`, actions.startMissionAction, [MISSAO_ID]);
  const rascunho = await aluno.acao(`/missoes/${MISSAO_ID}`, actions.saveProductionDraftAction, [MISSAO_ID, textoRascunho]);
  const final = await aluno.acao(`/missoes/${MISSAO_ID}`, actions.saveProductionDraftAction, [MISSAO_ID, textoFinal]);
  const entrega = await aluno.acao(`/missoes/${MISSAO_ID}`, actions.setProductionDeliveredAction, [MISSAO_ID, true]);
  const reflexaoRascunho = await aluno.acao(`/missoes/${MISSAO_ID}`, actions.saveReflectionDraftAction, [MISSAO_ID, textoReflexao]);
  const reflexao = await aluno.acao(`/missoes/${MISSAO_ID}`, actions.setReflectionRecordedAction, [MISSAO_ID, true]);

  passos.push({
    passo: "aluno_grava_producao_e_reflexao_pela_interface",
    ok: [inicio, rascunho, final, entrega, reflexaoRascunho, reflexao].every((r) => !acaoRecusada(r)),
    detalhe: {
      inicio: inicio.status,
      producaoEntregueEm: valorDaAcao(entrega.texto)?.productionDeliveredAt ?? null,
      reflexaoRegistradaEm: valorDaAcao(reflexao.texto)?.reflectionRecordedAt ?? null,
    },
  });

  // Professor confere e da devolutiva
  const professor = new SessaoHttp(baseUrl, "professor-revisor");
  await professor.entrar(CONTAS.professor.email, CONTAS.professor.senha);
  const devolutiva = await professor.acao("/professor", actions.reviewSubmissionAction, [
    {
      classroomId: "class-homolog-1",
      studentId: "student-homolog-1",
      missionId: MISSAO_ID,
      grade: "A",
      observedCriteria: ["investigacao"],
      feedback: "Devolutiva sintetica registrada na verificacao de homologacao.",
    },
  ]);
  passos.push({
    passo: "professor_registra_devolutiva",
    ok: !acaoRecusada(devolutiva),
    detalhe: { status: devolutiva.status },
  });

  return { textoFinal, textoReflexao };
}

async function confirmarPersistenciaAposReinicio(baseUrl, actions, passos, textos) {
  const novaSessaoAluno = new SessaoHttp(baseUrl, "aluno-pos-reinicio");
  const loginPosReinicio = await novaSessaoAluno.entrar(CONTAS.aluno.email, CONTAS.aluno.senha);
  passos.push({
    passo: "login_aluno_apos_reinicio_do_servidor",
    ok: loginPosReinicio.ok,
    detalhe: { status: loginPosReinicio.status },
  });

  const trabalho = await novaSessaoAluno.acao(`/missoes/${MISSAO_ID}`, actions.startMissionAction, [MISSAO_ID]);
  const conteudo = valorDaAcao(trabalho.texto);
  passos.push({
    passo: "aluno_ve_producao_e_reflexao_apos_reinicio",
    ok: conteudo?.production === textos.textoFinal && !!conteudo?.productionDeliveredAt && !!conteudo?.review,
    detalhe: {
      producaoBate: conteudo?.production === textos.textoFinal,
      entregue: !!conteudo?.productionDeliveredAt,
      temDevolutiva: !!conteudo?.review,
      nota: conteudo?.review?.grade ?? null,
    },
  });

  const novaSessaoProfessor = new SessaoHttp(baseUrl, "professor-pos-reinicio");
  const loginProfPosReinicio = await novaSessaoProfessor.entrar(CONTAS.professor.email, CONTAS.professor.senha);
  const areaProf = await novaSessaoProfessor.navegar("/professor");
  passos.push({
    passo: "professor_acompanha_apos_reinicio",
    ok: loginProfPosReinicio.ok && areaProf.resposta.status === 200,
    detalhe: { loginOk: loginProfPosReinicio.ok, statusArea: areaProf.resposta.status },
  });

  const novaSessaoGestor = new SessaoHttp(baseUrl, "gestor-pos-reinicio");
  const loginGestorPosReinicio = await novaSessaoGestor.entrar(CONTAS.gestor.email, CONTAS.gestor.senha);
  passos.push({
    passo: "gestor_login_apos_reinicio",
    ok: loginGestorPosReinicio.ok,
    detalhe: { status: loginGestorPosReinicio.status },
  });
}

async function main() {
  const modo = process.argv[2];
  if (!["run", "restart", "stop"].includes(modo)) {
    console.error("Uso: node scripts/homolog-http-check.mjs [run|restart|stop]");
    process.exit(1);
  }

  if (modo === "stop") {
    const estado = lerEstado();
    const morto = matarProcesso(estado.pid);
    console.log(JSON.stringify({ parado: morto, pid: estado.pid }));
    return;
  }

  const passos = [];
  let resultado = { inicioEm: agora(), modo };

  if (modo === "run") {
    console.log("0/4 Reabrindo fixture sintetico (producao/reflexao/devolutiva)...");
    await reabrirFixtureDeMissao();

    console.log("1/4 Build de producao (le app/.env.local automaticamente)...");
    await run(process.execPath, [NEXT_BIN, "build"]);

    const port = await findFreePort();
    console.log(`2/4 Subindo servidor em 127.0.0.1:${port}...`);
    const pid = await subirServidor(port);
    salvarEstado({ pid, port, baseUrl: `http://127.0.0.1:${port}`, criadoEm: agora() });

    console.log("3/4 Descobrindo Server Actions do build...");
    const actions = await discoverServerActions(APP_DIR);
    salvarEstado({ pid, port, baseUrl: `http://127.0.0.1:${port}`, criadoEm: agora(), actions });

    console.log("4/4 Rodando testes de login/isolamento/producao...");
    const baseUrl = `http://127.0.0.1:${port}`;
    await testesLogin(baseUrl, passos);
    const textos = await fazerProducaoEReflexao(baseUrl, actions, passos);
    resultado = { ...resultado, port, pid, baseUrl, passos, textos, fimEm: agora() };
  } else if (modo === "restart") {
    const estado = lerEstado();
    console.log(`Encerrando servidor desta tarefa (PID ${estado.pid})...`);
    matarProcesso(estado.pid);
    const livre = await portLivre(estado.port);
    if (!livre) throw new Error(`Porta ${estado.port} nao liberou a tempo.`);

    console.log(`Subindo novo servidor na mesma porta ${estado.port}...`);
    const novoPid = await subirServidor(estado.port);
    salvarEstado({ ...estado, pid: novoPid, reiniciadoEm: agora() });

    const baseUrl = estado.baseUrl;
    const textosAnteriores = JSON.parse(readFileSync(RESULTS_FILE, "utf8")).textos;
    await confirmarPersistenciaAposReinicio(baseUrl, estado.actions, passos, textosAnteriores);
    resultado = { ...resultado, port: estado.port, pid: novoPid, baseUrl, passos, fimEm: agora() };
  }

  writeFileSync(RESULTS_FILE, JSON.stringify(resultado, null, 2));
  console.log("=== RESULTADO ===");
  console.log(JSON.stringify(passos.map((p) => ({ passo: p.passo, ok: p.ok })), null, 2));
}

await main();
