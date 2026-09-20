/**
 * Percurso pedagógico completo — pela rede, com autenticação normal.
 *
 * Cada passo é uma requisição HTTP ao servidor Next: o login emite o
 * cookie do Auth.js, o middleware roda, as Server Actions são as do
 * build. Nenhum cookie é fabricado e nenhum módulo da aplicação é
 * importado por este arquivo.
 *
 * Ordem dos testes importa: eles contam uma história (professor publica
 * → estudante rascunha → sai → volta → entrega → reflete → professor
 * devolve → estudante lê), e o estado no banco é a única coisa que
 * atravessa de um para o outro.
 */

import assert from "node:assert/strict";
import test, { before } from "node:test";

import { SessaoHttp, acaoRecusada, valorDaAcao } from "./support/http-client.mjs";
import { autenticar, senhaDefinitiva } from "./support/sessoes.mjs";
import {
  BASE_URL,
  MISSAO_ID,
  TURMA,
  acao,
  acaoTalvez,
  conta,
  consultarBanco,
} from "./support/ambiente.mjs";

const PROFESSOR = conta(TURMA, "professor");
const ALUNO = conta(TURMA, "aluno", 0);
const SENHA_ALUNO = senhaDefinitiva(ALUNO);
const TEXTO_RASCUNHO = "Primeira versão da investigação — rascunho do estudante sintético.";
const TEXTO_FINAL = "Versão final entregue pelo estudante sintético na homologação.";
const TEXTO_REFLEXAO = "O que mudou no meu entendimento durante a missão sintética.";

let professor;
let aluno;

before(async () => {
  professor = await autenticar(PROFESSOR);
  aluno = await autenticar(ALUNO);
});

test("1. login com credencial individual emite sessão e leva à área do papel", async () => {
  const anonimo = new SessaoHttp(BASE_URL, "anônimo");
  const semSessao = await anonimo.get("/dashboard");
  assert.ok(
    [302, 307].includes(semSessao.status),
    "sem sessão, a área privada não pode responder 200",
  );

  const { resposta, caminhoFinal } = await aluno.navegar("/dashboard");
  assert.equal(resposta.status, 200);
  assert.equal(caminhoFinal, "/dashboard");
  assert.equal(aluno.temSessao, true);
});

test("2. o provisionamento deixou a turma matriculada e visível ao professor", async () => {
  const { resposta } = await professor.navegar("/professor/turmas");
  assert.equal(resposta.status, 200);
  const html = await resposta.text();
  assert.ok(html.includes("1ª série A"), "a turma provisionada deveria aparecer");

  const matriculas = await consultarBanco(
    "select count(*)::int as total from enrollments where classroom_id = $1",
    [TURMA.classroomId],
  );
  assert.equal(matriculas[0].total, TURMA.contas.filter((c) => c.perfil === "aluno").length);
});

test("3. professor disponibiliza a missão para a turma", async () => {
  const resposta = await professor.acao("/professor/turmas", acao("publishLessonMission"), [
    {
      institutionId: TURMA.institutionId,
      classroomId: TURMA.classroomId,
      missionId: MISSAO_ID,
      lessonId: null,
    },
  ]);
  assert.equal(resposta.status, 200);

  const atividades = await consultarBanco(
    "select status from mission_assignments where classroom_id = $1 and mission_id = $2",
    [TURMA.classroomId, MISSAO_ID],
  );
  assert.ok(atividades.length >= 1);
  assert.equal(atividades[0].status, "published");
});

test("4. estudante salva um rascunho e o servidor confirma a gravação", async () => {
  const inicio = await aluno.acao(`/missoes/${MISSAO_ID}`, acao("startMissionAction"), [
    MISSAO_ID,
  ]);
  assert.equal(inicio.status, 200);

  const rascunho = await aluno.acao(
    `/missoes/${MISSAO_ID}`,
    acao("saveProductionDraftAction"),
    [MISSAO_ID, TEXTO_RASCUNHO],
  );
  assert.equal(rascunho.status, 200);
  const trabalho = valorDaAcao(rascunho.texto);
  assert.equal(trabalho.production, TEXTO_RASCUNHO);
  assert.equal(trabalho.productionDeliveredAt, null, "rascunho não é entrega");

  // A confirmação da tela só vale se o banco tiver a mesma coisa.
  const gravado = await consultarBanco(
    "select content, delivered_at from productions where student_id = $1 and mission_id = $2",
    [ALUNO.referencia, MISSAO_ID],
  );
  assert.equal(gravado.length, 1);
  assert.equal(gravado[0].content, TEXTO_RASCUNHO);
  assert.equal(gravado[0].delivered_at, null);
});

test("5. estudante sai e retoma em outro navegador com o rascunho intacto", async () => {
  await aluno.sair();
  assert.equal(aluno.temSessao, false);

  const outroNavegador = new SessaoHttp(BASE_URL, "aluno-outro-navegador");
  const entrada = await outroNavegador.entrar(ALUNO.email, SENHA_ALUNO);
  assert.equal(entrada.ok, true);

  const retomada = await outroNavegador.acao(
    `/missoes/${MISSAO_ID}`,
    acaoTalvez("getStudentWorkAction") ?? acao("startMissionAction"),
    [MISSAO_ID],
  );
  assert.equal(retomada.status, 200);
  assert.equal(valorDaAcao(retomada.texto).production, TEXTO_RASCUNHO);
  aluno = outroNavegador;
});

