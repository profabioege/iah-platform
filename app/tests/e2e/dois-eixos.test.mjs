/**
 * Dois eixos (D-053) — o fluxo inteiro pela rede, com login normal.
 *
 * Professor atribui a Missão 01 da Trilha IA & Humanidades (ligada a
 * História, EM13CHS101) → aluno produz, registra o uso da IA e reflete →
 * professor avalia os dois eixos separados → aluno lê os dois →
 * professor monta a lista de exercícios da mesma habilidade com itens
 * REVISADOS do banco → aluno responde e a lista aparece ligada à Missão
 * nos percursos dele e no painel da trilha.
 *
 * Nenhum módulo da aplicação é importado: só HTTP, as Server Actions do
 * build e consultas ao banco de teste para conferir o que ficou gravado.
 * Contas sintéticas próprias (alunos 30–32) para não cruzar com as
 * outras suítes.
 */

import assert from "node:assert/strict";
import test, { before } from "node:test";

import { acaoRecusada, textoVisivel, valorDaAcao } from "./support/http-client.mjs";
import { autenticar } from "./support/sessoes.mjs";
import { MISSAO_IA_ID, OUTRA_TURMA, TURMA, acao, conta, consultarBanco } from "./support/ambiente.mjs";

const PROFESSOR = conta(TURMA, "professor");
const ALUNO = conta(TURMA, "aluno", 30);
const SEM_REGISTRO = conta(TURMA, "aluno", 31);
const PAGINA = `/missoes/${MISSAO_IA_ID}`;
const TRILHA = "/professor/trilha-ia";

const EVIDENCIA = {
  tool: "Assistente de texto (sintético)",
  request: "Escreva uma manchete falsa e convincente sobre a nossa escola.",
  response: "Escola sintética é a primeira do país a substituir provas por IA.",
  verification: "Procurei a fonte e a data: não existem. Afirmação absoluta sem evidência.",
  decision: "Descartei a manchete; usei só a análise de por que ela engana.",
};

const NIVEIS = {
  discipline: {
    level: "atingido",
    observedCriteria: [],
    note: "Identificou autoria, origem e limites de cada item.",
    skillCode: "EM13CHS101",
  },
  ai: {
    level: "em_desenvolvimento",
    observedCriteria: [],
    note: "Registrou a resposta da IA; a verificação pode ir além da fonte.",
    competencyIds: ["ia-compreender-01", "ia-avaliar-01"],
  },
};

let professor;
let aluno;
let semRegistro;
let listaId;

before(async () => {
  professor = await autenticar(PROFESSOR);
  aluno = await autenticar(ALUNO);
  semRegistro = await autenticar(SEM_REGISTRO);
});

test("1. sem missão atribuída, o aluno vê os dois eixos nos percursos, aguardando", async () => {
  const { status, html } = await aluno.html("/dashboard");
  assert.equal(status, 200);
  const texto = textoVisivel(html);
  assert.match(texto, /Meus percursos/);
  assert.match(texto, /Trilha IA & Humanidades/);
  for (const area of ["Ciências Humanas", "Linguagens", "Matemática", "Ciências da Natureza"]) {
    assert.ok(texto.includes(area), `área ${area} nos percursos`);
  }
});

test("2. professor atribui a Missão de IA pela trilha; aluno não consegue atribuir", async () => {
  const { html } = await professor.html(TRILHA);
  assert.match(textoVisivel(html), /Atribuir à turma/);

  const recusada = await aluno.acao(TRILHA, acao("assignAiMissionAction"), [
    { classroomId: TURMA.classroomId, missionId: MISSAO_IA_ID },
  ]);
  // O middleware tira o aluno da área do professor (redirecionamento) antes
  // da ação; se chegasse à ação, ela devolveria { ok: false }.
  const retornoAluno = recusada.status === 200 ? valorDaAcao(recusada.texto) : null;
  assert.ok(recusada.status !== 200 || acaoRecusada(recusada) || retornoAluno?.ok === false, "aluno não atribui missão");

  const resposta = await professor.acao(TRILHA, acao("assignAiMissionAction"), [
    { classroomId: TURMA.classroomId, missionId: MISSAO_IA_ID },
  ]);
  assert.deepEqual(valorDaAcao(resposta.texto), { ok: true });
  const atribuicoes = await consultarBanco(
    "select status, lesson_id from mission_assignments where classroom_id = $1 and mission_id = $2",
    [TURMA.classroomId, MISSAO_IA_ID],
  );
  assert.equal(atribuicoes.length, 1);
  assert.equal(atribuicoes[0].status, "published");

  const outraEscola = await professor.acao(TRILHA, acao("assignAiMissionAction"), [
    { classroomId: OUTRA_TURMA.classroomId, missionId: MISSAO_IA_ID },
  ]);
  assert.equal(valorDaAcao(outraEscola.texto)?.ok, false, "turma de outra escola é recusada");
});

