/**
 * Diagnóstico por etapas, plano semanal e Missão de Geografia (D-054) —
 * pela rede, com login normal, pelos formulários das telas do build.
 *
 * História: professor monta e publica o diagnóstico (itens
 * DEMONSTRATIVOS) → aluno começa, sai, volta e retoma → entrega com
 * questão em branco → vê evidências iniciais → gera o plano da semana com
 * a disponibilidade dele → conclui, adia, tenta reagendar além do limite
 * → professor acompanha, ajusta e orienta → Missão 02 (Geografia) com os
 * dois eixos avaliados → outra escola e colega não alcançam nada disso.
 *
 * Contas sintéticas próprias (alunos 33–35) para não cruzar com as
 * outras suítes. Nenhum módulo da aplicação é importado.
 */

import assert from "node:assert/strict";
import test, { before } from "node:test";

import { SessaoHttp, acaoRecusada, textoVisivel, valorDaAcao } from "./support/http-client.mjs";
import { autenticar, senhaDefinitiva } from "./support/sessoes.mjs";
import { BASE_URL, MISSAO_GEO_ID, OUTRA_TURMA, TURMA, acao, conta, consultarBanco } from "./support/ambiente.mjs";

const PROFESSOR = conta(TURMA, "professor");
const ALUNO = conta(TURMA, "aluno", 33);
const COLEGA = conta(TURMA, "aluno", 34);
const PAINEL = `/professor/diagnostico?turma=${encodeURIComponent(TURMA.classroomId)}`;
const MAT = "bncc-em13mat101";
const CHS = "bncc-em13chs101";

let professor;
let aluno;
let colega;
let diagnosticoId;
let etapas = [];
let planId;

before(async () => {
  professor = await autenticar(PROFESSOR);
  aluno = await autenticar(ALUNO);
  colega = await autenticar(COLEGA);
});

const gabarito = (listId) =>
  consultarBanco(
    `select i.id, k.answer_key from practice_list_items i
       join question_version_keys k on k.version_id = i.question_version_id
      where i.list_id = $1 order by i.position`,
    [listId],
  );
const errada = (k) => (k === "A" ? "B" : "A");

test("1. professor vê habilidades com questões elegíveis marcadas como demonstrativas e cria o diagnóstico", async () => {
  const { status, html } = await professor.html(PAINEL);
  assert.equal(status, 200);
  const texto = textoVisivel(html);
  assert.match(texto, /Novo diagnóstico/);
  assert.match(texto, /demonstrativa\(s\), pendente\(s\) de revisão docente/);

  const envio = await professor.enviarFormularioCom(PAINEL, 'name="habilidades"', {
    turma: TURMA.classroomId,
    titulo: "Diagnóstico de entrada — homologação",
    habilidades: [MAT, CHS],
  });
  assert.equal(envio.status, 303);
  diagnosticoId = decodeURIComponent(envio.destino.match(/diagnostico=([^&]+)/)[1]);
  const [d] = await consultarBanco("select status, demonstrative from diagnostics where id = $1", [diagnosticoId]);
  assert.deepEqual(d, { status: "rascunho", demonstrative: true });

  // Rascunho não aparece para o aluno.
  assert.match(textoVisivel((await aluno.html("/dashboard/diagnostico")).html), /ainda não publicou um diagnóstico/);

  const pagina = `${PAINEL}&diagnostico=${encodeURIComponent(diagnosticoId)}`;
  const publicar = await professor.enviarFormularioCom(pagina, 'value="publicar"');
  assert.equal(publicar.status, 303);
  etapas = (
    await consultarBanco(
      "select b.list_id from diagnostic_blocks b where b.diagnostic_id = $1 order by b.position",
      [diagnosticoId],
    )
  ).map((r) => r.list_id);
  assert.equal(etapas.length, 2);
});

test("2. aluno começa a etapa, salva, sai e retoma de onde parou", async () => {
  let texto = textoVisivel((await aluno.html("/dashboard/diagnostico")).html);
  assert.match(texto, /Diagnóstico demonstrativo/);
  assert.match(texto, /Começar a etapa 1/);

  const etapa = `/dashboard/listas/${encodeURIComponent(etapas[0])}`;
  const g = await gabarito(etapas[0]);
  const salvar = await aluno.enviarFormularioCom(etapa, 'name="listId"', {
    [`item:${g[0].id}`]: g[0].answer_key,
    [`item:${g[1].id}`]: errada(g[1].answer_key),
    intent: "salvar",
  });
  assert.equal(salvar.status, 303);

  await aluno.sair();
  const outro = new SessaoHttp(BASE_URL, "aluno-outro-dispositivo");
  assert.equal((await outro.entrar(ALUNO.email, senhaDefinitiva(ALUNO))).ok, true);
  aluno = outro;
  texto = textoVisivel((await aluno.html("/dashboard/diagnostico")).html);
  assert.match(texto, /Continuar a etapa 1/);
  assert.match(texto, /2 de 4 resposta\(s\) salva\(s\)/);
  const html = (await aluno.html(etapa)).html;
  assert.equal((html.match(/checked=""/g) ?? []).length, 2, "as duas respostas salvas voltam marcadas");
});

