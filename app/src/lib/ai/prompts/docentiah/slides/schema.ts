import { z } from "zod";

/**
 * Contrato de entrada e saída da capacidade `docentiah.generate_slides`
 * — única fonte de verdade dos tipos `DocentiahSlidesGenerationInput`/
 * `DocentiahSlidesGenerationOutput` (o wizard, a Server Action e o
 * template de prompt importam daqui, nunca redeclaram).
 */

export const EDUCATION_LEVELS = [
  "ensino_fundamental_anos_iniciais",
  "ensino_fundamental_anos_finais",
  "ensino_medio",
  "pre_vestibular",
  "formacao_docente",
] as const;

export const EDUCATION_LEVEL_LABEL: Record<(typeof EDUCATION_LEVELS)[number], string> = {
  ensino_fundamental_anos_iniciais: "Ensino Fundamental — Anos Iniciais",
  ensino_fundamental_anos_finais: "Ensino Fundamental — Anos Finais",
  ensino_medio: "Ensino Médio",
  pre_vestibular: "Pré-vestibular",
  formacao_docente: "Formação docente",
};

export const METHODOLOGIES = [
  "expositiva_dialogada",
  "investigativa",
  "aprendizagem_baseada_em_problemas",
  "aprendizagem_baseada_em_projetos",
  "sala_de_aula_invertida",
  "estudo_de_caso",
  "debate",
  "personalizada",
] as const;

export const METHODOLOGY_LABEL: Record<(typeof METHODOLOGIES)[number], string> = {
  expositiva_dialogada: "Expositiva dialogada",
  investigativa: "Investigativa",
  aprendizagem_baseada_em_problemas: "Aprendizagem baseada em problemas",
  aprendizagem_baseada_em_projetos: "Aprendizagem baseada em projetos",
  sala_de_aula_invertida: "Sala de aula invertida",
  estudo_de_caso: "Estudo de caso",
  debate: "Debate",
  personalizada: "Personalizada",
};

export const METHODOLOGY_DESCRIPTION: Record<(typeof METHODOLOGIES)[number], string> = {
  expositiva_dialogada: "O professor apresenta o conteúdo abrindo espaço para perguntas ao longo da aula.",
  investigativa: "A turma investiga uma questão real antes de chegar ao conceito formal.",
  aprendizagem_baseada_em_problemas: "Parte de um problema concreto que orienta toda a aula.",
  aprendizagem_baseada_em_projetos: "Organiza o conteúdo em torno de uma produção final da turma.",
  sala_de_aula_invertida: "Pressupõe contato prévio com o tema; a aula aprofunda e aplica.",
  estudo_de_caso: "Analisa uma situação real ou hipotética para extrair o conceito.",
  debate: "Estrutura a aula em torno de posições contrárias sobre o tema.",
  personalizada: "Metodologia própria — descreva em Detalhes adicionais.",
};

export const DETAIL_LEVELS = ["sintetico", "equilibrado", "aprofundado"] as const;

export const DETAIL_LEVEL_LABEL: Record<(typeof DETAIL_LEVELS)[number], string> = {
  sintetico: "Sintético",
  equilibrado: "Equilibrado",
  aprofundado: "Aprofundado",
};

export const VISUAL_THEMES = [
  "essencial",
  "investigativo",
  "visual",
  "academico",
  "contemporaneo",
  "humanidades_tecnologia",
] as const;

const educationLevelSchema = z.enum(EDUCATION_LEVELS);
const methodologySchema = z.enum(METHODOLOGIES);
const detailLevelSchema = z.enum(DETAIL_LEVELS);
const visualThemeSchema = z.enum(VISUAL_THEMES);

export const docentiahSlidesGenerationInputSchema = z.object({
  // Etapa 1 — Contexto da aula (obrigatórios)
  subject: z.string().trim().min(1, "Informe a disciplina.").max(120),
  educationLevel: educationLevelSchema,
  grade: z.string().trim().min(1, "Informe o ano ou série.").max(60),
  topic: z.string().trim().min(1, "Informe o tema da aula.").max(160),
  lessonDurationMinutes: z.number().int().min(10).max(240),
  slideCount: z.number().int().min(5).max(30),

  // Etapa 2 — Como ensinar (opcionais)
  learningObjectives: z.string().trim().max(2000).optional(),
  methodology: methodologySchema.optional(),
  language: z.literal("pt-BR").default("pt-BR"),
  detailLevel: detailLevelSchema.default("equilibrado"),
  studentProfile: z.string().trim().max(1000).optional(),

  // Etapa 3 — Fontes e contexto (opcionais)
  additionalContext: z.string().trim().max(4000).optional(),
  webSearchEnabled: z.boolean().default(false),

  // Etapa 4 — Aparência
  visualTheme: visualThemeSchema.default("essencial"),

  // Etapa 5 — Opções de estrutura
  includeClosingActivity: z.boolean().default(true),
  includeTeacherNotes: z.boolean().default(true),
  includeReferences: z.boolean().default(true),
});

export type DocentiahSlidesGenerationInput = z.infer<typeof docentiahSlidesGenerationInputSchema>;

const slideSchema = z.object({
  number: z.number().int().min(1),
  title: z.string().trim().min(1, "Todo slide precisa de título.").max(120),
  purpose: z.string().trim().min(1).max(300),
  studentContent: z.array(z.string().trim().min(1).max(400)).min(1).max(8),
  keyConcepts: z.array(z.string().trim().min(1).max(120)).default([]),
  example: z.string().trim().max(600).nullable().default(null),
  visualSuggestion: z.string().trim().max(300).nullable().default(null),
  teacherNotes: z.string().trim().max(800).nullable().default(null),
  sourceReferenceIds: z.array(z.string()).default([]),
});

export type DocentiahSlide = z.infer<typeof slideSchema>;

const referenceSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1),
  url: z.string().trim().nullable().default(null),
});

export const docentiahSlidesGenerationOutputSchema = z.object({
  title: z.string().trim().min(1, "A apresentação precisa de um título.").max(160),
  subtitle: z.string().trim().max(200).nullable().default(null),
  subject: z.string().trim().min(1),
  grade: z.string().trim().min(1),
  estimatedDurationMinutes: z.number().int().min(1),
  learningObjectives: z.array(z.string().trim().min(1)).default([]),
  methodology: z.string().trim().nullable().default(null),
  slides: z.array(slideSchema).min(3, "A apresentação precisa de pelo menos 3 slides."),
  closingActivity: z.string().trim().nullable().default(null),
  teacherGuidance: z.string().trim().nullable().default(null),
  references: z.array(referenceSchema).default([]),
  warnings: z.array(z.string()).default([]),
});

export type DocentiahSlidesGenerationOutput = z.infer<typeof docentiahSlidesGenerationOutputSchema>;
