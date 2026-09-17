import type { LessonPlanningBrief } from "../../modules/docentiah/domain/lesson-planning-brief.ts";
import type {
  EssayQuestion,
  InfographicDraft,
  LessonPlanActivity,
  LessonPlanDraft,
  MindMapDraft,
  ObjectiveQuestion,
  ResearchTask,
} from "../../modules/docentiah/domain/material-drafts.ts";

/**
 * Geradores demonstrativos e determinísticos dos 3 novos tipos de
 * material do Planejador Conversacional (plano de aula, infográfico,
 * mapa mental) — mesmo espírito de `demo-llm-provider.ts`: nunca
 * inventam fato novo, só organizam o que já está no
 * `LessonPlanningBrief` (tópico, conceito, conexão IAH — com a
 * `rationale` já concreta escolhida em Conexões IAH —, habilidades
 * curriculares reais, perfil da turma, duração, objetivo docente). O
 * perfil da turma só adapta linguagem/duração/exemplos, nunca é
 * tratado como diagnóstico.
 *
 * O plano de aula evita instruções vazias ao professor ("apresente o
 * conteúdo", "explique o tema") — cada bloco monta conteúdo pronto
 * (perguntas, exemplo, conceitos, questões com gabarito) a partir dos
 * dados reais já coletados, nunca hardcoded para um tópico específico.
 */

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

// ---------------------------------------------------------------------------
// Plano de aula — introdução (Mobilização)
// ---------------------------------------------------------------------------

function buildContextualization(brief: LessonPlanningBrief): string {
  const topic = brief.topic ?? "o tema desta aula";
  const subject = brief.subject ?? "esta disciplina";
  const concept = brief.specificConcept;
  const conceptClause = concept
    ? ` Um fio condutor importante aqui é "${concept}": entender esse conceito ajuda a explicar por que ${topic} continua relevante além do registro histórico ou teórico.`
    : "";
  return adaptedTextLength(
    brief,
    `${topic} é um conteúdo central de ${subject}. Ele descreve uma mudança concreta — algo que alterou como pessoas produzem, pensam ou se organizam — com efeitos que ainda aparecem hoje.${concept ? ` O conceito de "${concept}" é a chave para entender essa mudança.` : ""}`,
    `${topic} é um conteúdo central de ${subject} porque descreve uma transformação concreta — algo que mudou a forma como as pessoas produzem, se relacionam ou tomam decisões — e cujos efeitos ainda aparecem hoje, em contextos diferentes do original.${conceptClause}`,
  );
}

function buildPriorKnowledgeQuestions(brief: LessonPlanningBrief): string[] {
  const topic = brief.topic ?? "esse tema";
  const concept = brief.specificConcept;
  const iahTitle = brief.iahConnection?.title;
  const questions = [`O que vocês já ouviram falar sobre ${topic}?`];
  questions.push(
    concept
      ? `Alguém já ouviu o termo "${concept}"? O que imagina que ele signifique?`
      : `O que muda, na prática, quando ${topic} acontece ou passa a valer?`,
  );
  questions.push(iahTitle ? `Onde vocês já perceberam algo parecido com "${iahTitle}" no dia a dia?` : `Quem ganha e quem perde quando algo assim muda?`);
  if (!hasProfile(brief, "dificuldade_leitura")) {
    questions.push(`Existe alguma ideia sobre ${topic} que vocês acham que é senso comum, mas pode estar errada?`);
  }
  return questions;
}

function buildOpeningExample(brief: LessonPlanningBrief): string {
  const topic = brief.topic ?? "o tema de hoje";
  const concept = brief.specificConcept;
  const rationale = brief.iahConnection?.rationale;
  if (rationale) {
    return `${rationale} É esse tipo de situação — concreta, presente na turma hoje — que conecta ${topic} ao que vamos discutir.`;
  }
  if (concept) {
    return `Pense numa situação em que "${concept}" aparece na prática, mesmo sem esse nome técnico. É exatamente essa lacuna entre o nome formal e a experiência concreta que ${topic} ajuda a explicar.`;
  }
  return `Traga para a roda uma situação recente — uma notícia, um produto ou uma mudança de rotina — que se relacione diretamente com ${topic}, para que a turma compare o caso concreto com o conteúdo formal que vem a seguir.`;
}

// ---------------------------------------------------------------------------
// Plano de aula — desenvolvimento
// ---------------------------------------------------------------------------

