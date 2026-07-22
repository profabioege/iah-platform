import type { ConceptEntry } from "../../domain/entities";

/**
 * Biblioteca conceitual interdisciplinar do MVP — pequena, genérica e
 * extensível. "Mais-valia" é só um destes registros; nenhum código em
 * qualquer lugar deste módulo compara texto contra ele diretamente.
 */
export const CONCEPT_LIBRARY: ConceptEntry[] = [
  {
    id: "concept-mais-valia",
    concept: "Mais-valia",
    keywords: ["mais-valia", "mais valia", "mais valia trabalho"],
    definition:
      "Diferença entre o valor que o trabalho produz e o valor pago ao trabalhador pela sua força de trabalho — conceito central da crítica marxista ao capitalismo industrial.",
    theoristsOrTheories: ["Karl Marx", "Teoria do valor-trabalho"],
    areas: ["História", "Sociologia", "Economia"],
    contexts: ["capitalismo industrial", "trabalho e relações de produção", "revolução industrial"],
    relatedConcepts: ["exploração do trabalho", "acumulação de capital", "produtividade"],
    referenceIds: ["ref-bncc-em", "ref-conceitual-classicos"],
    validationStatus: "validated",
  },
  {
    id: "concept-selecao-natural",
    concept: "Seleção natural",
    keywords: ["selecao natural", "selecao natural darwin", "evolucao das especies"],
    definition:
      "Mecanismo pelo qual características hereditárias que aumentam a chance de sobrevivência e reprodução tendem a se tornar mais comuns numa população ao longo de gerações.",
    theoristsOrTheories: ["Charles Darwin", "Teoria da evolução"],
    areas: ["Biologia", "Ciências da Natureza"],
    contexts: ["evolução das espécies", "adaptação ao ambiente", "variabilidade genética"],
    relatedConcepts: ["mutação genética", "adaptação", "seleção artificial"],
    referenceIds: ["ref-bncc-em", "ref-conceitual-classicos"],
    validationStatus: "validated",
  },
  {
    id: "concept-funcao-exponencial",
    concept: "Função exponencial",
    keywords: ["funcao exponencial", "crescimento exponencial"],
    definition:
      "Função da forma f(x) = a·b^x, em que a variável aparece no expoente — modela fenômenos de crescimento ou decaimento cuja taxa de variação é proporcional ao valor atual.",
    theoristsOrTheories: ["Álgebra elementar", "Modelagem matemática"],
    areas: ["Matemática"],
    contexts: ["crescimento populacional", "juros compostos", "escala de processamento computacional"],
    relatedConcepts: ["progressão geométrica", "logaritmo", "taxa de crescimento"],
    referenceIds: ["ref-bncc-em"],
    validationStatus: "validated",
  },
  {
    id: "concept-modernismo",
    concept: "Modernismo",
    keywords: ["modernismo", "movimento modernista", "semana de arte moderna"],
    definition:
      "Movimento artístico e cultural do início do século XX que rompeu com convenções acadêmicas, buscando novas formas de expressão nacional e experimentação estética.",
    theoristsOrTheories: ["Semana de Arte Moderna de 1922", "Mário de Andrade", "Tarsila do Amaral"],
    areas: ["Arte", "Literatura", "História"],
    contexts: ["ruptura estética", "identidade nacional", "vanguardas artísticas"],
    relatedConcepts: ["vanguarda", "antropofagia cultural", "experimentação artística"],
    referenceIds: ["ref-curriculo-paulista", "ref-conceitual-classicos"],
    validationStatus: "validated",
  },
  {
    id: "concept-fake-news",
    concept: "Fake news",
    keywords: ["fake news", "desinformacao", "noticias falsas"],
    definition:
      "Informações falsas ou enganosas, apresentadas com aparência de notícia legítima, frequentemente amplificadas por redes sociais e sistemas de recomendação automatizados.",
    theoristsOrTheories: ["Estudos de mídia e comunicação", "Verificação de fatos (fact-checking)"],
    areas: ["Linguagens", "Sociologia", "Comunicação"],
    contexts: ["redes sociais", "circulação de informação", "verificação de fontes"],
    relatedConcepts: ["viés de confirmação", "bolha informacional", "letramento midiático"],
    referenceIds: ["ref-bncc-em", "ref-curriculo-paulista"],
    validationStatus: "validated",
  },
  {
    id: "concept-mudancas-climaticas",
    concept: "Mudanças climáticas",
    keywords: ["mudancas climaticas", "aquecimento global", "crise climatica"],
    definition:
      "Alterações de longo prazo nos padrões climáticos globais, aceleradas pela ação humana — sobretudo pela emissão de gases de efeito estufa.",
    theoristsOrTheories: ["IPCC", "Ciências ambientais"],
    areas: ["Ciências da Natureza", "Geografia"],
    contexts: ["efeito estufa", "sustentabilidade", "impacto ambiental da tecnologia"],
    relatedConcepts: ["pegada de carbono", "sustentabilidade", "transição energética"],
    referenceIds: ["ref-bncc-em"],
    validationStatus: "validated",
  },
  {
    id: "concept-perspectiva",
    concept: "Perspectiva",
    keywords: ["perspectiva", "perspectiva artistica", "ponto de fuga"],
    definition:
      "Técnica de representação que cria a ilusão de profundidade e volume numa superfície bidimensional, organizando elementos visuais em relação a um ponto de vista.",
    theoristsOrTheories: ["Renascimento", "Filippo Brunelleschi"],
    areas: ["Arte"],
    contexts: ["representação visual", "ponto de vista", "composição de imagem"],
    relatedConcepts: ["ponto de fuga", "profundidade visual", "composição"],
    referenceIds: ["ref-curriculo-paulista"],
    validationStatus: "in_review",
  },
  {
    id: "concept-probabilidade",
    concept: "Probabilidade",
    keywords: ["probabilidade", "chance de ocorrencia", "estatistica probabilidade"],
    definition:
      "Ramo da matemática que estuda a chance de ocorrência de eventos, atribuindo valores entre 0 e 1 à sua verossimilhança.",
    theoristsOrTheories: ["Teoria das probabilidades", "Estatística"],
    areas: ["Matemática"],
    contexts: ["análise de risco", "modelos preditivos", "tomada de decisão sob incerteza"],
    relatedConcepts: ["estatística", "distribuição de dados", "amostragem"],
    referenceIds: ["ref-bncc-em"],
    validationStatus: "validated",
  },
];

export function getConceptById(id: string): ConceptEntry | null {
  return CONCEPT_LIBRARY.find((concept) => concept.id === id) ?? null;
}
