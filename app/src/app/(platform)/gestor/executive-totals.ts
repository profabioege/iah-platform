/**
 * Agregação dos indicadores do Painel do Gestor a partir do status de
 * `mission_progress` de cada aluno (M23 — correção P1, achado no smoke
 * test de FASE 3/D6).
 *
 * O funil é cumulativo: um aluno "avaliado" também entregou e também
 * concluiu — cada estágio implica os anteriores, não é um estado à
 * parte. Extraído de `page.tsx` para ser testável sem montar o Server
 * Component.
 */

interface StudentStatusRow {
  status: string;
}

export interface ExecutiveTotals {
  activeStudents: number;
  deliveredStudents: number;
  completedStudents: number;
  reviewedStudents: number;
  /**
   * Concluíram (produção entregue + reflexão registrada) e ainda não foram
   * avaliados — o que de fato aguarda o professor. "avaliado" sai daqui;
   * quem só entregou, ou reabriu a produção, ainda não concluiu.
   */
  pendingReviewStudents: number;
}

export function computeExecutiveTotals(
  studentRows: StudentStatusRow[],
): ExecutiveTotals {
  const activeStudents = studentRows.filter(
    (item) => item.status !== "nao_acessou",
  ).length;
  const deliveredStudents = studentRows.filter((item) =>
    ["entregue", "reflexao", "concluiu", "avaliado"].includes(item.status),
  ).length;
  const completedStudents = studentRows.filter((item) =>
    ["concluiu", "avaliado"].includes(item.status),
  ).length;
  const reviewedStudents = studentRows.filter(
    (item) => item.status === "avaliado",
  ).length;
  const pendingReviewStudents = studentRows.filter(
    (item) => item.status === "concluiu",
  ).length;

  return {
    activeStudents,
    deliveredStudents,
    completedStudents,
    reviewedStudents,
    pendingReviewStudents,
  };
}

/** Texto do item de atenção com concordância: "1 entrega aguarda", "N entregas aguardam". */
export function pendingReviewsLabel(count: number): string {
  return count === 1
    ? "1 entrega aguarda avaliação"
    : `${count} entregas aguardam avaliação`;
}