function buildTopics(brief: LessonPlanningBrief): Array<{ title: string; explanation: string }> {
  const topic = brief.topic ?? "o tema";
  const concept = brief.specificConcept;
  const topics = [
    {
      title: `O que é ${topic}`,
      explanation: adaptedTextLength(
        brief,
        `${topic} descreve uma mudança concreta e verificável, não uma opinião — vale começar situando quando e onde ela ocorre.`,
        `${topic} descreve uma mudança concreta e verificável — não uma opinião — que pode ser situada no tempo, no espaço e nos grupos de pessoas envolvidos. Comece nomeando esses três elementos antes de avançar para as causas.`,
      ),
    },
  ];
  if (concept) {
    topics.push({
      title: `Por que "${concept}" importa aqui`,
      explanation: `"${concept}" é o conceito que explica o mecanismo por trás de ${topic}: sem ele, a mudança parece só um fato isolado; com ele, fica visível o padrão que se repete em outros contextos.`,
    });
  }
  topics.push({
    title: `Consequências de ${topic}`,
    explanation: `Toda mudança desse tipo redistribui algo — tempo, poder, renda ou oportunidade — entre grupos diferentes. Vale nomear quem ganha, quem perde e o que muda na rotina de cada grupo.`,
  });
  return topics;
}

function buildKeyConcepts(brief: LessonPlanningBrief): Array<{ term: string; definition: string }> {
  const topic = brief.topic ?? "o tema";
  const concepts: Array<{ term: string; definition: string }> = [
    { term: topic, definition: `Processo ou fenômeno central desta aula, que serve de referência para os demais conceitos.` },
  ];
  if (brief.specificConcept) {
    concepts.push({
      term: brief.specificConcept,
      definition: `Conceito-chave para interpretar ${topic} — aparece sempre que se pergunta quem se beneficia e como esse benefício é medido ou distribuído.`,
    });
  }
  for (const skill of brief.selectedCurriculumSkills.slice(0, 2)) {
    concepts.push({ term: skill.description, definition: `Habilidade curricular selecionada para esta aula (fonte: ${skill.document}).` });
  }
  return concepts;
}

function buildExamples(brief: LessonPlanningBrief): string[] {
  const topic = brief.topic ?? "o tema";
  const examples = [`Um caso histórico ou atual que ilustra ${topic} na prática, com nomes, datas ou dados que a turma possa checar.`];
  if (brief.iahConnection) examples.push(brief.iahConnection.rationale);
  return examples;
}

function buildDeepeningQuestions(brief: LessonPlanningBrief): string[] {
  const topic = brief.topic ?? "esse tema";
  const concept = brief.specificConcept;
  const iahTitle = brief.iahConnection?.title;
  const questions: string[] = [];
  questions.push(concept ? `${concept} beneficia todos os envolvidos com ${topic} da mesma forma? Por quê?` : `${topic} afeta todos os grupos envolvidos da mesma forma?`);
  questions.push(`O que mudaria em ${topic} se um dos fatores centrais deixasse de existir?`);
  if (iahTitle) questions.push(`Em que ${iahTitle.toLowerCase()} se parece e em que se diferencia de ${topic}?`);
  return questions;
}

function buildCommonMisconceptions(brief: LessonPlanningBrief): string[] {
  const topic = brief.topic ?? "o tema";
  const concept = brief.specificConcept;
  const misconceptions = [`Achar que ${topic} é só um fato do passado ou de um único contexto, sem efeito hoje.`];
  if (concept) misconceptions.push(`Confundir "${concept}" com sinônimo de "progresso" ou "crescimento" — o conceito é mais específico que isso.`);
  return misconceptions;
}

// ---------------------------------------------------------------------------
// Plano de aula — atividade (objetiva / dissertativa / pesquisa)
// ---------------------------------------------------------------------------

function difficultyForProfile(brief: LessonPlanningBrief): string {
  if (hasProfile(brief, "dificuldade_interpretacao") || hasProfile(brief, "dificuldade_leitura")) return "básico";
  return "intermediário";
}