test("3. a missão vira a próxima atividade do aluno e mostra os dois objetivos", async () => {
  const percursos = textoVisivel((await aluno.html("/dashboard")).html);
  assert.match(percursos, /Começar a Missão 1/);
  assert.match(percursos, /História · EM13CHS101/);

  // A tela da Missão é um componente cliente: o HTML traz a especificação
  // da Missão (os dois eixos) que ele recebe do servidor.
  const { status, html } = await aluno.html(PAGINA);
  assert.equal(status, 200);
  assert.ok(html.includes("EM13CHS101"), "eixo disciplinar chega à tela");
  assert.ok(html.includes("ia-avaliar-01"), "eixo de IA chega à tela");
});

test("4. entrega sem o registro de uso da IA é recusada pelo servidor", async () => {
  const pagina = `/missoes/${MISSAO_IA_ID}`;
  await semRegistro.acao(pagina, acao("startMissionAction"), [MISSAO_IA_ID]);
  await semRegistro.acao(pagina, acao("saveProductionDraftAction"), [MISSAO_IA_ID, "Produção sem registro de IA."]);
  const entrega = await semRegistro.acao(pagina, acao("setProductionDeliveredAction"), [MISSAO_IA_ID, true]);
  assert.equal(acaoRecusada(entrega), true);
  const [linha] = await consultarBanco(
    "select status from productions where student_id = $1 and mission_id = $2",
    [SEM_REGISTRO.referencia, MISSAO_IA_ID],
  );
  assert.equal(linha.status, "draft");
});

test("5. aluno produz, registra o uso da IA, entrega e reflete — tudo persiste", async () => {
  await aluno.acao(PAGINA, acao("startMissionAction"), [MISSAO_IA_ID]);
  const registro = await aluno.acao(PAGINA, acao("saveAiEvidenceDraftAction"), [MISSAO_IA_ID, EVIDENCIA]);
  assert.equal(acaoRecusada(registro), false);
  await aluno.acao(PAGINA, acao("saveProductionDraftAction"), [MISSAO_IA_ID, "Relatório de auditoria do aluno sintético."]);
  const entrega = await aluno.acao(PAGINA, acao("setProductionDeliveredAction"), [MISSAO_IA_ID, true]);
  assert.equal(acaoRecusada(entrega), false);
  assert.ok(valorDaAcao(entrega.texto).productionDeliveredAt);
  await aluno.acao(PAGINA, acao("saveReflectionDraftAction"), [MISSAO_IA_ID, "A IA escreveu rápido; checar levou mais tempo."]);
  await aluno.acao(PAGINA, acao("setReflectionRecordedAction"), [MISSAO_IA_ID, true]);

  const [linha] = await consultarBanco(
    `select p.content, p.status, p.ai_tool, p.ai_verification, p.ai_decision, r.text, r.recorded_at
       from productions p join reflections r on r.student_id = p.student_id and r.mission_id = p.mission_id
      where p.student_id = $1 and p.mission_id = $2`,
    [ALUNO.referencia, MISSAO_IA_ID],
  );
  assert.equal(linha.status, "delivered");
  assert.equal(linha.content, "Relatório de auditoria do aluno sintético.");
  assert.equal(linha.ai_verification, EVIDENCIA.verification);
  assert.equal(linha.ai_decision, EVIDENCIA.decision);
  assert.ok(linha.recorded_at);
});

test("5b. produção reaberta com a reflexão registrada: o servidor devolve o estado verdadeiro", async () => {
  const [antes] = await consultarBanco(
    "select recorded_at, text from reflections where student_id = $1 and mission_id = $2",
    [ALUNO.referencia, MISSAO_IA_ID],
  );
  const reaberta = await aluno.acao(PAGINA, acao("setProductionDeliveredAction"), [MISSAO_IA_ID, false]);
  assert.equal(acaoRecusada(reaberta), false);

  // Retomada (nova leitura): rascunho + reflexão ainda registrada — a
  // interface usa este estado para voltar à Produção, não à "entrega".
  const trabalho = valorDaAcao((await aluno.acao(PAGINA, acao("startMissionAction"), [MISSAO_IA_ID])).texto);
  assert.equal(trabalho.productionDeliveredAt, null);
  assert.ok(trabalho.reflectionRecordedAt);
  const [linha] = await consultarBanco(
    `select p.status, p.delivered_at, r.recorded_at, r.text
       from productions p join reflections r on r.student_id = p.student_id and r.mission_id = p.mission_id
      where p.student_id = $1 and p.mission_id = $2`,
    [ALUNO.referencia, MISSAO_IA_ID],
  );
  assert.equal(linha.status, "draft");
  assert.equal(linha.delivered_at, null);
  assert.deepEqual(linha.recorded_at, antes.recorded_at, "a reflexão não é apagada nem desfeita");
  assert.equal(linha.text, antes.text);

  const entregue = await aluno.acao(PAGINA, acao("setProductionDeliveredAction"), [MISSAO_IA_ID, true]);
  assert.equal(acaoRecusada(entregue), false);
  assert.ok(valorDaAcao(entregue.texto).productionDeliveredAt);
});