test("3. entrega com questão em branco: não respondida ≠ incorreta; diagnóstico incompleto", async () => {
  const etapa = `/dashboard/listas/${encodeURIComponent(etapas[0])}`;
  const g = await gabarito(etapas[0]);
  const entrega = await aluno.enviarFormularioCom(etapa, 'name="listId"', {
    [`item:${g[2].id}`]: g[2].answer_key,
    intent: "entregar",
  });
  assert.equal(entrega.status, 303);
  assert.ok(!String(entrega.destino).includes("aviso="), "etapa aceita questão em branco");
  const pagina = textoVisivel((await aluno.html(etapa)).html);
  assert.match(pagina, /Não respondida/);
  assert.match(pagina, /1 em branco/);

  const diag = textoVisivel((await aluno.html("/dashboard/diagnostico")).html);
  assert.match(diag, /Incompleto/);
  assert.match(diag, /2 correta\(s\) · 1 incorreta\(s\) · 1 não respondida\(s\)/);
  assert.match(diag, /Em desenvolvimento/);
  assert.match(diag, /Etapa ainda não feita/);
});

test("4. plano da semana: respeita a disponibilidade, explica cada atividade e não duplica", async () => {
  const form = await aluno.html("/dashboard/plano");
  assert.match(textoVisivel(form.html), /Gerar meu plano/);
  const gerar = () =>
    aluno.enviarFormularioCom("/dashboard/plano", 'name="minutos"', { dias: ["1", "2", "3", "4", "5", "6", "7"], minutos: "20" });
  let envio = await gerar();
  assert.equal(envio.status, 303);
  assert.ok(!String(envio.destino).includes("aviso="), String(envio.destino));
  envio = await gerar();
  assert.equal(envio.status, 303);

  const [plano] = await consultarBanco(
    "select p.id, p.minutes_per_day from study_plans p join students s on s.id = p.student_id where p.student_id = $1",
    [ALUNO.referencia],
  );
  planId = plano.id;
  const acima = await consultarBanco(
    `select day from study_plan_items where plan_id = $1 and status in ('planejada','concluida')
      group by day having sum(minutes) > 20`,
    [planId],
  );
  assert.deepEqual(acima, []);
  const dup = await consultarBanco(
    `select kind, ref_id from study_plan_items where plan_id = $1 and status in ('planejada','adiada')
      group by kind, ref_id, skill_id having count(*) > 1`,
    [planId],
  );
  assert.deepEqual(dup, []);

  const texto = textoVisivel((await aluno.html("/dashboard/plano")).html);
  assert.match(texto, /Por quê:/);
  assert.match(texto, /Diagnóstico · etapa 2/);
  assert.match(texto, /Proposta pela regra/);
});

test("5. concluir, adiar e reagendar ficam no histórico; reagendar além do limite é recusado", async () => {
  const itens = await consultarBanco(
    "select id, day::text, minutes, kind from study_plan_items where plan_id = $1 and status = 'planejada' order by day, created_at",
    [planId],
  );
  assert.ok(itens.length >= 2, "o plano tem atividades");
  const [a, b] = itens;
  let envio = await aluno.enviarFormularioCom("/dashboard/plano", `value="${a.id}"`, { op: "concluir" });
  assert.equal(envio.status, 303);

  // Reagendar b para um dia sem espaço: escolhe o dia mais cheio que não comporta b.
  const ocupacao = await consultarBanco(
    `select day::text, sum(minutes)::int as usado from study_plan_items
      where plan_id = $1 and status in ('planejada','concluida') and id <> $2 group by day`,
    [planId, b.id],
  );
  const cheio = ocupacao.find((o) => o.usado + b.minutes > 20);
  if (cheio) {
    envio = await aluno.enviarFormularioCom("/dashboard/plano", `value="${b.id}"`, { op: "reagendar", dia: cheio.day });
    assert.match(decodeURIComponent(String(envio.destino)), /Não cabe/);
  }
  const diasSemana = await consultarBanco(
    "select d::date::text as day from study_plans p, generate_series(p.week_start, p.week_start + 6, '1 day') d where p.id = $1 order by 1",
    [planId],
  );
  const usado = (d) => ocupacao.find((o) => o.day === d)?.usado ?? 0;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const destino = diasSemana.map((d) => d.day).find((d) => d >= hoje && d !== b.day && usado(d) + b.minutes <= 20);
  if (!destino) return; // domingo à noite, semana sem outro dia à frente: o caso de limite fica coberto pelo teste de integração
  envio = await aluno.enviarFormularioCom("/dashboard/plano", `value="${b.id}"`, { op: "reagendar", dia: destino });
  assert.ok(!String(envio.destino).includes("aviso="), decodeURIComponent(String(envio.destino)));
  const [movido] = await consultarBanco("select day::text from study_plan_items where id = $1", [b.id]);
  assert.equal(movido.day, destino);
  envio = await aluno.enviarFormularioCom("/dashboard/plano", `value="${b.id}"`, { op: "adiar" });
  assert.equal(envio.status, 303);

  const estado = await consultarBanco("select id, status from study_plan_items where id = any($1)", [[a.id, b.id]]);
  assert.equal(estado.find((x) => x.id === a.id).status, "concluida");
  assert.equal(estado.find((x) => x.id === b.id).status, "adiada");
  const eventos = (await consultarBanco("select action from study_plan_events where plan_id = $1", [planId])).map((e) => e.action);
  for (const acaoEsperada of ["gerado", "regerado", "concluido", "reagendado", "adiado"]) assert.ok(eventos.includes(acaoEsperada), acaoEsperada);
});

