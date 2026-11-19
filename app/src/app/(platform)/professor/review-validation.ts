/**
 * Validação do nível por eixo na avaliação do professor (D-053).
 *
 * A regra não muda: sem nível nos dois eixos, nada é enviado. O que esta
 * função acrescenta é dizer QUAL eixo falta, para a tela apontar o quadro
 * certo em vez de uma frase genérica que passava despercebida (relato do
 * piloto, 19/11/2026: "o botão Confirmar avaliação não conclui").
 */

export type AxisKey = "discipline" | "ai";

const AXIS_LABEL: Record<AxisKey, string> = {
  discipline: "Disciplina",
  ai: "Competência em IA",
};

/** Eixos sem nível escolhido, na ordem em que aparecem na tela. */
export function missingAxisLevels(
  disciplineLevel: string | null | undefined,
  aiLevel: string | null | undefined,
): AxisKey[] {
  const missing: AxisKey[] = [];
  if (!disciplineLevel) missing.push("discipline");
  if (!aiLevel) missing.push("ai");
  return missing;
}

/** Mensagem de erro que nomeia o(s) eixo(s) sem nível; vazia se nada falta. */
export function missingLevelsMessage(missing: readonly AxisKey[]): string {
  if (missing.length === 0) return "";
  const nomes = missing.map((axis) => AXIS_LABEL[axis]).join(" e em ");
  return `Escolha o nível observado em ${nomes} (Não evidenciado, Em desenvolvimento, Atingido ou Superado) antes de confirmar.`;
}
