import assert from "node:assert/strict";
import test from "node:test";

import { findCurriculumSkillSuggestions } from "../src/lib/docentiah/curriculum-skill-matcher.ts";

function fakeRepositories({ disciplines, units, themesByUnit }) {
  return {
    disciplines: { async list() { return disciplines; } },
    units: { async listByDiscipline(disciplineId) { return units.filter((u) => u.disciplineId === disciplineId); }, async getById() { return null; }, async save(u) { return u; } },
    themes: { async listByUnit(unitId) { return themesByUnit[unitId] ?? []; }, async getById() { return null; }, async save(t) { return t; } },
  };
}

const DISCIPLINE = { id: "disc-hist", name: "História" };
const UNIT = { id: "unit-1", disciplineId: "disc-hist", academicYearId: "y1", label: "Unidade 1", order: 1, status: "published", version: 1 };
const THEME_WITH_BNCC = {
  id: "theme-revolucao",
  unitId: "unit-1",
  label: "Revolução Industrial e o mundo do trabalho",
  order: 1,
  objectives: ["Compreender as transformações do trabalho na industrialização."],
  bnccCompetencies: ["EM13CHS106 (referência institucional) — analisar processos de transformação do trabalho."],
  bnccComputacaoCompetencies: [],
  estimatedMinutes: 50,
  lessonIds: [],
  missionIds: [],
  knowledgeDocumentIds: [],
  status: "published",
  version: 2,
};
const THEME_NO_BNCC = {
  ...THEME_WITH_BNCC,
  id: "theme-sem-bncc",
  bnccCompetencies: [],
  objectives: ["Reconhecer os impactos sociais da automação."],
};

test("encontra tema real por tópico e devolve sugestão a partir de bnccCompetencies existente, sem inventar código", async () => {
  const repositories = fakeRepositories({
    disciplines: [DISCIPLINE],
    units: [UNIT],
    themesByUnit: { "unit-1": [THEME_WITH_BNCC] },
  });
  const result = await findCurriculumSkillSuggestions(repositories, { subject: "História", topic: "Revolução Industrial" });
  assert.equal(result.length, 1);
  assert.equal(result[0].code, null); // nunca inventa código
  assert.ok(result[0].description.includes("transformação do trabalho"));
  assert.equal(result[0].document, "BNCC (referência do Currículo Institucional)");
});

test("tema sem bnccCompetencies cai para objectives reais, documentado como tal (nunca como BNCC)", async () => {
  const repositories = fakeRepositories({
    disciplines: [DISCIPLINE],
    units: [UNIT],
    themesByUnit: { "unit-1": [THEME_NO_BNCC] },
  });
  const result = await findCurriculumSkillSuggestions(repositories, { subject: "História", topic: "Revolução Industrial" });
  assert.equal(result.length, 1);
  assert.equal(result[0].code, null);
  assert.equal(result[0].document, "Objetivo do Currículo Institucional");
  assert.ok(!result[0].document.toLowerCase().includes("bncc"));
});

test("nenhuma correspondência segura devolve lista vazia (nunca inventa uma habilidade)", async () => {
  const repositories = fakeRepositories({
    disciplines: [DISCIPLINE],
    units: [UNIT],
    themesByUnit: { "unit-1": [THEME_WITH_BNCC] },
  });
  const result = await findCurriculumSkillSuggestions(repositories, { subject: "História", topic: "Fotossíntese em algas marinhas" });
  assert.deepEqual(result, []);
});

test("sem tópico, nunca busca (não há o que casar)", async () => {
  const repositories = fakeRepositories({ disciplines: [DISCIPLINE], units: [UNIT], themesByUnit: {} });
  const result = await findCurriculumSkillSuggestions(repositories, { subject: "História" });
  assert.deepEqual(result, []);
});

test("nunca devolve mais de 3 sugestões", async () => {
  const manyThemes = Array.from({ length: 5 }, (_, i) => ({
    ...THEME_WITH_BNCC,
    id: `theme-${i}`,
    label: `Revolução Industrial variante ${i}`,
    bnccCompetencies: [`Competência ${i}`],
  }));
  const repositories = fakeRepositories({
    disciplines: [DISCIPLINE],
    units: [UNIT],
    themesByUnit: { "unit-1": manyThemes },
  });
  const result = await findCurriculumSkillSuggestions(repositories, { subject: "História", topic: "Revolução Industrial" });
  assert.ok(result.length <= 3);
});
