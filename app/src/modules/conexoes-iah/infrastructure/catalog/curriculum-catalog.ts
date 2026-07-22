import type { CurriculumCatalogEntry } from "../../domain/entities";

/**
 * Catálogo curricular mínimo do MVP — pequeno, genérico e extensível.
 * Cobre História, Matemática, Ciências da Natureza, Linguagens, Arte e
 * Inteligência Artificial & Humanidades. Novas disciplinas/temas se
 * acrescentam como novos registros de dados, nunca como novos `if`.
 */
export const CURRICULUM_CATALOG: CurriculumCatalogEntry[] = [
  // História — 2ª série do Ensino Médio (recorte usado no caso de validação obrigatório)
  {
    id: "curr-historia-revolucao-industrial",
    disciplineSlug: "historia",
    disciplineName: "História",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Revolução Industrial",
    concepts: ["revolucao industrial", "mais-valia", "mais valia", "capitalismo industrial", "urbanizacao", "trabalho assalariado"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-trabalho-sociedade", "axis-poder-desigualdade"],
    validationStatus: "validated",
  },
  {
    id: "curr-historia-revolucao-francesa",
    disciplineSlug: "historia",
    disciplineName: "História",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Revolução Francesa",
    concepts: ["revolucao francesa", "iluminismo", "cidadania", "direitos do homem"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-cidadania-digital", "axis-poder-desigualdade"],
    validationStatus: "validated",
  },
  {
    id: "curr-historia-iluminismo",
    disciplineSlug: "historia",
    disciplineName: "História",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Iluminismo",
    concepts: ["iluminismo", "razao", "contrato social", "separacao dos poderes"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-etica-responsabilidade", "axis-pensamento-critico"],
    validationStatus: "validated",
  },
  {
    id: "curr-historia-colonizacao-america",
    disciplineSlug: "historia",
    disciplineName: "História",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Colonização da América",
    concepts: ["colonizacao da america", "escravidao", "sistema colonial", "exploracao de recursos"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-poder-desigualdade", "axis-sustentabilidade"],
    validationStatus: "validated",
  },
  {
    id: "curr-historia-guerra-fria",
    disciplineSlug: "historia",
    disciplineName: "História",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Guerra Fria",
    concepts: ["guerra fria", "bipolaridade", "corrida armamentista", "propaganda"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-dados-algoritmos", "axis-pensamento-critico"],
    validationStatus: "validated",
  },
  {
    id: "curr-historia-ditadura-militar",
    disciplineSlug: "historia",
    disciplineName: "História",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Ditadura Militar no Brasil",
    concepts: ["ditadura militar", "censura", "autoritarismo", "resistencia democratica"],
    referenceIds: ["ref-curriculo-paulista"],
    possibleIahAxisIds: ["axis-cidadania-digital", "axis-poder-desigualdade"],
    validationStatus: "validated",
  },
  {
    id: "curr-historia-globalizacao",
    disciplineSlug: "historia",
    disciplineName: "História",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Globalização",
    concepts: ["globalizacao", "economia de plataformas", "cadeias produtivas globais"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-trabalho-sociedade", "axis-sustentabilidade"],
    validationStatus: "validated",
  },

  // Matemática — 1ª série do Ensino Médio
  {
    id: "curr-matematica-funcao-exponencial",
    disciplineSlug: "matematica",
    disciplineName: "Matemática",
    educationLevel: "ensino_medio",
    grade: "1ª série",
    topic: "Função exponencial",
    concepts: ["funcao exponencial", "crescimento exponencial", "juros compostos"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-dados-algoritmos", "axis-sustentabilidade"],
    validationStatus: "validated",
  },
  {
    id: "curr-matematica-probabilidade",
    disciplineSlug: "matematica",
    disciplineName: "Matemática",
    educationLevel: "ensino_medio",
    grade: "1ª série",
    topic: "Probabilidade",
    concepts: ["probabilidade", "chance de ocorrencia", "analise de risco"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-dados-algoritmos", "axis-pensamento-critico"],
    validationStatus: "validated",
  },
  {
    id: "curr-matematica-estatistica",
    disciplineSlug: "matematica",
    disciplineName: "Matemática",
    educationLevel: "ensino_medio",
    grade: "1ª série",
    topic: "Estatística e tratamento de dados",
    concepts: ["estatistica", "tratamento de dados", "amostragem", "grafico e tabela"],
    referenceIds: ["ref-bncc-em", "ref-bncc-computacao"],
    possibleIahAxisIds: ["axis-dados-algoritmos"],
    validationStatus: "validated",
  },

  // Ciências da Natureza (Biologia) — 3ª série do Ensino Médio
  {
    id: "curr-ciencias-selecao-natural",
    disciplineSlug: "ciencias-natureza",
    disciplineName: "Ciências da Natureza",
    educationLevel: "ensino_medio",
    grade: "3ª série",
    topic: "Evolução e seleção natural",
    concepts: ["selecao natural", "evolucao das especies", "adaptacao", "variabilidade genetica"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-dados-algoritmos", "axis-etica-responsabilidade"],
    validationStatus: "validated",
  },
  {
    id: "curr-ciencias-mudancas-climaticas",
    disciplineSlug: "ciencias-natureza",
    disciplineName: "Ciências da Natureza",
    educationLevel: "ensino_medio",
    grade: "3ª série",
    topic: "Mudanças climáticas",
    concepts: ["mudancas climaticas", "aquecimento global", "efeito estufa"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-sustentabilidade"],
    validationStatus: "validated",
  },

  // Linguagens — 3ª série do Ensino Médio
  {
    id: "curr-linguagens-fake-news",
    disciplineSlug: "linguagens",
    disciplineName: "Linguagens",
    educationLevel: "ensino_medio",
    grade: "3ª série",
    topic: "Fake news e verificação de fontes",
    concepts: ["fake news", "desinformacao", "verificacao de fontes", "letramento midiatico"],
    referenceIds: ["ref-bncc-em", "ref-curriculo-paulista"],
    possibleIahAxisIds: ["axis-pensamento-critico", "axis-cidadania-digital"],
    validationStatus: "validated",
  },
  {
    id: "curr-linguagens-generos-textuais",
    disciplineSlug: "linguagens",
    disciplineName: "Linguagens",
    educationLevel: "ensino_medio",
    grade: "3ª série",
    topic: "Gêneros textuais digitais",
    concepts: ["generos textuais", "textos multimodais", "linguagem digital"],
    referenceIds: ["ref-bncc-em"],
    possibleIahAxisIds: ["axis-autoria-producao", "axis-cidadania-digital"],
    validationStatus: "validated",
  },

  // Arte — 2ª série do Ensino Médio
  {
    id: "curr-arte-modernismo",
    disciplineSlug: "arte",
    disciplineName: "Arte",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Modernismo brasileiro",
    concepts: ["modernismo", "semana de arte moderna", "vanguarda artistica"],
    referenceIds: ["ref-curriculo-paulista"],
    possibleIahAxisIds: ["axis-autoria-producao"],
    validationStatus: "validated",
  },
  {
    id: "curr-arte-perspectiva",
    disciplineSlug: "arte",
    disciplineName: "Arte",
    educationLevel: "ensino_medio",
    grade: "1ª série",
    topic: "Perspectiva e representação visual",
    concepts: ["perspectiva", "ponto de fuga", "representacao visual"],
    referenceIds: ["ref-curriculo-paulista"],
    possibleIahAxisIds: ["axis-autoria-producao"],
    validationStatus: "in_review",
  },

  // Inteligência Artificial & Humanidades — qualquer série (disciplina de origem já é o próprio IAH)
  {
    id: "curr-iah-dados-algoritmos",
    disciplineSlug: "ia-humanidades",
    disciplineName: "Inteligência Artificial & Humanidades",
    educationLevel: "ensino_medio",
    grade: "3ª série",
    topic: "Dados, algoritmos e decisões automatizadas",
    concepts: ["dados e algoritmos", "gestao algoritmica", "automacao", "decisao automatizada"],
    referenceIds: ["ref-metodo-iah", "ref-bncc-computacao"],
    possibleIahAxisIds: ["axis-dados-algoritmos", "axis-trabalho-sociedade"],
    validationStatus: "validated",
  },
  {
    id: "curr-iah-etica-ia",
    disciplineSlug: "ia-humanidades",
    disciplineName: "Inteligência Artificial & Humanidades",
    educationLevel: "ensino_medio",
    grade: "3ª série",
    topic: "Ética no desenvolvimento de sistemas de IA",
    concepts: ["etica em ia", "responsabilidade algoritmica", "vies algoritmico"],
    referenceIds: ["ref-metodo-iah"],
    possibleIahAxisIds: ["axis-etica-responsabilidade"],
    validationStatus: "validated",
  },
];

export function listCurriculumTopics(
  disciplineSlug: string,
  educationLevel: string,
  grade: string,
): CurriculumCatalogEntry[] {
  return CURRICULUM_CATALOG.filter(
    (entry) =>
      entry.disciplineSlug === disciplineSlug &&
      entry.educationLevel === educationLevel &&
      entry.grade === grade,
  );
}

/** Disciplinas de origem disponíveis na Etapa 1 — reflete exatamente o conjunto coberto pelo catálogo. */
export const CATALOG_DISCIPLINES = [
  { slug: "historia", name: "História" },
  { slug: "matematica", name: "Matemática" },
  { slug: "ciencias-natureza", name: "Ciências da Natureza" },
  { slug: "linguagens", name: "Linguagens" },
  { slug: "arte", name: "Arte" },
  { slug: "ia-humanidades", name: "Inteligência Artificial & Humanidades" },
] as const;
