/**
 * Percursos (D-053) — organização pura dos dois eixos para o aluno e
 * para o painel docente da Trilha IA & Humanidades.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { buildStudentPathways, buildTeacherAiTrail, bnccSkillIdOf } = await import("@/modules/pathways");
const { missions } = await import("@/content/missions/index.ts");

const base = {
  missions,
  publishedMissionIds: [],
  missionStatus: {},
  plan: [],
  components: [
    { id: "comp-chs-historia", areaId: "chs", name: "História" },
    { id: "comp-mat-matematica", areaId: "mat", name: "Matemática" },
  ],
  lists: [],
  circuit: null,
  gradeKnown: true,
};

test("sem nada publicado: trilha de IA aguarda o professor; áreas sem conteúdo", () => {
  const p = buildStudentPathways(base);
  assert.equal(p.ai.status, "aguardando_atividade");
  assert.equal(p.ai.next, null);
  assert.deepEqual(p.areas.map((a) => a.code), ["CHS", "LGG", "MAT", "CNT"]);
  assert.ok(p.areas.every((a) => a.status === "sem_conteudo"));
});

test("missão publicada vira próxima atividade e mostra o eixo disciplinar", () => {
  const p = buildStudentPathways({ ...base, publishedMissionIds: ["01-a-fabrica-de-noticias"] });
  assert.equal(p.ai.total, 1);
  assert.equal(p.ai.status, "em_andamento");
  assert.equal(p.ai.next.href, "/missoes/01-a-fabrica-de-noticias");
  assert.match(p.ai.next.label, /^Começar a Missão 1/);
  assert.deepEqual(p.ai.missions[0].discipline, { area: "CHS", component: "História", skillCode: "EM13CHS101" });
});

test("missão entregue + exercícios ligados abertos: próxima atividade são os exercícios", () => {
  const p = buildStudentPathways({
    ...base,
    publishedMissionIds: ["01-a-fabrica-de-noticias"],
    missionStatus: { "01-a-fabrica-de-noticias": "entregue" },
    plan: [{ areaId: "chs", componentId: "comp-chs-historia", componentName: "História", skillId: "bncc-em13chs101" }],
    lists: [
      { id: "l1", title: "Fontes e narrativas", kind: "fixacao", status: "publicada", componentId: "comp-chs-historia", targetSkillId: bnccSkillIdOf("EM13CHS101"), attemptStatus: null },
    ],
  });
  assert.equal(p.ai.done, 1);
  assert.equal(p.ai.missions[0].linkedLists.length, 1);
  assert.equal(p.ai.next.kind, "lista");
  const chs = p.areas.find((a) => a.code === "CHS");
  assert.equal(chs.status, "em_andamento");
  assert.equal(chs.next.href, "/dashboard/listas/l1");
  assert.deepEqual(chs.components, ["História"]);
});

test("rascunho e rodada do circuito não contam como lista do professor; circuito aparece na área certa", () => {
  const p = buildStudentPathways({
    ...base,
    plan: [{ areaId: "mat", componentId: "comp-mat-matematica", componentName: "Matemática", skillId: "bncc-em13mat101" }],
    lists: [
      { id: "r1", title: "Rodada", kind: "circuito", status: "publicada", componentId: "comp-mat-matematica", targetSkillId: "bncc-em13mat101", attemptStatus: null },
      { id: "d1", title: "Rascunho", kind: "fixacao", status: "rascunho", componentId: "comp-mat-matematica", targetSkillId: null, attemptStatus: null },
    ],
    circuit: { currentSkillId: "bncc-em13mat101", currentSkillCode: "EM13MAT101", currentSkillAreaId: "mat", masteryLabel: "Em desenvolvimento", paused: false },
  });
  const mat = p.areas.find((a) => a.code === "MAT");
  assert.equal(mat.listsTotal, 0);
  assert.equal(mat.next.kind, "circuito");
  assert.equal(mat.circuit.skillCode, "EM13MAT101");
  assert.equal(p.areas.find((a) => a.code === "CHS").circuit, null);
});

test("área com tudo entregue fica em dia; com plano e nada publicado, aguardando", () => {
  const p = buildStudentPathways({
    ...base,
    plan: [
      { areaId: "chs", componentId: "comp-chs-historia", componentName: "História", skillId: "s1" },
      { areaId: "mat", componentId: "comp-mat-matematica", componentName: "Matemática", skillId: "s2" },
    ],
    lists: [
      { id: "l1", title: "L", kind: "fixacao", status: "encerrada", componentId: "comp-chs-historia", targetSkillId: null, attemptStatus: "entregue" },
    ],
  });
  assert.equal(p.areas.find((a) => a.code === "CHS").status, "em_dia");
  assert.equal(p.areas.find((a) => a.code === "MAT").status, "aguardando_atividade");
});

test("painel docente separa os eixos e conta quem acertou a disciplina sem evidenciar IA", () => {
  const rows = buildTeacherAiTrail({
    missions: missions.filter((m) => m.axes),
    assignedMissionIds: ["01-a-fabrica-de-noticias"],
    classroomSize: 4,
    studentsByMission: {
      "01-a-fabrica-de-noticias": [
        { studentId: "a", status: "avaliado", disciplineLevel: "atingido", aiLevel: "em_desenvolvimento", hasAiEvidence: true },
        { studentId: "b", status: "avaliado", disciplineLevel: "em_desenvolvimento", aiLevel: "superado", hasAiEvidence: true },
        { studentId: "c", status: "concluiu", disciplineLevel: null, aiLevel: null, hasAiEvidence: true },
        { studentId: "d", status: "nao_acessou", disciplineLevel: null, aiLevel: null, hasAiEvidence: false },
      ],
    },
    lists: [
      { id: "l1", title: "Fontes", status: "publicada", kind: "fixacao", targetSkillId: "bncc-em13chs101", delivered: 2 },
      { id: "l2", title: "Outra", status: "publicada", kind: "fixacao", targetSkillId: "bncc-em13mat101", delivered: 1 },
    ],
  });
  const [m] = rows;
  assert.equal(m.assigned, true);
  assert.equal(m.students, 4);
  assert.equal(m.started, 3);
  assert.equal(m.delivered, 3);
  assert.equal(m.reviewed, 2);
  assert.equal(m.disciplineLevels.atingido, 1);
  assert.equal(m.aiLevels.superado, 1);
  assert.equal(m.disciplineLevels.pendente, 2);
  assert.equal(m.disciplineWithoutAi, 1);
  assert.equal(m.aiWithoutDiscipline, 1);
  assert.deepEqual(m.linkedLists.map((l) => l.id), ["l1"]);
});