test("6. professor vê o registro de IA separado e avalia os dois eixos", async () => {
  const turmas = `/professor/turmas?turma=${encodeURIComponent(TURMA.classroomId)}`;
  const { status, html } = await professor.html(turmas);
  assert.equal(status, 200);
  assert.ok(html.includes(EVIDENCIA.verification), "o registro de uso da IA chega ao professor");

  const base = {
    classroomId: TURMA.classroomId,
    studentId: ALUNO.referencia,
    missionId: MISSAO_IA_ID,
    grade: "Bom",
    observedCriteria: [],
    feedback: "História bem trabalhada; aprofunde a verificação da resposta da IA.",
  };
  const semEixos = await professor.acao(turmas, acao("reviewSubmissionAction"), [base]);
  assert.equal(acaoRecusada(semEixos), true, "avaliação de um conceito só é recusada");

  const habilidadeTrocada = await professor.acao(turmas, acao("reviewSubmissionAction"), [
    { ...base, axes: { ...NIVEIS, discipline: { ...NIVEIS.discipline, skillCode: "EM13CHS103" } } },
  ]);
  assert.equal(acaoRecusada(habilidadeTrocada), true, "a habilidade avaliada é a da missão");

  const ok = await professor.acao(turmas, acao("reviewSubmissionAction"), [{ ...base, axes: NIVEIS }]);
  assert.equal(acaoRecusada(ok), false);
  const [gravado] = await consultarBanco(
    "select discipline_level, discipline_skill, ai_level, ai_competencies from mission_reviews where student_id = $1 and mission_id = $2",
    [ALUNO.referencia, MISSAO_IA_ID],
  );
  assert.equal(gravado.discipline_level, "atingido");
  assert.equal(gravado.discipline_skill, "EM13CHS101");
  assert.equal(gravado.ai_level, "em_desenvolvimento");
  assert.deepEqual(gravado.ai_competencies, NIVEIS.ai.competencyIds);
});

test("6b. depois da avaliação, reabrir reflexão ou produção é recusado e nada muda", async () => {
  const consulta = `select p.status, p.delivered_at, r.recorded_at, m.reviewed_at
       from productions p
       join reflections r on r.student_id = p.student_id and r.mission_id = p.mission_id
       join mission_reviews m on m.student_id = p.student_id and m.mission_id = p.mission_id
      where p.student_id = $1 and p.mission_id = $2`;
  const [antes] = await consultarBanco(consulta, [ALUNO.referencia, MISSAO_IA_ID]);

  const reflexao = await aluno.acao(PAGINA, acao("setReflectionRecordedAction"), [MISSAO_IA_ID, false]);
  assert.equal(acaoRecusada(reflexao), true, "reabrir a reflexão avaliada é recusado");
  const producao = await aluno.acao(PAGINA, acao("setProductionDeliveredAction"), [MISSAO_IA_ID, false]);
  assert.equal(acaoRecusada(producao), true, "reabrir a produção avaliada é recusado");

  const [depois] = await consultarBanco(consulta, [ALUNO.referencia, MISSAO_IA_ID]);
  assert.deepEqual(depois, antes);
  assert.equal(depois.status, "delivered");
});

