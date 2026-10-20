/**
 * Revisão da Missão 01 para o piloto individual da 1ª série A (D-057):
 * hipóteses gravadas no texto do Relatório (sem coluna nem tabela nova),
 * retomada sem perda, estimativa de tempo própria da missão e coerência do
 * conteúdo (simulação didática, conclusão fundamentada, eixos separados).
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { missions } = await import("@/content/missions/index.ts");
const { validateMissionAxes } = await import("@/modules/library/domain/mission-axes.ts");
const { createLearningCycleService } = await import("@/modules/platform/services/learning-cycle-service");
const hyp = await import("@/app/(platform)/missoes/[id]/mission-flow/report-hypotheses.ts");
const timing = await import("@/app/(platform)/missoes/[id]/mission-flow/mission-timing.ts");
const { parseMissionContent } = await import("@/app/(platform)/missoes/[id]/mission-flow/parse-mission-content.ts");

const mission01 = missions.find((m) => m.id === "01-a-fabrica-de-noticias");
const mission02 = missions.find((m) => m.id === "02-quem-conferiu-este-dado");
const TEMPLATE = mission01.productionTemplate;
const N = parseMissionContent(mission01.didacticMaterials).evidences.length;

// ---------------------------------------------------------------- hipóteses

test("primeira hipótese faz nascer o Relatório: bloco de hipóteses + modelo", () => {
  const text = hyp.setHypothesis("", 1, "Parece confiável: cita a Secretaria.", N, TEMPLATE);
  assert.equal(N, 4);
  assert.ok(text.startsWith(hyp.HYPOTHESES_HEADER));
  assert.ok(text.endsWith(TEMPLATE));
  assert.deepEqual(hyp.readHypotheses(text, N), ["Parece confiável: cita a Secretaria.", "", "", ""]);
  assert.equal(hyp.hasReportContent(text, TEMPLATE), false, "só hipóteses + modelo intocado não é relatório escrito");
});

test("digitação é preservada exatamente (espaços, inclusive no fim) e quebra de linha vira espaço", () => {
  let text = "";
  for (const typed of ["S", "Su", "Sus", "Sus ", "Sus p"]) {
    text = hyp.setHypothesis(text, 2, typed, N, TEMPLATE);
    assert.equal(hyp.readHypotheses(text, N)[1], typed);
  }
  text = hyp.setHypothesis(text, 2, "linha um\nlinha dois", N, TEMPLATE);
  assert.equal(hyp.readHypotheses(text, N)[1], "linha um linha dois");
  text = hyp.setHypothesis(text, 2, "", N, TEMPLATE);
  assert.equal(hyp.readHypotheses(text, N)[1], "");
});

test("editar uma hipótese depois de escrever o relatório não altera nenhuma outra linha", () => {
  let text = "";
  for (let i = 1; i <= N; i += 1) text = hyp.setHypothesis(text, i, `Hipótese ${i}`, N, TEMPLATE);
  const report = text.replace("Item 1 — conclusão:", "Item 1 — conclusão: reúne mais indícios; falta a data.");
  assert.equal(hyp.hasReportContent(report, TEMPLATE), true);

  const edited = hyp.setHypothesis(report, 3, "Mudei: sem fonte.", N, TEMPLATE);
  const before = report.split("\n");
  const after = edited.split("\n");
  assert.equal(after.length, before.length);
  const changed = after.map((line, i) => (line !== before[i] ? i : -1)).filter((i) => i >= 0);
  assert.equal(changed.length, 1);
  assert.equal(after[changed[0]], "Item 3 — hipótese: Mudei: sem fonte.");
  assert.ok(edited.includes("Item 1 — conclusão: reúne mais indícios; falta a data."));
});

test("relatório escrito antes das hipóteses (sem bloco) fica intacto abaixo do bloco novo", () => {
  const legacy = "Item 1: tem fonte.\nItem 3: apelo de urgência.\n\nTexto livre do aluno.";
  const text = hyp.setHypothesis(legacy, 2, "Parece estudo sério.", N, TEMPLATE);
  assert.ok(text.endsWith(`\n\n${legacy}`), "texto anterior preservado byte a byte");
  assert.deepEqual(hyp.readHypotheses(text, N), ["", "Parece estudo sério.", "", ""]);
  assert.equal(hyp.hasReportContent(text, TEMPLATE), true);
});

test("linha de hipótese apagada no relatório volta no lugar certo, sem mexer no resto", () => {
  let text = "";
  for (let i = 1; i <= N; i += 1) text = hyp.setHypothesis(text, i, `H${i}`, N, TEMPLATE);
  const withoutTwo = text
    .split("\n")
    .filter((line) => !line.startsWith("Item 2 — hipótese:"))
    .join("\n");
  const restored = hyp.setHypothesis(withoutTwo, 2, "H2 de novo", N, TEMPLATE);
  const lines = restored.split("\n");
  const at = lines.indexOf("Item 2 — hipótese: H2 de novo");
  assert.equal(lines[at - 1], "Item 1 — hipótese: H1");
  assert.equal(lines[at + 1], "Item 3 — hipótese: H3");
  assert.equal(restored.split("\n").length, text.split("\n").length);
});

test("Missão sem modelo de relatório mantém a regra antiga de retomada", () => {
  assert.equal(hyp.hasReportContent("", undefined), false);
  assert.equal(hyp.hasReportContent("qualquer texto", undefined), true);
  assert.equal(mission02.productionTemplate, undefined);
});

// ------------------------------------------ salvamento e retomada no serviço

function memoryRepositories() {
  const tables = { productions: [], reflections: [], reviews: [], progress: [] };
  const byMission = (table) => ({
    async listByClassroomMission(institutionId, classroomId, missionId) {
      return tables[table]
        .filter((r) => r.institutionId === institutionId && r.classroomId === classroomId && r.missionId === missionId)
        .map((r) => structuredClone(r));
    },
    async save(_institutionId, row) {
      const i = tables[table].findIndex((r) => r.id === row.id);
      const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
      if (i >= 0) tables[table][i] = { ...tables[table][i], ...clean };
      else tables[table].push({ ...clean });
    },
  });
  return {
    tables,
    repositories: {
      productions: byMission("productions"),
      reflections: byMission("reflections"),
      missionReviews: byMission("reviews"),
      missionProgress: {
        async save(_i, row) {
          tables.progress.push(row);
        },
      },
    },
  };
}

const scope = { institutionId: "inst-sintetica", classroomId: "turma-1a", studentId: "aluno-01", missionId: mission01.id };

test("hipóteses salvas pelo rascunho da Produção voltam na retomada, e o relatório não se perde", async () => {
  const { repositories, tables } = memoryRepositories();
  const cycle = createLearningCycleService(repositories);
  await cycle.startMission(scope);

  // Investigação: o aluno registra as hipóteses 1 e 2 e sai.
  let text = "";
  text = hyp.setHypothesis(text, 1, "Confiável: órgão nomeado.", N, TEMPLATE);
  await cycle.saveProductionDraft(scope, text);
  text = hyp.setHypothesis(text, 2, "Parece pesquisa séria.", N, TEMPLATE);
  await cycle.saveProductionDraft(scope, text);

  // Retomada (nova leitura do banco): as duas hipóteses estão lá; a 3 é a próxima.
  let work = await createLearningCycleService(repositories).getStudentWork(scope);
  assert.deepEqual(hyp.readHypotheses(work.production, N), ["Confiável: órgão nomeado.", "Parece pesquisa séria.", "", ""]);
  assert.equal(hyp.readHypotheses(work.production, N).findIndex((h) => !h.trim()), 2);
  assert.equal(hyp.hasReportContent(work.production, TEMPLATE), false);

  // Completa as hipóteses, escreve a análise e salva.
  text = hyp.setHypothesis(work.production, 3, "Suspeito: urgência.", N, TEMPLATE);
  text = hyp.setHypothesis(text, 4, "Suspeito: foto estranha.", N, TEMPLATE);
  text = text.replace("Item 4 — conclusão:", "Item 4 — conclusão: reúne mais alertas; checaria a imagem.");
  await cycle.saveProductionDraft(scope, text);

  // Volta à Investigação e corrige a hipótese 1: o relatório continua inteiro.
  work = await cycle.getStudentWork(scope);
  const corrected = hyp.setHypothesis(work.production, 1, "Confiável, mas sem data.", N, TEMPLATE);
  await cycle.saveProductionDraft(scope, corrected);

  work = await createLearningCycleService(repositories).getStudentWork(scope);
  assert.deepEqual(hyp.readHypotheses(work.production, N), [
    "Confiável, mas sem data.",
    "Parece pesquisa séria.",
    "Suspeito: urgência.",
    "Suspeito: foto estranha.",
  ]);
  assert.ok(work.production.includes("Item 4 — conclusão: reúne mais alertas; checaria a imagem."));
  assert.equal(hyp.hasReportContent(work.production, TEMPLATE), true);
  assert.equal(tables.productions.length, 1, "uma produção por aluno e missão — nenhuma tabela ou linha nova");

  // A entrega leva hipóteses + relatório no mesmo texto.
  await cycle.saveAiEvidenceDraft(scope, {
    tool: "Demonstração do professor (Plano B)",
    request: "Manchete inventada sobre Vale Novo (SIMULAÇÃO DIDÁTICA).",
    response: "Vale Novo proíbe celulares em todas as praças.",
    verification: "Parece notícia de jornal; denuncia: sem fonte nem data.",
    decision: "Não compartilharia; trataria como simulação.",
  });
  const delivered = await cycle.setProductionDelivered(scope, true, mission01.axes);
  assert.equal(delivered.production, work.production);
  assert.ok(delivered.productionDeliveredAt);
});

// ------------------------------------------------------------------- tempo

test("a Missão 01 tem estimativa própria de 35–40 min; as demais seguem a heurística geral", () => {
  const twoAxes = Boolean(mission01.axes);
  assert.equal(mission01.stepMinutes.length, timing.totalSteps(twoAxes));
  const total = timing.totalMissionMinutes(twoAxes, mission01.stepMinutes);
  assert.ok(total >= 35 && total <= 40, `estimativa fora da faixa: ${total}`);
  assert.equal(timing.minutesRemainingFrom(1, twoAxes, mission01.stepMinutes), total);
  assert.equal(timing.minutesRemainingFrom(10, twoAxes, mission01.stepMinutes), 4);
  assert.equal(mission02.stepMinutes, undefined);
  assert.equal(timing.totalMissionMinutes(true), 14, "heurística geral de dois eixos inalterada");
});

// ---------------------------------------------------------------- conteúdo

const visibleToStudent = [
  mission01.objective,
  mission01.context,
  mission01.challenge,
  mission01.studentProduction,
  mission01.reflection,
  mission01.delivery,
  mission01.hypothesisPrompt,
  mission01.criteriaTitle,
  mission01.productionTemplate,
  ...mission01.didacticMaterials,
  ...mission01.aiTools,
  mission01.axes.ai.practicalInstruction,
].join("\n");

test("o aluno não é obrigado a classificar em real/fabricada e sabe que é simulação didática", () => {
  assert.doesNotMatch(visibleToStudent, /"real"|"fabricada"|veredito/i);
  assert.match(mission01.context, /SIMULAÇÃO DIDÁTICA/);
  assert.match(mission01.context, /fictícias/);
  assert.match(mission01.challenge, /conclusão fundamentada/);
  assert.match(visibleToStudent, /Regra de ouro: nenhum texto se prova verdadeiro ou falso só pela aparência/);
  assert.doesNotMatch(visibleToStudent, /localizável fora do texto/, "não exige localizar instituições fictícias");
  assert.doesNotMatch(mission01.aiTools.join(" "), /busca/i);
});

test("a atividade com IA usa só cenário fictício identificado e registra o Plano B", () => {
  for (const text of [mission01.challenge, mission01.axes.ai.practicalInstruction, mission01.aiTools[0]]) {
    assert.match(text, /SIMULAÇÃO DIDÁTICA/);
    assert.match(text, /Vale Novo/);
  }
  assert.doesNotMatch(visibleToStudent, /sua cidade ou escola/);
  assert.match(mission01.axes.ai.practicalInstruction, /Demonstração do professor \(Plano B\)/);
  // No Plano B o aluno não opera a ferramenta nem cria com ela: só o que ele
  // demonstra nos dois modos é creditado.
  assert.deepEqual(mission01.axes.ai.competencyIds, ["ia-compreender-01", "ia-avaliar-01"]);
  assert.match(mission01.axes.ai.criteria[0], /quem operou a ferramenta/);
});

test("eixo de História: trabalho efetivamente pedido, habilidade oficial intacta, eixos separados", () => {
  const d = mission01.axes.discipline;
  assert.deepEqual(validateMissionAxes(mission01.axes), []);
  assert.doesNotMatch([d.objective, ...d.criteria].join(" "), /versões|mesmo fato/);
  for (const word of [/autoria/, /origem/, /intenção/, /evidências/, /limites/]) assert.match(d.objective, word);
  assert.equal(d.skill.code, "EM13CHS101");
  assert.equal(
    d.skill.text,
    "Identificar, analisar e comparar diferentes fontes e narrativas expressas em diversas linguagens, " +
      "com vistas à compreensão de ideias filosóficas e de processos e eventos históricos, geográficos, " +
      "políticos, econômicos, sociais, ambientais e culturais.",
  );
});

test("os quatro textos do Dossiê continuam os mesmos quatro itens fictícios", () => {
  const evidences = parseMissionContent(mission01.didacticMaterials).evidences;
  assert.deepEqual(
    evidences.map((e) => e.headline),
    [
      "Prefeitura de Vale Novo testa aplicativo de merenda com IA em 6 escolas",
      "Estudo aponta uso crescente de IA generativa por adolescentes brasileiros",
      "Estudo aponta que 97% dos professores já foram substituídos por IA nas escolas particulares do país",
      "Aluno de 14 anos cria robô que aprova sozinho 100% das provas do ENEM, diz página de tecnologia",
    ],
  );
});
