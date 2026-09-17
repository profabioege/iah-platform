import type {
  ConceptEntry,
  CurriculumCatalogEntry,
  EducationLevel,
  IahConnectionEntry,
  KnowledgeReference,
} from "./entities";

/**
 * Modo de recuperação — só `"keyword"` está implementado no MVP
 * (casamento por termo normalizado). `"semantic"`/`"hybrid"` existem na
 * interface para permitir, no futuro, um `InstitutionalKnowledgeSource`
 * ou `ConceptKnowledgeSource` reais com embeddings/banco vetorial, sem
 * mudar o contrato consumido pelo provider.
 */
export const RETRIEVAL_MODES = ["keyword", "semantic", "hybrid"] as const;
export type RetrievalMode = (typeof RETRIEVAL_MODES)[number];

export interface RetrievalQuery {
  term: string;
  normalizedTerm: string;
  disciplineSlug?: string;
  educationLevel?: EducationLevel;
  grade?: string;
  /** Default `"keyword"` quando omitido. */
  mode?: RetrievalMode;
}

export interface RetrievalMatch<T> {
  item: T;
  /** 0 a 1 — relevância do casamento, não confiança final (o provider combina vários matches para calcular confiança). */
  score: number;
  reference: KnowledgeReference | null;
}

/**
 * Consulta conteúdos curriculares estruturados (BNCC, BNCC Computação,
 * Currículo Paulista, currículos institucionais, referenciais do Método
 * IAH). No MVP, implementado sobre um catálogo estático versionado em
 * código (`infrastructure/catalog/curriculum-catalog.ts`).
 */
export interface CurriculumKnowledgeSource {
  /** Temas de uma combinação disciplina+etapa+série — usado na Etapa 1 (até 7 temas + "Outro tema"). */
  listTopics(disciplineSlug: string, educationLevel: EducationLevel, grade: string): Promise<CurriculumCatalogEntry[]>;
  search(query: RetrievalQuery): Promise<RetrievalMatch<CurriculumCatalogEntry>[]>;
}

/** Biblioteca conceitual interdisciplinar (conceito, definição, autores/teorias, áreas, contextos). */
export interface ConceptKnowledgeSource {
  search(query: RetrievalQuery): Promise<RetrievalMatch<ConceptEntry>[]>;
}

/** Conexões autorais do IAH, já curadas e validadas editorialmente. */
export interface IahConnectionKnowledgeSource {
  searchByConceptKeywords(conceptKeywords: string[]): Promise<RetrievalMatch<IahConnectionEntry>[]>;
}

export interface InstitutionalMatch {
  title: string;
  excerpt: string;
}

/**
 * Contexto próprio da escola: currículo institucional, planejamento,
 * material didático, arquivos anexados, aulas já cadastradas. No MVP
 * não há nenhuma dessas fontes conectadas ainda — a implementação
 * demonstrativa retorna sempre vazio, honestamente (nunca inventa
 * contexto institucional que não existe).
 */
export interface InstitutionalKnowledgeSource {
  search(institutionId: string, query: RetrievalQuery): Promise<RetrievalMatch<InstitutionalMatch>[]>;
}

export interface ConexoesKnowledgeSources {
  curriculum: CurriculumKnowledgeSource;
  concept: ConceptKnowledgeSource;
  iahConnection: IahConnectionKnowledgeSource;
  institutional: InstitutionalKnowledgeSource;
}
