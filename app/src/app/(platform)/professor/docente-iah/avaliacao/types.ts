/**
 * Rascunho do wizard de Avaliação do DocentIAH — parâmetros desejados
 * para uma futura geração (D-045). Não é o mesmo formato de
 * `LessonAssessment`/`AssessmentQuestion` (`modules/assessment`), que
 * modelam uma avaliação já autorada e publicável: este tipo descreve o
 * que o professor está pedindo, antes de qualquer questão existir.
 * Vive só em `useState` local — sem repositório, sem autosave, sem IA
 * conectada nesta etapa.
 */
export interface AvaliacaoDraft {
  // Sobre a avaliação (obrigatório)
  disciplina: string;
  anoSerie: string;
  tema: string;
  quantidadeQuestoes: number | null;

  // Formato e critérios (obrigatório)
  tiposQuestao: string[];
  dificuldade: string | null;
  valorTotal: number | null;

  // Detalhes opcionais
  objetivosAprendizagem: string[];
  duracaoPrevistaMinutos: number | null;
  contextoTurma: string;
  instrucoesAdicionais: string;
  competenciasHabilidades: string[];
  materiaisReferencia: string[];

  // Adaptações pedagógicas
  adaptacaoNeurodivergente: boolean;
  adaptacoesSelecionadas: string[];
  necessidadesEspecificas: string;
}

export function createEmptyAvaliacaoDraft(disciplina = ""): AvaliacaoDraft {
  return {
    disciplina,
    anoSerie: "",
    tema: "",
    quantidadeQuestoes: null,
    tiposQuestao: [],
    dificuldade: null,
    valorTotal: null,
    objetivosAprendizagem: [],
    duracaoPrevistaMinutos: null,
    contextoTurma: "",
    instrucoesAdicionais: "",
    competenciasHabilidades: [],
    materiaisReferencia: [],
    adaptacaoNeurodivergente: false,
    adaptacoesSelecionadas: [],
    necessidadesEspecificas: "",
  };
}

/** Mesma lista de séries do Montador de Aula — mesmo vocabulário em todo o produto. */
export const GRADE_OPTIONS = ["1º ano E.M.", "2º ano E.M.", "3º ano E.M."];

export const QUESTION_TYPE_OPTIONS = [
  "Múltipla escolha",
  "Verdadeiro ou falso",
  "Dissertativa",
  "Associação de colunas",
  "Completar lacunas",
];

export const DIFFICULTY_OPTIONS = ["Fácil", "Médio", "Difícil"];

/** As opções configuráveis quando "Criar versão adaptada para alunos neurodivergentes" está ativo. */
export const ADAPTATION_OPTIONS = [
  "Linguagem mais direta",
  "Enunciados mais curtos",
  "Uma instrução por vez",
  "Maior espaçamento visual",
  "Menor quantidade de questões por página",
  "Destaque de palavras-chave",
  "Divisão da avaliação em blocos",
  "Redução de distrações visuais",
  "Apoio visual",
  "Tempo ampliado",
  "Alternativas com maior legibilidade",
];

/** Regras pedagógicas fixas — sempre visíveis quando a adaptação está ativa. */
export const ADAPTATION_RULES = [
  "A versão adaptada não reduz automaticamente os objetivos de aprendizagem.",
  "A linguagem não é infantilizada.",
  "O conteúdo essencial e os critérios avaliativos são preservados.",
  "Adaptação de acessibilidade é diferente de redução curricular.",
  "O professor revisa e aprova a versão adaptada antes de usá-la.",
];

export const ADAPTATION_NOTICE =
  "A adaptação deve considerar as necessidades individuais do estudante e as orientações pedagógicas da instituição.";
