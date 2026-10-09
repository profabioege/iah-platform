/**
 * Referencial IAH de competências em IA — PROVISÓRIO.
 *
 * ⚠ Redigido pela equipe IAH para o produto (D-053). NÃO são códigos
 * oficiais do MEC nem de organismo internacional: os ids `ia-…` são
 * internos. O alinhamento formal com o "Referencial para Desenvolvimento
 * e Uso Responsáveis de IA na Educação" (MEC, 2026 — já na Biblioteca,
 * `docs/product/mec-referencial-ia-2026-integration.md`) e com marcos
 * internacionais de competência em IA está PENDENTE de decisão docente.
 *
 * Organização pelos quatro verbos do eixo de ensino de IA do produto:
 * usar, compreender, avaliar e criar com IA.
 *
 * A progressão em IA NÃO é deduzida da série do aluno: um estudante da
 * 3ª série pode nunca ter usado IA com método. A trilha de IA começa onde
 * o professor a coloca, independentemente da série.
 */

export type AiCompetencyDimension = "usar" | "compreender" | "avaliar" | "criar";

export interface AiCompetency {
  id: string;
  dimension: AiCompetencyDimension;
  label: string;
}

export const AI_DIMENSIONS: Record<AiCompetencyDimension, string> = {
  usar: "Usar IA",
  compreender: "Compreender IA",
  avaliar: "Avaliar IA",
  criar: "Criar com IA",
};

export const AI_COMPETENCIES_REFERENCE_LABEL =
  "Referencial IAH de competências em IA (provisório, 2026) — alinhamento com o Referencial do MEC pendente";

export const AI_COMPETENCIES: AiCompetency[] = [
  {
    id: "ia-usar-01",
    dimension: "usar",
    label: "Formular pedidos à IA com objetivo, contexto e limites explícitos.",
  },
  {
    id: "ia-compreender-01",
    dimension: "compreender",
    label: "Explicar que a IA generativa produz conteúdo plausível a partir de padrões, sem garantia de verdade.",
  },
  {
    id: "ia-avaliar-01",
    dimension: "avaliar",
    label: "Verificar a resposta da IA com critério ou fonte independente antes de usá-la.",
  },
  {
    id: "ia-avaliar-02",
    dimension: "avaliar",
    label: "Identificar erros, vieses e efeitos sociais do uso da IA.",
  },
  {
    id: "ia-criar-01",
    dimension: "criar",
    label: "Criar com IA declarando o uso e assumindo a autoria das decisões.",
  },
];