function buildObjectiveQuestions(brief: LessonPlanningBrief): ObjectiveQuestion[] {
  const topic = brief.topic ?? "o tema";
  const concept = brief.specificConcept;
  const difficulty = difficultyForProfile(brief);
  const questions: ObjectiveQuestion[] = [
    {
      prompt: `Qual alternativa melhor descreve ${topic}?`,
      options: [
        `Uma mudança concreta que redistribuiu algo relevante entre grupos diferentes.`,
        `Um evento isolado, sem relação com o presente.`,
        `Uma opinião pessoal sem base em fatos verificáveis.`,
        `Um tema apenas teórico, sem aplicação prática.`,
      ],
      correctOptionIndex: 0,
      rationale: `${topic} é definido pela mudança concreta que provoca — não é um evento isolado nem uma opinião.`,
      difficulty,
    },
  ];
  if (concept) {
    questions.push({
      prompt: `No contexto de ${topic}, o que melhor explica "${concept}"?`,
      options: [
        `Um mecanismo que ajuda a entender quem se beneficia da mudança e como.`,
        `Um sinônimo direto de ${topic}, sem diferença de significado.`,
        `Uma crítica moral ao tema, sem base analítica.`,
        `Um dado estatístico isolado, sem relação com o processo.`,
      ],
      correctOptionIndex: 0,
      rationale: `"${concept}" funciona como uma lente analítica sobre ${topic}, não como sinônimo nem como julgamento de valor.`,
      difficulty,
    });
  }
  questions.push({
    prompt: brief.iahConnection
      ? `A conexão "${brief.iahConnection.title}" mostra que ${topic}...`
      : `Comparando ${topic} com processos semelhantes em outros momentos, é correto afirmar que...`,
    options: [
      `tem um padrão que se repete em outros contextos, mesmo com tecnologias diferentes.`,
      `é um caso único, sem paralelo em nenhum outro momento.`,
      `deixou de ter qualquer efeito prático atualmente.`,
      `não pode ser comparado a nenhum processo posterior.`,
    ],
    correctOptionIndex: 0,
    rationale: `O valor de comparar ${topic} com outros contextos está em reconhecer o padrão que se repete, não a coincidência exata dos fatos.`,
    difficulty,
  });
  return questions;
}

function buildEssayQuestions(brief: LessonPlanningBrief): EssayQuestion[] {
  const topic = brief.topic ?? "o tema";
  const concept = brief.specificConcept;
  const questions: EssayQuestion[] = [
    {
      prompt: `Explique, com suas palavras, por que ${topic} ainda é relevante hoje.`,
      cognitiveDemand: "Explicar e justificar",
      expectedAnswer: `Espera-se que a resposta relacione o mecanismo central de ${topic} a um efeito observável no presente, com pelo menos um exemplo concreto.`,
      correctionCriteria: [`Identifica corretamente o mecanismo central de ${topic}.`, `Relaciona esse mecanismo a um efeito atual, com exemplo.`, `Usa linguagem própria, sem copiar a definição literalmente.`],
      suggestedScore: 3,
    },
  ];
  if (concept) {
    questions.push({
      prompt: `Compare duas situações em que "${concept}" aparece, uma histórica (ou teórica) e uma atual. O que muda e o que permanece?`,
      cognitiveDemand: "Comparar",
      expectedAnswer: `Espera-se identificação de ao menos uma semelhança estrutural e uma diferença de contexto entre as duas situações.`,
      correctionCriteria: [`Descreve corretamente as duas situações comparadas.`, `Aponta uma semelhança estrutural real.`, `Aponta uma diferença de contexto (tecnologia, época, escala).`],
      suggestedScore: 4,
    });
  }
  return questions;
}

function buildResearchTask(brief: LessonPlanningBrief): ResearchTask {
  const topic = brief.topic ?? "o tema";
  const concept = brief.specificConcept;
  return {
    centralQuestion: concept ? `Como "${concept}" se manifesta em um caso atual relacionado a ${topic}?` : `Que caso atual mostra ${topic} em ação?`,
    guidingQuestions: [
      `Quando e onde esse caso atual acontece?`,
      `Quem são os grupos envolvidos e o que cada um ganha ou perde?`,
      `Em que esse caso se parece e em que se diferencia de ${topic}?`,
    ],
    recommendedSources: ["Reportagens de veículos jornalísticos reconhecidos", "Dados de institutos de pesquisa ou órgãos oficiais", "Material didático ou acadêmico já usado na disciplina"],
    expectedProduct: `Um resumo curto (meia página ou um vídeo de até 2 minutos) apresentando o caso e respondendo à pergunta central.`,
    qualityCriteria: ["Usa pelo menos duas fontes diferentes.", "Responde diretamente à pergunta central.", "Indica de onde vêm as informações."],
    verificationGuidance: "Confirme se a fonte é identificável (autor, veículo ou instituição) e se a informação aparece em mais de um lugar confiável antes de considerá-la um fato.",
    authorshipNote: "Cite as fontes usadas (nome do veículo/autor e data) ao final do resumo — inclusive quando parafrasear.",
  };
}

