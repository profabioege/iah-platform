/**
 * Estabilização da candidata de apresentação — três fragilidades travadas:
 *
 * A. o Estúdio de Missões abre com a Missão 01 no modo demo (semente
 *    determinística, derivada do mesmo conteúdo que o aluno percorre);
 * B. os contadores do Painel do Gestor nascem coerentes com o seed demo
 *    (publicações derivadas do progresso já semeado);
 * C. o DocentIAH reconhece as formas usuais de série, ano e turma.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildLessonBrief,
  normalizeGradeMention,
} from "../src/lib/docentiah/lesson-brief-extractor.ts";
import { createEmptyLessonPlanningBrief } from "../src/modules/docentiah/domain/lesson-planning-brief.ts";

const codigo = (rel) =>
  readFileSync(new URL(`../src/${rel}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

function emptyBrief() {
  return createEmptyLessonPlanningBrief("inst-a", "teacher-a");
}

// ============================================================ C. série
test("DocentIAH aceita as formas usuais de série do Ensino Médio", () => {
  for (const entrada of ["2ª série", "2a série", "2a serie", "2º EM", "2º EM A", "2o EM B", "2 E.M."]) {
    const { extractedFields } = buildLessonBrief({ message: entrada, currentBrief: emptyBrief() });
    assert.equal(extractedFields.educationLevel, "ensino_medio", entrada);
    assert.equal(extractedFields.grade, "2ª série", entrada);
  }
});

test("DocentIAH aceita as formas usuais de ano do Ensino Fundamental", () => {
  for (const entrada of ["9º ano", "9 ano", "9o ano"]) {
    const { extractedFields } = buildLessonBrief({ message: entrada, currentBrief: emptyBrief() });
    assert.equal(extractedFields.educationLevel, "ensino_fundamental_anos_finais", entrada);
    assert.equal(extractedFields.grade, "9º ano", entrada);
  }
});

test("normalização não reescreve 'em', 'anos', 'EM' fora de 1–3 nem palavras parecidas", () => {
  // Só a normalização é verificada aqui: o detector de ano da base (sem
  // limite de palavra) segue exatamente como era — não faz parte deste ajuste.
  for (const entrada of ["Quero dividir em 2 em grupos", "alunos de 9 anos", "2 anotações", "4 EM", "Aula sobre fake news"]) {
    assert.equal(normalizeGradeMention(entrada), entrada, entrada);
  }
  for (const entrada of ["Quero dividir em 2 em grupos", "4 EM"]) {
    const { extractedFields } = buildLessonBrief({ message: entrada, currentBrief: emptyBrief() });
    assert.equal(extractedFields.grade, undefined, entrada);
  }
});

test("pedido completo com '2a série' mantém tópico e disciplina de sempre", () => {
  const { extractedFields } = buildLessonBrief({
    message: "Preciso de uma aula de História para a 2a série do Ensino Médio sobre Revolução Industrial",
    currentBrief: emptyBrief(),
  });
  assert.equal(extractedFields.subject, "História");
  assert.equal(extractedFields.grade, "2ª série");
  assert.equal(extractedFields.topic, "Revolução Industrial");
});

// ============================================================ A. Estúdio
test("Estúdio: a semente é a Missão 01 do conteúdo, publicada e determinística", async () => {
  const { missions } = await import("../src/content/missions/index.ts");
  const { buildDemoStudioMission, DEMO_STUDIO_MISSION_ID } = await import(
    "../src/modules/authoring/seeds/demo-studio-seed.ts"
  );
  const { publishBlockers } = await import("../src/modules/authoring/domain/studio-mission.ts");
  const missao01 = missions.find((mission) => mission.number === 1);
  const contexto = { author: "Professor(a) de demonstração", schoolYear: "1º ano E.M." };

  const semente = buildDemoStudioMission(missao01, contexto);
  assert.deepEqual(buildDemoStudioMission(missao01, contexto), semente, "mesma entrada, mesma semente");
  assert.equal(semente.id, DEMO_STUDIO_MISSION_ID);
  assert.equal(semente.status, "published");
  assert.equal(semente.title, missao01.title);
  assert.equal(semente.guidingQuestion, missao01.guidingQuestion);
  assert.deepEqual(publishBlockers(semente), []);
  assert.doesNotMatch(JSON.stringify(semente), /\bEge\b|fabio\.ege/i);
});

test("Estúdio: semear é idempotente e não desfaz o que o professor fez", async () => {
  const armazenado = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => (armazenado.has(k) ? armazenado.get(k) : null),
      setItem: (k, v) => armazenado.set(k, String(v)),
    },
  };
  try {
    const { seedLocalMissionStudio, localMissionStudioRepository } = await import(
      "../src/modules/authoring/infrastructure/local-mission-studio-repository.ts"
    );
    const semente = { id: "studio-x", status: "published", title: "Missão 01" };

    await seedLocalMissionStudio([semente]);
    await seedLocalMissionStudio([semente]);
    assert.equal((await localMissionStudioRepository.list()).length, 1, "não duplica");

    await localMissionStudioRepository.archive("studio-x");
    await seedLocalMissionStudio([semente]);
    assert.equal((await localMissionStudioRepository.get("studio-x")).status, "archived", "não sobrescreve");
  } finally {
    delete globalThis.window;
  }
});

test("Estúdio: a semente só é entregue depois de confirmar o modo demo", () => {
  for (const tela of ["app/(platform)/professor/estudio/page.tsx", "app/(platform)/professor/estudio/[id]/page.tsx"]) {
    assert.match(codigo(tela), /requirePlatformDataMode\(\) === "demo" \? await loadDemoStudioSeed\(\) : \[\]/, tela);
  }
});

// ============================================================ B. contadores
test("Gestor: publicações do seed derivam do progresso já semeado", async () => {
  const { DEMO_MISSION_ASSIGNMENTS, DEMO_MISSION_PROGRESS, DEMO_MISSION_RECORD } = await import(
    "../src/modules/platform/seeds/demo-seed.ts"
  );
  const turmasComProgresso = [
    ...new Set(DEMO_MISSION_PROGRESS.filter((p) => p.status !== "nao_acessou").map((p) => p.classroomId)),
  ].sort();

  assert.deepEqual(DEMO_MISSION_ASSIGNMENTS.map((a) => a.classroomId).sort(), turmasComProgresso);
  assert.ok(DEMO_MISSION_ASSIGNMENTS.length > 0, "estado inicial não pode ser vazio");
  for (const publicacao of DEMO_MISSION_ASSIGNMENTS) {
    assert.equal(publicacao.missionId, DEMO_MISSION_RECORD.id);
    assert.equal(publicacao.status, "published");
  }
  assert.equal(
    DEMO_MISSION_ASSIGNMENTS.some((a) => a.classroomId === "class-1em-a"),
    false,
    "a turma da jornada continua sem publicação — ela é feita ao vivo",
  );
});

test("Gestor: o repositório seed entrega as publicações derivadas", () => {
  assert.match(
    codigo("modules/platform/infrastructure/seed/seed-repositories.ts"),
    /const assignments: MissionAssignment\[\] = \[\.\.\.DEMO_MISSION_ASSIGNMENTS\];/,
  );
});