test("6. estudante conclui a entrega e registra a reflexão", async () => {
  const final = await aluno.acao(`/missoes/${MISSAO_ID}`, acao("saveProductionDraftAction"), [
    MISSAO_ID,
    TEXTO_FINAL,
  ]);
  assert.equal(final.status, 200);

  const entrega = await aluno.acao(
    `/missoes/${MISSAO_ID}`,
    acao("setProductionDeliveredAction"),
    [MISSAO_ID, true],
  );
  assert.equal(entrega.status, 200);
  assert.ok(valorDaAcao(entrega.texto).productionDeliveredAt, "a entrega precisa ter data");

  await aluno.acao(`/missoes/${MISSAO_ID}`, acao("saveReflectionDraftAction"), [
    MISSAO_ID,
    TEXTO_REFLEXAO,
  ]);
  const reflexao = await aluno.acao(
    `/missoes/${MISSAO_ID}`,
    acao("setReflectionRecordedAction"),
    [MISSAO_ID, true],
  );
  assert.equal(reflexao.status, 200);

  const gravado = await consultarBanco(
    `select p.content, p.delivered_at, r.text, r.recorded_at
       from productions p
       left join reflections r on r.student_id = p.student_id and r.mission_id = p.mission_id
      where p.student_id = $1 and p.mission_id = $2`,
    [ALUNO.referencia, MISSAO_ID],
  );
  assert.equal(gravado.length, 1);
  assert.equal(gravado[0].content, TEXTO_FINAL);
  assert.ok(gravado[0].delivered_at, "a entrega precisa estar no banco");
  assert.equal(gravado[0].text, TEXTO_REFLEXAO);
  assert.ok(gravado[0].recorded_at);
});

test("7. reenviar a mesma entrega não duplica nem perde o conteúdo", async () => {
  const repeticao = await aluno.acao(
    `/missoes/${MISSAO_ID}`,
    acao("setProductionDeliveredAction"),
    [MISSAO_ID, true],
  );
  assert.equal(repeticao.status, 200);

  const linhas = await consultarBanco(
    "select count(*)::int as total from productions where student_id = $1 and mission_id = $2",
    [ALUNO.referencia, MISSAO_ID],
  );
  assert.equal(linhas[0].total, 1, "reenvio não pode criar uma segunda entrega");
});

test("8. professor consulta a entrega e registra a devolutiva", async () => {
  const { resposta } = await professor.navegar("/professor");
  assert.equal(resposta.status, 200);

  const devolutiva = await professor.acao("/professor", acao("reviewSubmissionAction"), [
    {
      classroomId: TURMA.classroomId,
      studentId: ALUNO.referencia,
      missionId: MISSAO_ID,
      grade: "A",
      observedCriteria: ["investigacao", "argumentacao"],
      feedback: "Boa investigação: a hipótese ficou clara e sustentada pelas evidências.",
    },
  ]);
  assert.equal(acaoRecusada(devolutiva), false, "a devolutiva do professor da turma precisa passar");

  const registradas = await consultarBanco(
    "select grade, feedback from mission_reviews where student_id = $1 and mission_id = $2",
    [ALUNO.referencia, MISSAO_ID],
  );
  assert.equal(registradas.length, 1);
  assert.equal(registradas[0].grade, "A");
});

test("9. estudante consulta a devolutiva na própria sessão", async () => {
  const trabalho = await aluno.acao(
    `/missoes/${MISSAO_ID}`,
    acaoTalvez("getStudentWorkAction") ?? acao("startMissionAction"),
    [MISSAO_ID],
  );
  const conteudo = valorDaAcao(trabalho.texto);
  assert.ok(conteudo.review, "a devolutiva precisa chegar ao estudante");
  assert.equal(conteudo.review.grade, "A");
});

test("10. uma execução nova da aplicação continua encontrando os registros", async () => {
  // Sessão nova, login novo, processo do servidor com outro cache de
  // requisição: o que sustenta a continuidade é o banco.
  const novaSessao = new SessaoHttp(BASE_URL, "aluno-nova-execucao");
  assert.equal((await novaSessao.entrar(ALUNO.email, SENHA_ALUNO)).ok, true);
  const { resposta } = await novaSessao.navegar("/dashboard");
  assert.equal(resposta.status, 200);

  const persistido = await consultarBanco(
    `select p.delivered_at, r.recorded_at, mr.grade
       from productions p
       left join reflections r on r.student_id = p.student_id and r.mission_id = p.mission_id
       left join mission_reviews mr on mr.student_id = p.student_id and mr.mission_id = p.mission_id
      where p.student_id = $1 and p.mission_id = $2`,
    [ALUNO.referencia, MISSAO_ID],
  );
  assert.ok(persistido[0].delivered_at);
  assert.ok(persistido[0].recorded_at);
  assert.equal(persistido[0].grade, "A");
});
