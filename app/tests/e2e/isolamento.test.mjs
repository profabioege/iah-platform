/**
 * Isolamento pela rede: o que um estudante consegue alcançar quando
 * troca identificadores na própria requisição.
 *
 * Aqui não se procura palavra em arquivo. Cada teste é uma requisição
 * HTTP autenticada como uma pessoa e dirigida ao dado de outra — de
 * outro estudante, de outra turma, de outra instituição — e o que se
 * verifica é a resposta do servidor e o que ficou (ou não ficou) no
 * banco depois.
 */

import assert from "node:assert/strict";
import test, { before } from "node:test";

import { acaoRecusada, valorDaAcao } from "./support/http-client.mjs";
import { autenticarConta } from "./support/sessoes.mjs";
import {
  BASE_URL,
  MISSAO_ID,
  OUTRA_TURMA,
  TURMA,
  acao,
  conta,
  consultarBanco,
} from "./support/ambiente.mjs";

const sessaoDe = (turma, perfil, indice) => autenticarConta(turma, perfil, indice);

let alunoA;
let alunoB;
let alunoOutraEscola;
let professorOutraEscola;

before(async () => {
  alunoA = await sessaoDe(TURMA, "aluno", 10);
  alunoB = await sessaoDe(TURMA, "aluno", 11);
  alunoOutraEscola = await sessaoDe(OUTRA_TURMA, "aluno", 0);
  professorOutraEscola = await sessaoDe(OUTRA_TURMA, "professor", 0);

  // A missão precisa estar disponível na turma principal para que os
  // testes negativos falem de um alvo que realmente existe.
  const professor = await sessaoDe(TURMA, "professor", 0);
  await professor.sessao.acao("/professor/turmas", acao("publishLessonMission"), [
    {
      institutionId: TURMA.institutionId,
      classroomId: TURMA.classroomId,
      missionId: MISSAO_ID,
      lessonId: null,
    },
  ]);
  await alunoA.sessao.acao(`/missoes/${MISSAO_ID}`, acao("startMissionAction"), [MISSAO_ID]);
  await alunoA.sessao.acao(`/missoes/${MISSAO_ID}`, acao("saveProductionDraftAction"), [
    MISSAO_ID,
    "Produção do estudante A — não pode vazar para ninguém.",
  ]);
});

test("estudante não alcança a área do professor nem a do gestor", async () => {
  for (const area of ["/professor", "/professor/turmas", "/gestor"]) {
    const { resposta, caminhoFinal } = await alunoA.sessao.navegar(area);
    assert.notEqual(
      caminhoFinal,
      area,
      `${area} não pode abrir para estudante (respondeu ${resposta.status})`,
    );
  }
});

test("professor não alcança a área do gestor (sem herança administrativa)", async () => {
  const { caminhoFinal } = await professorOutraEscola.sessao.navegar("/gestor");
  assert.notEqual(caminhoFinal, "/gestor");
});

test("produção de um estudante não aparece para outro da mesma turma", async () => {
  const trabalho = await alunoB.sessao.acao(
    `/missoes/${MISSAO_ID}`,
    acao("startMissionAction"),
    [MISSAO_ID],
  );
  const conteudo = valorDaAcao(trabalho.texto);
  assert.notEqual(
    conteudo.production,
    "Produção do estudante A — não pode vazar para ninguém.",
    "o trabalho é de quem está na sessão, não do último que escreveu",
  );
});

test("estudante de outra instituição não abre a missão que a turma dele não recebeu", async () => {
  const resposta = await alunoOutraEscola.sessao.acao(
    `/missoes/${MISSAO_ID}`,
    acao("startMissionAction"),
    [MISSAO_ID],
  );
  assert.equal(
    acaoRecusada(resposta),
    true,
    "missão não atribuída à turma precisa ser recusada no servidor",
  );

  // Nem na instituição alheia nem na própria: sem Atividade publicada,
  // não existe registro para essa Missão.
  const gravado = await consultarBanco(
    "select count(*)::int as total from mission_progress where student_id = $1",
    [alunoOutraEscola.registro.referencia],
  );
  assert.equal(gravado[0].total, 0, "nada pode ter sido registrado");

  const vazou = await consultarBanco(
    `select count(*)::int as total from productions
      where student_id = $1 and institution_id = $2`,
    [alunoOutraEscola.registro.referencia, TURMA.institutionId],
  );
  assert.equal(vazou[0].total, 0, "nada pode ter sido gravado na outra instituição");
});

test("a página da missão não atribuída também não abre para o estudante", async () => {
  const resposta = await alunoOutraEscola.sessao.get(`/missoes/${MISSAO_ID}`);
  assert.equal(resposta.status, 404, "conteúdo não publicado para a turma não pode ser exibido");
});

test("professor de outra instituição não devolve nota a estudante que não é seu", async () => {
  const resposta = await professorOutraEscola.sessao.acao(
    "/professor",
    acao("reviewSubmissionAction"),
    [
      {
        classroomId: TURMA.classroomId,
        studentId: alunoA.registro.referencia,
        missionId: MISSAO_ID,
        grade: "C",
        observedCriteria: [],
        feedback: "Tentativa de devolutiva fora da instituição.",
      },
    ],
  );
  assert.equal(acaoRecusada(resposta), true, "a devolutiva cruzando instituição precisa ser recusada");

  const registradas = await consultarBanco(
    "select count(*)::int as total from mission_reviews where student_id = $1 and grade = 'C'",
    [alunoA.registro.referencia],
  );
  assert.equal(registradas[0].total, 0);
});

test("trocar o identificador da turma na requisição não amplia o alcance", async () => {
  const professor = await sessaoDe(TURMA, "professor", 0);
  const resposta = await professor.sessao.acao("/professor/turmas", acao("publishLessonMission"), [
    {
      institutionId: OUTRA_TURMA.institutionId,
      classroomId: OUTRA_TURMA.classroomId,
      missionId: MISSAO_ID,
      lessonId: null,
    },
  ]);
  assert.equal(acaoRecusada(resposta), true, "publicar na turma de outra instituição precisa ser recusado");

  const publicadas = await consultarBanco(
    "select count(*)::int as total from mission_assignments where classroom_id = $1",
    [OUTRA_TURMA.classroomId],
  );
  assert.equal(publicadas[0].total, 0);
});

test("sessão encerrada perde o acesso imediatamente", async () => {
  const { sessao } = await sessaoDe(TURMA, "aluno", 12);
  const antes = await sessao.navegar("/dashboard");
  assert.equal(antes.caminhoFinal, "/dashboard");

  await sessao.sair();
  const depois = await sessao.get("/dashboard");
  assert.ok([302, 307].includes(depois.status), "sem cookie, a área privada fecha");
});

test("as telas usam o papel de menor privilégio, não a chave administrativa", async () => {
  // Se as consultas das telas usassem `service_role`, as policies não
  // teriam efeito e o estudante enxergaria a instituição inteira. A
  // prova aqui é de comportamento: o painel do estudante não traz
  // nenhum registro de outro estudante.
  const { resposta } = await alunoA.sessao.navegar("/dashboard");
  const html = await resposta.text();
  const outros = OUTRA_TURMA.contas
    .filter((c) => c.perfil === "aluno")
    .map((c) => c.email.split("@")[0]);
  for (const identificador of outros) {
    assert.ok(
      !html.includes(identificador),
      `o painel não pode citar ${identificador}, de outra instituição`,
    );
  }
});