function buildActivity(brief: LessonPlanningBrief): LessonPlanActivity {
  const topic = brief.topic ?? "o tema";
  const laboratorio = hasProfile(brief, "aula_laboratorio");
  const extraExample = hasProfile(brief, "precisa_mais_exemplos");
  const objectiveQuestions = buildObjectiveQuestions(brief);
  const essayQuestions = buildEssayQuestions(brief);
  const researchTask = buildResearchTask(brief);
  const resources = ["Quadro ou projeção", "Material impresso ou digital de apoio"];
  if (extraExample) resources.push("Exemplos adicionais impressos para consulta durante a atividade");
  if (laboratorio) resources.push("Materiais de laboratório pertinentes ao experimento/investigação");

  return {
    title: `Atividade — ${topic}`,
    objective: brief.teacherGoal ?? `Aplicar o conteúdo de ${topic} a uma situação nova, com apoio de questões e critérios claros.`,
    instructions: laboratorio
      ? `Em pequenos grupos, conduzam a investigação guiada sobre ${topic} usando os materiais de laboratório disponíveis; registrem observações antes de responder às questões.`
      : `Em duplas ou pequenos grupos, leiam as questões abaixo e discutam antes de registrar as respostas individualmente.`,
    durationMinutes: brief.lessonDurationMinutes ?? 20,
    format: laboratorio ? "grupo" : "dupla",
    resources,
    activityKind: "mixed",
    objectiveQuestions,
    essayQuestions,
    researchTask,
    answerKey: objectiveQuestions.map((q, i) => `Q${i + 1}: alternativa ${String.fromCharCode(65 + q.correctOptionIndex)} — ${q.rationale}`).join("\n"),
    correctionCriteria: essayQuestions.flatMap((q) => q.correctionCriteria),
  };
}

// ---------------------------------------------------------------------------
// Geradores públicos
// ---------------------------------------------------------------------------

export function generateLessonPlanDraft(brief: LessonPlanningBrief): LessonPlanDraft {
  const topic = brief.topic ?? "tema a definir";
  const skillDocuments = brief.selectedCurriculumSkills.map((s) => s.document);
  const sourceReferences = Array.from(new Set([...brief.sourceReferences, ...skillDocuments]));

  return {
    title: `Plano de aula — ${topic}`,
    introduction: {
      contextualization: buildContextualization(brief),
      priorKnowledgeQuestions: buildPriorKnowledgeQuestions(brief),
      openingExample: buildOpeningExample(brief),
      teacherGuidance: hasProfile(brief, "alunos_neurodivergentes")
        ? "Mantenha uma estrutura previsível na aula (mesma sequência de blocos) e avise a turma antes de cada transição."
        : hasProfile(brief, "dispersa")
          ? "Abra com a pergunta mais direta (3–5 min) para capturar a atenção antes de aprofundar."
          : "Reserve de 5 a 8 minutos para esta etapa antes de avançar para o desenvolvimento.",
    },
    development: {
      topics: buildTopics(brief),
      keyConcepts: buildKeyConcepts(brief),
      examples: buildExamples(brief),
      iahConnection: iahConnectionText(brief),
      deepeningQuestions: buildDeepeningQuestions(brief),
      commonMisconceptions: buildCommonMisconceptions(brief),
    },
    activity: buildActivity(brief),
    sourceReferences,
    status: "draft",
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

export type LessonPlanRewriteSection = "introduction" | "development" | "activity" | "full";

/**
 * Substitui só a seção pedida do rascunho atual pela seção equivalente
 * recém-gerada — nunca troca o rascunho inteiro, exceto quando o
 * professor pede explicitamente "planejamento completo". As demais
 * seções (e as edições do professor nelas) ficam intactas.
 */
export function mergeLessonPlanSection(
  current: LessonPlanDraft,
  fresh: LessonPlanDraft,
  section: LessonPlanRewriteSection,
): LessonPlanDraft {
  if (section === "full") return fresh;
  if (section === "introduction") return { ...current, introduction: fresh.introduction };
  if (section === "development") return { ...current, development: fresh.development };
  return { ...current, activity: fresh.activity };
}

export interface SlidesPrefillPayload {
  subject: string | undefined;
  educationLevel: string | undefined;
  grade: string | undefined;
  topic: string | undefined;
  studentProfile: string;
  visualTheme: string;
}

/**
 * Contexto que a Apresentação de slides recebe do Planejador
 * Conversacional (via `sessionStorage`) — disciplina, série, tema e
 * perfil da turma nunca são perguntados de novo no wizard.
 */
export function buildSlidesPrefillPayload(brief: LessonPlanningBrief, palette: string): SlidesPrefillPayload {
  return {
    subject: brief.subject,
    educationLevel: brief.educationLevel,
    grade: brief.grade,
    topic: brief.topic,
    studentProfile: brief.classProfile.join(", "),
    visualTheme: palette,
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
