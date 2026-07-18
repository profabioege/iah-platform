/**
 * Lesson (Aula) — MVP do Lesson Builder (Sprint M12).
 *
 * Primeira implementação de código do conceito registrado em D-028
 * (`docs/DECISIONS.md`): a Lesson como Pedagogical Package. Esta Sprint
 * cobre só o subconjunto necessário ao assistente de montagem de aula —
 * Planejamento, Currículo, Mission Flow e Materiais do Knowledge Engine.
 * Os demais componentes do pacote completo (Slides, NotebookLM, Estudos
 * de Caso próprios, Avaliação Assistida, Adaptações para Neurodivergentes,
 * Portfólio, Analytics) seguem só conceituais — nenhum campo fake criado
 * aqui para eles (D-016: nunca fingir funcionalidade).
 *
 * NÃO substitui `Mission`/`StudioMission` — uma Lesson referencia uma
 * Mission Flow existente (`missionId`), nunca a contém.
 */

export interface Lesson {
  id: string;
  author: string;

  // Etapa 1 — Planejamento
  grade: string;
  classroomLabel: string;
  estimatedMinutes: number | null;
  topic: string;

  // Etapa 2 — Currículo (LDB/BNCC/BNCC Computação, D-029/D-030 — catálogo
  // formal de códigos ainda não existe; entrada livre por ora)
  bnccCompetencies: string[];
  bnccComputacaoCompetencies: string[];
  objectives: string[];

  // Etapa 3 — Mission Flow existente (modules/library)
  missionId: string | null;

  // Etapa 4 — Materiais do Knowledge Engine (modules/knowledge)
  knowledgeDocumentIds: string[];

  createdAt: string;
  updatedAt: string;
  /** Preenchido na Etapa 6 ("Salvar Lesson"); null enquanto é rascunho. */
  savedAt: string | null;
}

export function createEmptyLesson(author: string): Lesson {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    author,
    grade: "",
    classroomLabel: "Turma de demonstração",
    estimatedMinutes: null,
    topic: "",
    bnccCompetencies: [],
    bnccComputacaoCompetencies: [],
    objectives: [],
    missionId: null,
    knowledgeDocumentIds: [],
    createdAt: now,
    updatedAt: now,
    savedAt: null,
  };
}

/** Pendências mínimas antes de permitir "Salvar Lesson" (Etapa 6). */
export function lessonSaveBlockers(lesson: Lesson): string[] {
  const blockers: string[] = [];
  if (!lesson.grade.trim()) blockers.push("Série é obrigatória.");
  if (!lesson.topic.trim()) blockers.push("Tema é obrigatório.");
  if (!lesson.missionId) blockers.push("Selecione uma Mission Flow.");
  return blockers;
}
