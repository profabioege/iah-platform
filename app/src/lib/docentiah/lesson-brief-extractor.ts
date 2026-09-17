import { CURRICULUM_CATALOG } from "../../modules/conexoes-iah/infrastructure/catalog/curriculum-catalog.ts";
import { EDUCATION_LEVEL_LABEL, GRADE_OPTIONS, type EducationLevel } from "../../modules/conexoes-iah/domain/entities.ts";
import type { LessonPlanningBrief } from "../../modules/docentiah/domain/lesson-planning-brief.ts";

/**
 * `docentiah.build_lesson_brief` — capability arquitetural (Etapa
 * "Planejador Conversacional"). Nesta primeira versão é transporte
 * mockado: extração determinística por regra, não uma chamada de IA —
 * pronta para trocar de motor sem mudar o contrato de entrada/saída
 * (mesmo espírito de `LlmProvider`/`CurriculumConnectionProvider`).
 *
 * Só extrai o que o professor já escreveu — nunca presume disciplina,
 * série ou conteúdo não mencionados.
 */

export interface BuildLessonBriefInput {
  message: string;
  currentBrief: LessonPlanningBrief;
}

export interface SuggestedAction {
  id: string;
  label: string;
}

export interface BuildLessonBriefOutput {
  extractedFields: Partial<LessonPlanningBrief>;
  missingFields: Array<"gradeInfo" | "topic" | "subject">;
  confirmationSummary: string | null;
  nextQuestion: string | null;
  suggestedActions: SuggestedAction[];
  warnings: string[];
  confidence: number;
}

const SUBJECT_KEYWORDS: Record<string, string> = {
  "hist[oó]ria": "História",
  "matem[aá]tica": "Matemática",
  "ci[eê]ncias": "Ciências",
  "biologia": "Biologia",
  "f[ií]sica": "Física",
  "qu[ií]mica": "Química",
  "geografia": "Geografia",
  "portugu[eê]s|l[ií]ngua portuguesa|linguagens": "Linguagens",
  "arte": "Arte",
  "sociologia": "Sociologia",
  "filosofia": "Filosofia",
  "forma[cç][aã]o docente": "Formação docente",
  "intelig[eê]ncia artificial\\s*&?\\s*humanidades|ia\\s*&\\s*humanidades": "Inteligência Artificial & Humanidades",
};

const FUNDAMENTAL_INICIAIS_YEARS = ["1", "2", "3", "4", "5"];
const FUNDAMENTAL_FINAIS_YEARS = ["6", "7", "8", "9"];
const MEDIO_SERIES = ["1", "2", "3"];

function detectSubject(message: string): string | undefined {
  for (const [pattern, label] of Object.entries(SUBJECT_KEYWORDS)) {
    if (new RegExp(pattern, "i").test(message)) return label;
  }
  return undefined;
}

function detectGrade(message: string): { educationLevel: EducationLevel; grade: string } | undefined {
  const explicitFormacaoDocente = /forma[cç][aã]o docente/i.test(message);
  if (explicitFormacaoDocente) return undefined; // "Formação docente" não tem série — tratado como público, não turma.

  const serieMatch = message.match(/(\d)\s*[ºª°]?\s*s[ée]rie/i);
  if (serieMatch && MEDIO_SERIES.includes(serieMatch[1])) {
    const grade = GRADE_OPTIONS.ensino_medio[Number(serieMatch[1]) - 1];
    return { educationLevel: "ensino_medio", grade };
  }

  const anoMatch = message.match(/(\d)\s*[ºª°]?\s*ano/i);
  if (anoMatch) {
    const n = anoMatch[1];
    if (FUNDAMENTAL_INICIAIS_YEARS.includes(n)) {
      return { educationLevel: "ensino_fundamental_anos_iniciais", grade: GRADE_OPTIONS.ensino_fundamental_anos_iniciais[Number(n) - 1] };
    }
    if (FUNDAMENTAL_FINAIS_YEARS.includes(n)) {
      return {
        educationLevel: "ensino_fundamental_anos_finais",
        grade: GRADE_OPTIONS.ensino_fundamental_anos_finais[Number(n) - 6],
      };
    }
  }

  if (/ensino m[eé]dio/i.test(message) && !serieMatch) return undefined; // etapa sem série ainda não é suficiente
  return undefined;
}

/** "relacionando mais-valia à automação e à Inteligência Artificial" -> concept="mais-valia", connectionHint="automação e à Inteligência Artificial". */
function detectConceptAndConnection(message: string): { specificConcept?: string; connectionHint?: string } {
  const match = message.match(/relacionando\s+(.+?)\s+(?:à|ao|a|com)\s+(.+?)[.]?$/i);
  if (!match) return {};
  return { specificConcept: match[1].trim(), connectionHint: match[2].trim() };
}

/** Corta antes de "para [a/o] <turma/série/ano/turma-alvo>" — cláusula de audiência, não parte do tópico. */
const TRAILING_AUDIENCE_CLAUSE = /\s+para\s+(?:a\s+|o\s+)?.*$/i;

function stripTrailingAudienceClause(text: string): string {
  return text.replace(TRAILING_AUDIENCE_CLAUSE, "").trim();
}