test("6. colega não altera o plano do aluno, nem pela ação do servidor", async () => {
  const gerar = await colega.enviarFormularioCom("/dashboard/plano", 'name="minutos"', { dias: ["1", "2", "3", "4", "5", "6", "7"], minutos: "30" });
  assert.equal(gerar.status, 303);
  const [doColega] = await consultarBanco(
    "select i.id from study_plan_items i join study_plans p on p.id = i.plan_id where p.student_id = $1 and i.status = 'planejada' limit 1",
    [COLEGA.referencia],
  );
  assert.ok(doColega, "o colega tem o próprio plano (etapas do diagnóstico pendentes)");
  const [alvo] = await consultarBanco(
    "select id, status from study_plan_items where plan_id = $1 and status in ('planejada','concluida') order by status limit 1",
    [planId],
  );
  // Usa o formulário do PRÓPRIO plano do colega trocando o id da atividade.
  const envio = await colega.enviarFormularioCom("/dashboard/plano", `value="${doColega.id}"`, { itemId: alvo.id, op: "remover" });
  assert.match(decodeURIComponent(String(envio.destino)), /aviso=/);
  const [depois] = await consultarBanco("select status from study_plan_items where id = $1", [alvo.id]);
  assert.equal(depois.status, alvo.status, "a atividade do aluno 33 não mudou");
});

test("7. professor acompanha o diagnóstico e o plano, ajusta e orienta", async () => {
  const pagina = `${PAINEL}&diagnostico=${encodeURIComponent(diagnosticoId)}`;
  const texto = textoVisivel((await professor.html(pagina)).html);
  assert.match(texto, /Incompleto \(1\/2\)/);
  assert.match(texto, /Planos desta semana/);

  const planoPagina = `/professor/diagnostico/plano/${encodeURIComponent(planId)}?turma=${encodeURIComponent(TURMA.classroomId)}`;
  const { status, html } = await professor.html(planoPagina);
  assert.equal(status, 200);
  assert.match(textoVisivel(html), /Plano semanal ·/);

  const dias = await consultarBanco(
    `select d::date::text as day from study_plans p, generate_series(p.week_start, p.week_start + 6, '1 day') d
      where p.id = $1 and d::date >= (now() at time zone 'America/Sao_Paulo')::date
        and coalesce((select sum(minutes) from study_plan_items i where i.plan_id = p.id and i.day = d::date
        and i.status in ('planejada','concluida')), 0) <= 15 order by 1 limit 1`,
    [planId],
  );
  // Fim de semana já lotado: não há dia à frente com espaço — o limite segue coberto no teste de integração.
  if (!dias[0]) return;
  const demais = await professor.enviarFormularioCom(planoPagina, 'name="titulo"', {
    titulo: "Orientação longa demais",
    motivo: "Teste do limite",
    dia: dias[0].day,
    minutos: "120",
  });
  assert.match(decodeURIComponent(String(demais.destino)), /Não cabe/, "orientação também respeita os minutos do aluno");
  const envio = await professor.enviarFormularioCom(planoPagina, 'name="titulo"', {
    titulo: "Reler a resolução da etapa 1",
    motivo: "Erro em taxa de variação",
    dia: dias[0].day,
    minutos: "5",
  });
  assert.equal(envio.status, 303);
  assert.ok(!String(envio.destino).includes("aviso="), decodeURIComponent(String(envio.destino)));
  const [orient] = await consultarBanco(
    "select origin, created_by from study_plan_items where plan_id = $1 and kind = 'orientacao'",
    [planId],
  );
  assert.equal(orient.origin, "professor");
  const [ev] = await consultarBanco("select actor_role from study_plan_events where plan_id = $1 and action = 'adicionado'", [planId]);
  assert.equal(ev.actor_role, "professor");
});