test("6c. 'Último acesso' no painel do professor sai em horário de Brasília (servidor em UTC)", async () => {
  const [progresso] = await consultarBanco(
    "select last_access_at from mission_progress where student_id = $1 and mission_id = $2",
    [ALUNO.referencia, MISSAO_IA_ID],
  );
  const opcoes = { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" };
  const instante = new Date(progresso.last_access_at);
  const brasilia = instante.toLocaleString("pt-BR", { ...opcoes, timeZone: "America/Sao_Paulo" });
  const utc = instante.toLocaleString("pt-BR", { ...opcoes, timeZone: "UTC" });
  assert.notEqual(brasilia, utc);

  const texto = textoVisivel((await professor.html(`/professor/turmas?turma=${encodeURIComponent(TURMA.classroomId)}`)).html);
  assert.ok(texto.includes(`Último acesso ${brasilia}`), `esperado "Último acesso ${brasilia}" na renderização inicial`);
  assert.equal(texto.includes(`Último acesso ${utc}`), false, "não pode sair em UTC");
});

test("7. aluno lê os dois eixos; o painel da trilha separa disciplina e IA", async () => {
  const trabalho = valorDaAcao((await aluno.acao(PAGINA, acao("startMissionAction"), [MISSAO_IA_ID])).texto);
  assert.equal(trabalho.review.axes.discipline.level, "atingido");
  assert.equal(trabalho.review.axes.ai.level, "em_desenvolvimento");

  const texto = textoVisivel((await professor.html(TRILHA)).html);
  assert.match(texto, /Avaliados nos 2 eixos/);
  assert.match(texto, /Disciplina: não evidenciado 0 · em desenvolvimento 0 · atingido 1/i);
  assert.match(texto, /IA: não evidenciado 0 · em desenvolvimento 1/i);
  assert.match(texto, /atingiram o objetivo da disciplina sem evidenciar a competência em IA/);
});

test("8. professor monta a lista da mesma habilidade com itens revisados; aluno responde", async () => {
  const banco = `/professor/banco-de-questoes?turma=${encodeURIComponent(TURMA.classroomId)}&habilidade=bncc-em13chs101`;
  const versoes = [`qv:${TURMA.institutionId}:chs101-01:1`, `qv:${TURMA.institutionId}:chs101-02:1`];
  const aprovadas = await consultarBanco("select id from question_versions where id = any($1) and status = 'aprovada'", [versoes]);
  assert.equal(aprovadas.length, 2, "só itens aprovados entram na lista");

  const envio = await professor.enviarFormularioCom(banco, 'name="versionIds"', {
    versionIds: versoes,
    title: "Fontes e narrativas — exercícios da Missão 1",
    kind: "fixacao",
  });
  assert.equal(envio.status, 303);
  listaId = decodeURIComponent(envio.destino.split("/listas/")[1]);
  const [lista] = await consultarBanco("select target_skill_id, status from practice_lists where id = $1", [listaId]);
  assert.equal(lista.target_skill_id, "bncc-em13chs101");

  const caminho = `/dashboard/listas/${encodeURIComponent(listaId)}`;
  const gabarito = await consultarBanco(
    `select i.id, k.answer_key from practice_list_items i
       join question_version_keys k on k.version_id = i.question_version_id where i.list_id = $1`,
    [listaId],
  );
  const campos = Object.fromEntries(gabarito.map((g) => [`item:${g.id}`, g.answer_key]));
  const resposta = await aluno.enviarFormularioCom(caminho, 'name="listId"', { ...campos, intent: "entregar" });
  assert.equal(resposta.status, 303);
  assert.match(textoVisivel((await aluno.html(caminho)).html), /Você acertou 2 de 2/);
  const [tentativa] = await consultarBanco(
    "select status, score_correct, score_total from list_attempts where list_id = $1 and student_id = $2",
    [listaId, ALUNO.referencia],
  );
  assert.equal(tentativa?.status, "entregue", "as respostas do aluno ficaram gravadas");
  assert.equal(tentativa.score_correct, 2);
});

test("9. a lista aparece ligada à Missão nos percursos e no painel da trilha", async () => {
  const percursos = textoVisivel((await aluno.html("/dashboard")).html);
  assert.match(percursos, /Exercícios ligados ao tema/);
  assert.match(percursos, /Fontes e narrativas — exercícios da Missão 1/);

  const painel = textoVisivel((await professor.html(TRILHA)).html);
  assert.match(painel, /Fontes e narrativas — exercícios da Missão 1/);
  assert.match(painel, /1 entrega\(s\)/);
});

test("10. outra escola não alcança a missão, o registro nem o painel desta turma", async () => {
  const professorOutra = await autenticar(conta(OUTRA_TURMA, "professor"));
  const alunoOutra = await autenticar(conta(OUTRA_TURMA, "aluno", 1));

  const painel = await professorOutra.html(TRILHA);
  assert.equal(painel.status, 200);
  assert.ok(!painel.html.includes(EVIDENCIA.verification));
  assert.ok(!painel.html.includes(TURMA.classroomId), "a turma da outra escola não aparece");

  const turmas = await professorOutra.html(`/professor/turmas?turma=${encodeURIComponent(TURMA.classroomId)}`);
  assert.ok(!turmas.html.includes(EVIDENCIA.verification));

  const lista = await alunoOutra.get(`/dashboard/listas/${encodeURIComponent(listaId)}`);
  assert.equal(lista.status, 404);

  const trabalho = await alunoOutra.acao(PAGINA, acao("startMissionAction"), [MISSAO_IA_ID]);
  const valor = valorDaAcao(trabalho.texto);
  assert.ok(acaoRecusada(trabalho) || !valor?.aiEvidence?.verification, "nada do registro vaza");
});