/** "sobre Revolução Industrial, relacionando..." -> topic="Revolução Industrial". Fallback: frase inteira sem o gatilho de disciplina/série. */
function detectTopic(message: string, subject: string | undefined): string | undefined {
  const explicitFormacaoDocente = /forma[cç][aã]o docente/i.test(message);
  if (explicitFormacaoDocente) {
    const afterSobre = message.match(/forma[cç][aã]o docente[.,:]?\s*(.+)/i);
    return afterSobre?.[1] ? stripTrailingAudienceClause(afterSobre[1]) || undefined : undefined;
  }

  const mapaMatch = message.match(/mapa mental sobre\s+([^,.]+)/i);
  if (mapaMatch) return stripTrailingAudienceClause(mapaMatch[1]);

  const soMatch = message.match(/sobre\s+([^,.]+)/i);
  if (soMatch) return stripTrailingAudienceClause(soMatch[1]);

  const trabalharMatch = message.match(/trabalhar\s+([^,.]+)/i);
  if (trabalharMatch) return stripTrailingAudienceClause(trabalharMatch[1]);

  // Sem gatilho reconhecido — não inventa tópico a partir de disciplina/série isoladas.
  if (subject && new RegExp(subject, "i").test(message) && message.replace(new RegExp(subject, "i"), "").trim().length < 15) {
    return undefined;
  }
  return undefined;
}

/**
 * Quando a mensagem não nomeia a disciplina explicitamente (ex.: "sobre
 * Revolução Industrial" sem dizer "História"), procura o tópico no
 * catálogo curricular real (`CURRICULUM_CATALOG`) — nunca adivinha, só
 * usa uma correspondência já curada e existente na base.
 */
function inferSubjectFromCatalog(topic: string | undefined): string | undefined {
  if (!topic) return undefined;
  const normalized = topic.trim().toLowerCase();
  const entry = CURRICULUM_CATALOG.find((candidate) => candidate.topic.trim().toLowerCase() === normalized);
  return entry?.disciplineName;
}

const GRADE_QUESTION_ACTIONS: SuggestedAction[] = [
  { id: "ensino_fundamental_anos_iniciais", label: "Fundamental — Anos Iniciais" },
  { id: "ensino_fundamental_anos_finais", label: "Fundamental — Anos Finais" },
  { id: "ensino_medio", label: "Ensino Médio" },
];

export function buildLessonBrief({ message, currentBrief }: BuildLessonBriefInput): BuildLessonBriefOutput {
  const trimmed = message.trim();
  const warnings: string[] = [];

  const gradeInfo = currentBrief.educationLevel && currentBrief.grade ? { educationLevel: currentBrief.educationLevel, grade: currentBrief.grade } : detectGrade(trimmed);
  const keywordSubject = currentBrief.subject ?? detectSubject(trimmed);
  const topic = currentBrief.topic ?? detectTopic(trimmed, keywordSubject);
  const subject = keywordSubject ?? inferSubjectFromCatalog(topic);
  const { specificConcept, connectionHint } = detectConceptAndConnection(trimmed);

  const extractedFields: Partial<LessonPlanningBrief> = {};
  if (subject) extractedFields.subject = subject;
  if (gradeInfo) {
    extractedFields.educationLevel = gradeInfo.educationLevel;
    extractedFields.grade = gradeInfo.grade;
  }
  if (topic) extractedFields.topic = topic;
  if (specificConcept ?? currentBrief.specificConcept) extractedFields.specificConcept = specificConcept ?? currentBrief.specificConcept;
  if (connectionHint) extractedFields.additionalContext = connectionHint;

  const missingFields: BuildLessonBriefOutput["missingFields"] = [];
  if (!gradeInfo) missingFields.push("gradeInfo");
  if (!topic) missingFields.push("topic");
  if (!subject && !topic) missingFields.push("subject"); // só cobrado quando nem o tópico ajuda a inferir contexto

  let nextQuestion: string | null = null;
  let suggestedActions: SuggestedAction[] = [];
  if (missingFields.includes("gradeInfo")) {
    nextQuestion = "Com qual turma?";
    suggestedActions = GRADE_QUESTION_ACTIONS;
  } else if (missingFields.includes("topic")) {
    nextQuestion = "Qual é o conteúdo ou tema da aula?";
  } else if (missingFields.includes("subject")) {
    nextQuestion = "Para qual disciplina?";
  }

  let confirmationSummary: string | null = null;
  if (!nextQuestion) {
    // A linha de turma aparece mesmo sem disciplina confirmada — não some só porque
    // o catálogo não teve uma correspondência para inferir a disciplina (achado da
    // validação manual: "seleção natural, 9º ano" perdia a série no resumo).
    const gradeLine = gradeInfo ? `${gradeInfo.grade} do ${EDUCATION_LEVEL_LABEL[gradeInfo.educationLevel]}` : null;
    const subjectAndGradeLine = subject && gradeLine ? `${subject} · ${gradeLine}` : (subject ?? gradeLine);
    const lines = [
      subjectAndGradeLine,
      topic ? `${topic}${specificConcept ? ` · ${specificConcept}` : ""}` : null,
      connectionHint ? `Conexão IAH: ${connectionHint}` : null,
    ].filter(Boolean);
    confirmationSummary = `Entendi:\n\n${lines.join("\n")}\n\nEstá correto?`;
  }

  const confidence = [subject, gradeInfo, topic].filter(Boolean).length / 3;

  return {
    extractedFields,
    missingFields,
    confirmationSummary,
    nextQuestion,
    suggestedActions,
    warnings,
    confidence,
  };
}
