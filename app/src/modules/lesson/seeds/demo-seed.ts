import type { Lesson } from "../domain/lesson";

/**
 * Lesson institucional da jornada demonstrativa — turma 1º EM A, o
 * cenário oficial da demonstração comercial. Referencia somente ids
 * canônicos dos módulos Platform, Library e Knowledge, sem duplicar
 * entidades. As competências repetem as da própria Mission 01
 * (`modules/library`) — entrada livre, sem código BNCC fabricado
 * (D-029/D-030: o catálogo formal ainda não existe).
 *
 * A turma é 1º EM A para coincidir com `aluno01@`/`aluno02@`, os dois
 * estudantes do roteiro de demonstração — mesma turma usada pelo seed
 * do banco real (`app/db/seed/seed-demo.mjs`). Os dois modos contam a
 * mesma história.
 */
export const DEMO_LESSON: Lesson = {
  id: "lesson-horizonte-fabrica-noticias-1em-a",
  author: "Fabio Ege",
  grade: "1º ano E.M.",
  classroomId: "class-1em-a",
  classroomLabel: "1º EM A",
  estimatedMinutes: 50,
  topic: "Desinformação e verificação de fontes",
  objective:
    "Investigar conteúdos potencialmente manipulados e justificar um veredito com evidências verificáveis.",
  planningAxis: "Módulo 1 — O Auditor da Realidade",
  bnccCompetencies: [
    "Pensamento crítico e ceticismo saudável",
    "Verificação de fontes e checagem de evidências",
    "Uso ético e crítico da Inteligência Artificial",
    "Letramento midiático e digital",
  ],
  bnccComputacaoCompetencies: [],
  format: "investigacao",
  knowledgeDocumentIds: ["doc-como-uma-ia-escreve-noticia"],
  missionId: "01-a-fabrica-de-noticias",
  assessmentNotes:
    "Observar a qualidade das evidências, a justificativa do veredito e a clareza da reflexão final.",
  createdAt: "2026-07-19T09:00:00-03:00",
  updatedAt: "2026-07-19T09:00:00-03:00",
  savedAt: "2026-07-19T09:00:00-03:00",
};
