import { EDUCATION_LEVEL_LABEL } from "../../modules/conexoes-iah/domain/entities.ts";
import type { LessonPlanningBrief } from "../../modules/docentiah/domain/lesson-planning-brief.ts";
import type {
  InfographicDraft,
  LessonPlanDraft,
  MindMapDraft,
} from "../../modules/docentiah/domain/material-drafts.ts";

/**
 * Geradores demonstrativos e determinísticos dos 3 novos tipos de
 * material do Planejador Conversacional (plano de aula, infográfico,
 * mapa mental) — mesmo espírito de `demo-llm-provider.ts`: nunca
 * inventam fato novo, só organizam o que já está no
 * `LessonPlanningBrief` (tópico, conceito, conexão IAH, habilidades,
 * perfil da turma). O perfil da turma só adapta linguagem/duração/
 * exemplos, nunca é tratado como diagnóstico.
 */

function briefContextLine(brief: LessonPlanningBrief): string {
  const parts = [brief.subject, brief.grade && brief.educationLevel ? `${brief.grade} do ${EDUCATION_LEVEL_LABEL[brief.educationLevel]}` : null].filter(Boolean);
  return parts.join(" · ") || "Turma não especificada";
}

function hasProfile(brief: LessonPlanningBrief, tag: string): boolean {
  return brief.classProfile.includes(tag);
}

function adaptedTextLength(brief: LessonPlanningBrief, short: string, long: string): string {
  return hasProfile(brief, "dificuldade_leitura") || hasProfile(brief, "dificuldade_interpretacao") ? short : long;
}

function iahConnectionText(brief: LessonPlanningBrief): string | null {
  if (!brief.iahConnection) return null;
  return brief.iahConnection.title;
}

export function generateLessonPlanDraft(brief: LessonPlanningBrief): LessonPlanDraft {
  const topic = brief.topic ?? "tema a definir";
  const concept = brief.specificConcept;
  const extraExample = hasProfile(brief, "precisa_mais_exemplos");
  const dispersa = hasProfile(brief, "dispersa");
  const neurodivergente = hasProfile(brief, "alunos_neurodivergentes");
  const laboratorio = hasProfile(brief, "aula_laboratorio");

  const objectives = [
    adaptedTextLength(
      brief,
      `Compreender os aspectos centrais de ${topic}.`,
      `Compreender e relacionar os aspectos centrais de ${topic}${concept ? `, com foco em ${concept}` : ""}.`,
    ),
  ];
  if (brief.selectedCurriculumSkills.length > 0) {
    objectives.push(`Desenvolver a(s) habilidade(s) curricular(es) selecionada(s) para esta aula.`);
  }

  const mobilization = dispersa
    ? `Abertura rápida (3–5 min): uma pergunta direta sobre ${topic} para capturar a atenção da turma logo de início.`
    : `Abertura (5–8 min): apresente ${topic} com uma pergunta que ainda não tem resposta fechada, para mobilizar a turma.`;

  const development = adaptedTextLength(
    brief,
    `Explique ${topic} em blocos curtos, com pausas para checar entendimento.`,
    `Desenvolva ${topic}${concept ? `, aprofundando em ${concept}` : ""}, alternando explicação com momentos de participação da turma.`,
  );

  const activity = laboratorio
    ? `Atividade prática em laboratório: investigação guiada sobre ${topic}, em pequenos grupos.`
    : `Atividade em duplas ou pequenos grupos: aplicar ${topic} a uma situação concreta trazida pela turma.`;

  const synthesis = `Retomada da pergunta de abertura: o que mudou no que a turma sabe sobre ${topic}?`;

  const assessment = neurodivergente
    ? `Avaliação com alternativas de participação (oral, escrita ou visual) sobre ${topic} — critérios claros e antecipados à turma.`
    : `Avaliação formativa: observação da participação e uma pergunta de síntese sobre ${topic}.`;

  const materials = ["Quadro ou projeção", "Material impresso ou digital de apoio"];
  if (extraExample) materials.push("Exemplos adicionais impressos para consulta durante a atividade");
  if (laboratorio) materials.push("Materiais de laboratório pertinentes ao experimento/investigação");

  return {
    title: `Plano de aula — ${topic}`,
    context: briefContextLine(brief),
    objectives,
    selectedSkills: brief.selectedCurriculumSkills.map((s) => s.description),
    iahConnection: iahConnectionText(brief),
    mobilization,
    development,
    activity,
    synthesis,
    assessment,
    materials,
    teacherGuidance: neurodivergente
      ? "Mantenha uma estrutura previsível na aula (mesma sequência de blocos) e avise a turma antes de cada transição."
      : "Ajuste o ritmo conforme o repertório prévio da turma.",
  };
}

export function generateInfographicDraft(brief: LessonPlanningBrief): InfographicDraft {
  const topic = brief.topic ?? "tema a definir";
  const concept = brief.specificConcept;
  const blocks = [
    { title: "O que é", content: `Definição central de ${topic}.` },
    { title: "Por que importa", content: `Relevância de ${topic} para a turma e para o cotidiano.` },
  ];
  if (concept) blocks.push({ title: concept, content: `Como ${concept} se relaciona com ${topic}.` });
  if (brief.iahConnection) blocks.push({ title: "Conexão IAH", content: brief.iahConnection.rationale });

  return {
    title: topic,
    centralMessage: `Entender ${topic} de forma direta e visual.`,
    blocks,
    dataOrConcepts: [topic, concept].filter((v): v is string => Boolean(v)),
    visualHierarchy: ["Título", "Mensagem central", ...blocks.map((b) => b.title)],
    iconSuggestions: ["ícone temático do assunto", "ícone de conexão/rede", "ícone de pergunta/reflexão"],
    sources: brief.selectedCurriculumSkills.map((s) => s.document),
    palette: brief.visualTheme ?? "iah_claro",
  };
}

export function generateMindMapDraft(brief: LessonPlanningBrief): MindMapDraft {
  const topic = brief.topic ?? "tema a definir";
  const concept = brief.specificConcept;
  const branches = [
    { label: "O que é", subBranches: [`Definição de ${topic}`] },
    { label: "Como funciona", subBranches: concept ? [concept] : [`Mecanismo central de ${topic}`] },
    { label: "Na prática", subBranches: [`Exemplo aplicado de ${topic}`] },
  ];

  return {
    centralConcept: topic,
    branches,
    relations: concept ? [`${topic} → ${concept}`] : [],
    examples: [`Situação concreta relacionada a ${topic}`],
    iahConnections: brief.iahConnection ? [brief.iahConnection.title] : [],
    curricularSkills: brief.selectedCurriculumSkills.map((s) => s.description),
  };
}
