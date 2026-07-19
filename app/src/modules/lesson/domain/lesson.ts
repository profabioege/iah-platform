/**
 * Lesson (Aula) — Intelligent Lesson Composer (Sprint M13, evolução do
 * Lesson Builder MVP da Sprint M12). Segunda implementação de código do
 * conceito registrado em D-028 (`docs/DECISIONS.md`): a Lesson como
 * Pedagogical Package. Esta Sprint amplia o subconjunto coberto pelo
 * assistente — agora inclui Metodologia (formato da aula) e Avaliação,
 * além de Planejamento, Currículo, Mission Flow e Materiais.
 *
 * Os demais componentes do pacote completo ainda só conceituais
 * (Slides/NotebookLM como origem própria, Portfólio, Adaptações para
 * Neurodivergentes, Analytics) seguem sem campo fake criado aqui —
 * D-016: nunca fingir funcionalidade.
 *
 * NÃO substitui `Mission`/`StudioMission` — uma Lesson referencia uma
 * Mission Flow existente (`missionId`), nunca a contém.
 */

export type LessonFormat =
  | "investigacao"
  | "debate"
  | "estudo_de_caso"
  | "oficina"
  | "projeto"
  | "laboratorio"
  | "producao";

export const LESSON_FORMAT_LABEL: Record<LessonFormat, string> = {
  investigacao: "Investigação",
  debate: "Debate",
  estudo_de_caso: "Estudo de Caso",
  oficina: "Oficina",
  projeto: "Projeto",
  laboratorio: "Laboratório",
  producao: "Produção",
};

export const LESSON_FORMATS: LessonFormat[] = [
  "investigacao",
  "debate",
  "estudo_de_caso",
  "oficina",
  "projeto",
  "laboratorio",
  "producao",
];

export interface Lesson {
  id: string;
  author: string;

  // Etapa 1 — Quem é minha turma?
  grade: string;
  /** -> `Classroom.id` (`modules/platform`) — M17: Turma real do Colégio Beryon, não mais texto livre. */
  classroomId: string | null;
  classroomLabel: string;
  estimatedMinutes: number | null;

  // Etapa 2 — O que quero ensinar?
  topic: string;
  objective: string;
  /** Eixo do Planejamento Anual — hoje derivado dos `module` das Missões existentes (`modules/library`). */
  planningAxis: string;
  // Currículo (LDB/BNCC/BNCC Computação, D-029/D-030 — catálogo formal
  // de códigos ainda não existe; entrada livre por ora)
  bnccCompetencies: string[];
  bnccComputacaoCompetencies: string[];

  // Etapa 3 — Como meus alunos irão aprender? (sugerido por regra simples, `domain/composer.ts`)
  format: LessonFormat | null;

  // Etapa 4 — Com quais recursos? (Knowledge Engine, modules/knowledge)
  knowledgeDocumentIds: string[];

  // Etapa 5 — Como será a missão? (Mission Flow existente, modules/library)
  missionId: string | null;

  // Etapa 6 — Avaliação (Rubrica/Critérios/Evidências derivados da Mission
  // selecionada; Competências avaliadas = as já coletadas na Etapa 2)
  assessmentNotes: string | null;

  createdAt: string;
  updatedAt: string;
  /** Preenchido na etapa final ("Salvar Lesson"); null enquanto é rascunho. */
  savedAt: string | null;
}

export function createEmptyLesson(author: string): Lesson {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    author,
    grade: "",
    classroomId: null,
    classroomLabel: "",
    estimatedMinutes: null,
    topic: "",
    objective: "",
    planningAxis: "",
    bnccCompetencies: [],
    bnccComputacaoCompetencies: [],
    format: null,
    knowledgeDocumentIds: [],
    missionId: null,
    assessmentNotes: null,
    createdAt: now,
    updatedAt: now,
    savedAt: null,
  };
}

/** Pendências mínimas antes de permitir "Salvar Lesson" (etapa final). */
export function lessonSaveBlockers(lesson: Lesson): string[] {
  const blockers: string[] = [];
  if (!lesson.grade.trim()) blockers.push("Série é obrigatória.");
  if (!lesson.classroomId) blockers.push("Turma é obrigatória.");
  if (!lesson.topic.trim()) blockers.push("Tema é obrigatório.");
  if (!lesson.objective.trim()) blockers.push("Objetivo é obrigatório.");
  if (!lesson.missionId) blockers.push("Selecione uma Mission Flow.");
  return blockers;
}