test("8. Missão 02 (Geografia): dois eixos atribuídos, entregues e avaliados separadamente", async () => {
  const trilha = "/professor/trilha-ia";
  const atribuir = await professor.acao(trilha, acao("assignAiMissionAction"), [
    { classroomId: TURMA.classroomId, missionId: MISSAO_GEO_ID },
  ]);
  assert.deepEqual(valorDaAcao(atribuir.texto), { ok: true });
  assert.match(textoVisivel((await professor.html(trilha)).html), /Geografia · EM13CHS106/);

  const pagina = `/missoes/${MISSAO_GEO_ID}`;
  const { status, html } = await aluno.html(pagina);
  assert.equal(status, 200);
  assert.ok(html.includes("EM13CHS106") && html.includes("Censo Demográfico 2022"));

  const evidencia = {
    tool: "Assistente de texto (sintético)",
    request: "Qual é a população de cada Grande Região do Brasil segundo o Censo 2022 e qual é a menos populosa?",
    response: "O Norte é a região menos populosa, com menos de 10 milhões de habitantes.",
    verification: "Conferi na Tabela 2 do IBGE (Censo 2022, primeiros resultados, p. 33).",
    decision: "Corrigi: a menos populosa é o Centro-Oeste (16.287.809); o Norte tem 17.349.619.",
  };
  await aluno.acao(pagina, acao("startMissionAction"), [MISSAO_GEO_ID]);
  await aluno.acao(pagina, acao("saveAiEvidenceDraftAction"), [MISSAO_GEO_ID, evidencia]);
  await aluno.acao(pagina, acao("saveProductionDraftAction"), [MISSAO_GEO_ID, "Relatório de conferência sintético."]);
  const entrega = await aluno.acao(pagina, acao("setProductionDeliveredAction"), [MISSAO_GEO_ID, true]);
  assert.equal(acaoRecusada(entrega), false);
  await aluno.acao(pagina, acao("saveReflectionDraftAction"), [MISSAO_GEO_ID, "Eu teria aceitado o número do Norte sem conferir."]);
  await aluno.acao(pagina, acao("setReflectionRecordedAction"), [MISSAO_GEO_ID, true]);

  const turmas = `/professor/turmas?turma=${encodeURIComponent(TURMA.classroomId)}`;
  const base = {
    classroomId: TURMA.classroomId,
    studentId: ALUNO.referencia,
    missionId: MISSAO_GEO_ID,
    grade: "Bom",
    observedCriteria: [],
    feedback: "Boa conferência na fonte oficial.",
  };
  const axes = {
    discipline: { level: "atingido", observedCriteria: [], note: "", skillCode: "EM13CHS106" },
    ai: { level: "superado", observedCriteria: [], note: "", competencyIds: ["ia-usar-01", "ia-avaliar-01", "ia-avaliar-02"] },
  };
  const historia = await professor.acao(turmas, acao("reviewSubmissionAction"), [
    { ...base, axes: { ...axes, discipline: { ...axes.discipline, skillCode: "EM13CHS101" } } },
  ]);
  assert.equal(acaoRecusada(historia), true, "habilidade de outra missão é recusada");
  const ok = await professor.acao(turmas, acao("reviewSubmissionAction"), [{ ...base, axes }]);
  assert.equal(acaoRecusada(ok), false);
  const [r] = await consultarBanco(
    "select discipline_level, discipline_skill, ai_level from mission_reviews where student_id = $1 and mission_id = $2",
    [ALUNO.referencia, MISSAO_GEO_ID],
  );
  assert.deepEqual(r, { discipline_level: "atingido", discipline_skill: "EM13CHS106", ai_level: "superado" });
});

test("9. outra escola não alcança diagnóstico, etapas nem plano", async () => {
  const professorOutra = await autenticar(conta(OUTRA_TURMA, "professor"));
  const alunoOutra = await autenticar(conta(OUTRA_TURMA, "aluno", 2));
  const plano = await professorOutra.get(`/professor/diagnostico/plano/${encodeURIComponent(planId)}`);
  assert.equal(plano.status, 404);
  const painel = textoVisivel((await professorOutra.html(`/professor/diagnostico?turma=${encodeURIComponent(TURMA.classroomId)}`)).html);
  assert.ok(!painel.includes("Diagnóstico de entrada — homologação"));
  assert.equal((await alunoOutra.get(`/dashboard/listas/${encodeURIComponent(etapas[0])}`)).status, 404);
  assert.match(textoVisivel((await alunoOutra.html("/dashboard/diagnostico")).html), /ainda não publicou/);
});
