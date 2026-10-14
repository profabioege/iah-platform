/**
 * Diagnóstico por etapas e plano semanal (D-054) — regras puras e o
 * serviço do plano com repositórios em memória. As barreiras do banco
 * (0022: RLS, orçamento de minutos, histórico só de inserção) ficam em
 * tests/pilot/study.test.mjs.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const {
  buildDiagnosticEvidence,
  evidenceFor,
  DIAGNOSTIC_RULES,
  buildWeeklyPlanProposal,
  validateAvailability,
  mondayOf,
  isoWeekday,
  addDays,
  minutesByDay,
  todayIso,
} = await import("@/modules/study");
const { createStudyPlanService } = await import("@/modules/study/services/study-plan-service");

// ---------------------------------------------------------------- evidências
const block = (over = {}) => ({
  blockId: "b1",
  position: 1,
  listId: "l1",
  skillId: "s1",
  skillCode: "EM13MAT101",
  itemIds: ["i1", "i2", "i3", "i4"],
  attempt: null,
  answers: [],
  ...over,
});
const delivered = (results) => ({
  attempt: { status: "entregue", submittedAt: "2026-10-12T13:00:00Z" },
  answers: results
    .map((r, i) => (r === null ? null : { listItemId: `i${i + 1}`, isCorrect: r }))
    .filter(Boolean),
});

test("etapa não iniciada e etapa em andamento não geram evidência; diagnóstico fica incompleto", () => {
  assert.equal(evidenceFor(block()).level, "pendente");
  const andamento = evidenceFor(block({ attempt: { status: "em_andamento", submittedAt: null }, answers: [{ listItemId: "i1", isCorrect: null }] }));
  assert.equal(andamento.level, "pendente");
  assert.equal(andamento.savedNotSubmitted, 1);
  assert.match(andamento.message, /1 de 4 resposta\(s\) salva/);
  const d = buildDiagnosticEvidence([
    block({ ...delivered([true, true, true, false]) }),
    block({ blockId: "b2", position: 2, listId: "l2", skillId: "s2", attempt: { status: "em_andamento", submittedAt: null } }),
  ]);
  assert.equal(d.status, "incompleto");
  assert.equal(d.blocksSubmitted, 1);
  assert.equal(d.nextBlock.blockId, "b2", "retomada: a próxima é a etapa em andamento");
});

test("distingue incorreta, não respondida e evidência insuficiente", () => {
  const e = evidenceFor(block(delivered([true, false, null, null])));
  assert.equal(e.correct, 1);
  assert.equal(e.incorrect, 1);
  assert.equal(e.unanswered, 2);
  assert.equal(e.level, "evidencia_insuficiente", "2 respostas < mínimo de 3");
  assert.match(e.message, /2 em branco/);
});

test("uma única questão nunca classifica a habilidade, nem acertando", () => {
  const e = evidenceFor(block({ itemIds: ["i1"], ...delivered([true]) }));
  assert.equal(e.level, "evidencia_insuficiente");
  assert.equal(DIAGNOSTIC_RULES.minAnswered, 3);
});

test("leituras com evidência mínima — e sem a palavra domínio como afirmação", () => {
  assert.equal(evidenceFor(block(delivered([true, true, true, false]))).level, "indicios_favoraveis");
  assert.equal(evidenceFor(block(delivered([true, true, false, false]))).level, "em_desenvolvimento");
  assert.equal(evidenceFor(block(delivered([true, false, false, false]))).level, "prioridade_de_estudo");
  const fav = evidenceFor(block(delivered([true, true, true, true])));
  assert.match(fav.message, /não é domínio confirmado/);
  // Em branco não pesa como erro: 3 certas + 1 em branco = favorável.
  assert.equal(evidenceFor(block(delivered([true, true, true, null]))).level, "indicios_favoraveis");
  // Mais em branco do que respondidas: insuficiente.
  assert.equal(evidenceFor(block({ itemIds: ["i1", "i2", "i3", "i4", "i5", "i6", "i7"], ...delivered([true, true, true, null, null, null, null]) })).level, "evidencia_insuficiente");
});

test("diagnóstico concluído quando todas as etapas foram entregues", () => {
  const d = buildDiagnosticEvidence([block(delivered([true, true, true, true]))]);
  assert.equal(d.status, "concluido");
  assert.equal(d.nextBlock, null);
  assert.equal(buildDiagnosticEvidence([block()]).status, "nao_iniciado");
});

// ---------------------------------------------------------------- plano
const MONDAY = "2026-10-12";
const base = {
  weekStart: MONDAY,
  today: MONDAY,
  availability: { days: [1, 2, 3, 4, 5], minutesPerDay: 30 },
  planProvisional: true,
  plannedSkills: [{ skillId: "s-mat", skillCode: "EM13MAT101" }],
  diagnostic: null,
  pendingLists: [],
  pendingMissions: [],
  circuit: null,
};
const diagBlock = (over) => ({
  listId: "d1",
  skillId: "s-mat",
  skillCode: "EM13MAT101",
  position: 1,
  questions: 4,
  status: "entregue",
  submittedAt: "2026-10-12T13:00:00Z",
  level: "prioridade_de_estudo",
  correct: 1,
  answered: 4,
  ...over,
});

test("datas: segunda-feira da semana e dia da semana ISO", () => {
  assert.equal(mondayOf("2026-10-15"), MONDAY);
  assert.equal(mondayOf("2026-10-18"), MONDAY, "domingo pertence à semana que começou na segunda");
  assert.equal(isoWeekday("2026-10-18"), 7);
  assert.equal(addDays(MONDAY, 6), "2026-10-18");
  assert.match(todayIso("America/Sao_Paulo", new Date("2026-10-12T02:00:00Z")), /^2026-10-11$/);
});

test("disponibilidade inválida é recusada com mensagem clara", () => {
  assert.match(validateAvailability([], 30), /pelo menos um dia/);
  assert.match(validateAvailability([8], 30), /inválido/);
  assert.match(validateAvailability([1], 5), /10 a 240/);
  assert.equal(validateAvailability([1, 3], 30), null);
});

test("ordem de prioridade e motivo explicado em cada atividade", () => {
  const p = buildWeeklyPlanProposal({
    ...base,
    availability: { days: [1, 2, 3, 4, 5, 6, 7], minutesPerDay: 60 },
    diagnostic: { blocks: [diagBlock({ status: "nao_iniciada", submittedAt: null, level: "pendente", listId: "d2", skillId: "s-chs", skillCode: "EM13CHS101" })] },
    pendingLists: [{ listId: "l1", title: "Lista do professor", skillId: "s-lgg", skillCode: "EM13LGG101", questions: 3 }],
    pendingMissions: [{ missionId: "02-x", number: 2, title: "Missão" }],
  });
  assert.deepEqual(p.items.map((i) => i.rule), ["R1", "R2", "R3"]);
  assert.ok(p.items.every((i) => i.reason.length > 20));
  assert.ok(p.notes.some((n) => /PROVISÓRIO/.test(n)));
});

test("nunca ultrapassa os minutos do dia, nem usa dia indisponível ou passado", () => {
  for (let seed = 0; seed < 200; seed++) {
    const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => (seed >> (d - 1)) % 2 === 1 || d === (seed % 7) + 1);
    const minutesPerDay = [10, 15, 20, 30, 45, 60][seed % 6];
    const today = addDays(MONDAY, seed % 7);
    const p = buildWeeklyPlanProposal({
      ...base,
      today,
      availability: { days, minutesPerDay },
      diagnostic: {
        blocks: [
          diagBlock({ status: "nao_iniciada", submittedAt: null, level: "pendente", listId: "a", skillId: "x1", skillCode: "X1" }),
          diagBlock({ listId: "b", skillId: "x2", skillCode: "X2" }),
          diagBlock({ listId: "c", skillId: "x3", skillCode: "X3", level: "em_desenvolvimento" }),
        ],
      },
      pendingLists: Array.from({ length: seed % 4 }, (_, i) => ({ listId: `l${i}`, title: `L${i}`, skillId: null, skillCode: null, questions: 5 + i })),
      pendingMissions: seed % 3 === 0 ? [{ missionId: "m", number: 1, title: "M" }] : [],
      circuit: seed % 2 ? { skillId: "x2", skillCode: "X2" } : null,
    });
    for (const [day, used] of minutesByDay(p.items.map((i) => ({ ...i, status: "planejada" })))) {
      assert.ok(used <= minutesPerDay, `dia ${day}: ${used} > ${minutesPerDay}`);
      assert.ok(days.includes(isoWeekday(day)), "dia não disponível");
      assert.ok(day >= today, "dia que já passou");
    }
    const perDaySkill = new Set();
    for (const i of p.items.filter((x) => x.skillId)) {
      const key = `${i.day}:${i.skillId}`;
      assert.ok(!perDaySkill.has(key), "duas atividades da mesma habilidade no mesmo dia");
      perDaySkill.add(key);
    }
  }
});

test("revisão só no dia seguinte à etapa entregue; prática nova só depois da revisão", () => {
  const p = buildWeeklyPlanProposal({
    ...base,
    diagnostic: { blocks: [diagBlock({})] },
    circuit: { skillId: "s-mat", skillCode: "EM13MAT101" },
  });
  const review = p.items.find((i) => i.kind === "revisao");
  const practice = p.items.find((i) => i.kind === "circuito");
  assert.equal(review.day, "2026-10-13", "etapa entregue na segunda → revisão na terça");
  assert.equal(practice.day, "2026-10-14", "prática nova depois da revisão");
  assert.match(review.reason, /sem refazer as mesmas questões/);
  assert.match(practice.reason, /não repete questões/);
});

test("o que não cabe vai para 'não coube', com motivo", () => {
  const p = buildWeeklyPlanProposal({
    ...base,
    availability: { days: [1], minutesPerDay: 10 },
    pendingMissions: [{ missionId: "m", number: 1, title: "M" }],
    pendingLists: [{ listId: "a", title: "A", skillId: null, skillCode: null, questions: 3 }, { listId: "b", title: "B", skillId: null, skillCode: null, questions: 3 }],
  });
  assert.equal(p.items.length, 1);
  assert.equal(p.unscheduled.length, 2);
  assert.ok(p.unscheduled.find((u) => u.kind === "missao").why.includes("30 min"));
  assert.match(p.unscheduled.find((u) => u.refId === "b").why, /Não coube/);
});

test("dados ausentes: sem diagnóstico e sem pendências, o plano explica e não inventa atividade", () => {
  const p = buildWeeklyPlanProposal({ ...base, planProvisional: false });
  assert.equal(p.items.length, 0);
  assert.ok(p.notes.some((n) => /Ainda não há diagnóstico/.test(n)));
  assert.ok(p.notes.some((n) => /Não há atividades pendentes/.test(n)));
  const insuf = buildWeeklyPlanProposal({ ...base, diagnostic: { blocks: [diagBlock({ level: "evidencia_insuficiente", answered: 1 })] } });
  assert.equal(insuf.items.filter((i) => i.kind === "revisao").length, 0, "evidência insuficiente não gera revisão");
  assert.ok(insuf.notes.some((n) => /Evidência insuficiente em EM13MAT101/.test(n)));
});

test("planejamento da escola: a proposta diz o que cobre e o que ficou sem atividade", () => {
  const p = buildWeeklyPlanProposal({
    ...base,
    plannedSkills: [
      { skillId: "s-mat", skillCode: "EM13MAT101" },
      { skillId: "s-chs", skillCode: "EM13CHS101" },
    ],
    diagnostic: { blocks: [diagBlock({})] },
  });
  const nota = p.notes.find((n) => n.startsWith("Planejamento da escola"));
  assert.ok(nota, "a proposta cita o planejamento da escola");
  assert.match(nota, /EM13MAT101, EM13CHS101/);
  assert.match(nota, /Sem atividade nesta semana: EM13CHS101/);
  assert.ok(!/Sem atividade nesta semana: .*EM13MAT101/.test(nota), "MAT tem revisão no plano");
});

test("atividades já existentes ocupam minutos e não se repetem", () => {
  const p = buildWeeklyPlanProposal({
    ...base,
    pendingLists: [{ listId: "a", title: "A", skillId: null, skillCode: null, questions: 5 }],
    pendingMissions: [{ missionId: "m", number: 1, title: "M" }],
    existing: [
      { day: MONDAY, minutes: 25, status: "concluida", kind: "orientacao", refId: null, skillId: null },
      { day: "2026-10-13", minutes: 10, status: "concluida", kind: "lista", refId: "a", skillId: null },
    ],
  });
  assert.equal(p.items.filter((i) => i.refId === "a").length, 0, "lista já no plano não volta");
  assert.notEqual(p.items.find((i) => i.kind === "missao").day, MONDAY, "segunda já tem 25 de 30 minutos");
});

// ------------------------------------------------- serviço com memória
function memoryStudy() {
  const db = { plans: [], items: [], events: [] };
  const budget = (item) => {
    const plan = db.plans.find((p) => p.id === item.planId);
    if (item.status !== "planejada" && item.status !== "concluida") return;
    if (!plan.availableDays.includes(isoWeekday(item.day))) throw new Error("Dia não disponível no plano.");
    const used = db.items
      .filter((i) => i.planId === item.planId && i.day === item.day && i.id !== item.id && (i.status === "planejada" || i.status === "concluida"))
      .reduce((a, i) => a + i.minutes, 0);
    if (used + item.minutes > plan.minutesPerDay) throw new Error("Ultrapassa os minutos disponíveis no dia.");
  };
  return {
    db,
    repos: {
      async getPlan(studentId, classroomId, weekStart) {
        return db.plans.find((p) => p.studentId === studentId && p.classroomId === classroomId && p.weekStart === weekStart) ?? null;
      },
      async getPlanById(id) { return db.plans.find((p) => p.id === id) ?? null; },
      async listPlans(classroomId, weekStart) { return db.plans.filter((p) => p.classroomId === classroomId && p.weekStart === weekStart); },
      async insertPlan(plan) {
        if (db.plans.some((p) => p.studentId === plan.studentId && p.weekStart === plan.weekStart)) throw new Error("duplicado");
        const row = { ...plan, createdAt: "", updatedAt: "" };
        db.plans.push(row);
        return row;
      },
      async updatePlanAvailability(id, availableDays, minutesPerDay) {
        const p = db.plans.find((x) => x.id === id);
        Object.assign(p, { availableDays, minutesPerDay });
        return p;
      },
      async listPlanItems(ids) { return db.items.filter((i) => ids.includes(i.planId)); },
      async getPlanItem(id) { return db.items.find((i) => i.id === id) ?? null; },
      async insertPlanItems(items) {
        for (const i of items) {
          const open = db.items.find((x) => x.planId === i.planId && x.kind === i.kind && (x.refId ?? "") === (i.refId ?? "") && (x.skillId ?? "") === (i.skillId ?? "") && (x.status === "planejada" || x.status === "adiada"));
          if (open) throw new Error("atividade duplicada em aberto");
          budget(i);
          db.items.push({ ...i, updatedAt: "" });
        }
      },
      async updatePlanItem(id, patch) {
        const i = db.items.find((x) => x.id === id);
        budget({ ...i, ...patch });
        Object.assign(i, patch);
        return i;
      },
      async insertPlanEvents(events) { db.events.push(...events.map((e) => ({ ...e, createdAt: "" }))); },
      async listPlanEvents(planId) { return db.events.filter((e) => e.planId === planId); },
    },
  };
}

const aluno = { institutionId: "inst", role: "aluno", userId: "u-aluno", teacherId: null, studentId: "st-1" };
const professor = { institutionId: "inst", role: "professor", userId: "u-prof", teacherId: "t-1", studentId: null };
const context = {
  planProvisional: true,
  plannedSkills: [],
  diagnostic: { blocks: [diagBlock({ status: "nao_iniciada", submittedAt: null, level: "pendente" })] },
  pendingLists: [{ listId: "l1", title: "Lista", skillId: null, skillCode: null, questions: 4 }],
  pendingMissions: [{ missionId: "02-quem-conferiu-este-dado", number: 2, title: "Quem Conferiu Este Dado?" }],
  circuit: null,
};

test("plano: gerar, refazer sem duplicar, manter concluídas e registrar tudo no histórico", async () => {
  const { db, repos } = memoryStudy();
  const svc = createStudyPlanService(repos, aluno);
  const first = await svc.generate("turma", context, { days: [1, 2, 3], minutesPerDay: 30 }, MONDAY);
  assert.equal(first.view.items.length, 3);
  const lista = first.view.items.find((i) => i.kind === "lista");
  await svc.complete(lista.id);

  const again = await svc.generate("turma", context, { days: [1, 2, 3, 4], minutesPerDay: 45 }, MONDAY);
  const active = again.view.items.filter((i) => i.status !== "removida");
  assert.equal(active.filter((i) => i.kind === "lista").length, 1, "a lista concluída não é proposta de novo");
  assert.equal(active.find((i) => i.kind === "lista").status, "concluida");
  assert.equal(db.plans.length, 1, "um plano por aluno e semana");
  const actions = db.events.map((e) => e.action);
  assert.deepEqual(actions.slice(0, 2), ["gerado", "concluido"]);
  assert.ok(actions.includes("regerado") && actions.includes("removido"));
  assert.ok(db.events.every((e) => e.actorRole === "aluno" && e.actorUserId === "u-aluno"));
});

test("plano: reagendar respeita o dia disponível e os minutos; adiar tira da semana", async () => {
  const { db, repos } = memoryStudy();
  const svc = createStudyPlanService(repos, aluno);
  const { view } = await svc.generate("turma", context, { days: [1, 2], minutesPerDay: 30 }, MONDAY);
  const missao = view.items.find((i) => i.kind === "missao");
  await assert.rejects(() => svc.reschedule(missao.id, "2026-10-14"), /não está entre os disponíveis/);
  const outro = view.items.find((i) => i.day !== missao.day);
  await assert.rejects(() => svc.reschedule(missao.id, outro.day), /Não cabe/);
  await svc.postpone(missao.id, "Semana de provas");
  assert.equal(db.items.find((i) => i.id === missao.id).status, "adiada");
  const ev = db.events.find((e) => e.action === "adiado");
  assert.equal(ev.note, "Semana de provas");
});

test("plano: professor acrescenta orientação dentro do orçamento; aluno não gera em nome de outro papel", async () => {
  const { db, repos } = memoryStudy();
  const { view } = await createStudyPlanService(repos, aluno).generate("turma", { ...context, pendingMissions: [], pendingLists: [] }, { days: [1], minutesPerDay: 20 }, MONDAY);
  const prof = createStudyPlanService(repos, professor);
  await assert.rejects(() => prof.addGuidance(view.plan.id, { day: MONDAY, title: "Ler o texto-base", minutes: 15, reason: "Base para a etapa" }), /Não cabe/);
  const g = await prof.addGuidance(view.plan.id, { day: MONDAY, title: "Ler o texto-base", minutes: 10, reason: "Base para a etapa" });
  assert.equal(g.origin, "professor");
  assert.ok(db.events.some((e) => e.action === "adicionado" && e.actorRole === "professor"));
  await assert.rejects(() => prof.generate("turma", context, { days: [1], minutesPerDay: 30 }, MONDAY), /próprio aluno/);
});

// ------------------------------------------------ prontidão (D-055)
test("prontidão: sintéticas não contam; planejamento provisório impede; faltas por habilidade", async () => {
  const { buildDiagnosticReadiness } = await import("@/modules/study");
  const r = buildDiagnosticReadiness([
    { skillId: "a", skillCode: "EM13MAT101", componentName: "Matemática", planProvisional: true, eligible: 4, synthetic: 4 },
    { skillId: "b", skillCode: "EM13CHS106", componentName: "Geografia", planProvisional: false, eligible: 4, synthetic: 1 },
    { skillId: "c", skillCode: "EM13LP01", componentName: "Língua Portuguesa", planProvisional: false, eligible: 1, synthetic: 0 },
  ]);
  assert.equal(r.ready, false);
  assert.deepEqual(r.skills.map((s) => [s.reviewed, s.missing, s.ready]), [[0, 3, false], [3, 0, true], [1, 2, false]]);
  assert.equal(r.readySkills, 1);
  assert.ok(r.reasons.some((m) => /provisório em 1/.test(m)));
  assert.ok(r.reasons.some((m) => /EM13MAT101 \(faltam 3\), EM13LP01 \(faltam 2\)/.test(m)));
  const ok = buildDiagnosticReadiness([
    { skillId: "b", skillCode: "EM13CHS106", componentName: "Geografia", planProvisional: false, eligible: 3, synthetic: 0 },
  ]);
  assert.equal(ok.ready, true);
  assert.deepEqual(ok.reasons, []);
  assert.equal(buildDiagnosticReadiness([]).ready, false);
});
