/**
 * Hipóteses da etapa Investigação guardadas DENTRO do texto da Produção
 * (D-057): uma linha `Item N — hipótese: …` por item do Dossiê, no topo do
 * Relatório, seguida do modelo da Missão (`Mission.productionTemplate`).
 *
 * Assim as hipóteses reaproveitam o rascunho da Produção — o mesmo
 * salvamento automático, a mesma fila e a mesma confirmação do servidor —
 * sem coluna nem tabela nova, e o professor as lê no próprio relatório.
 *
 * Funções puras. Regra de ouro: nenhuma delas apaga texto que o aluno
 * escreveu; só a linha da hipótese editada muda.
 */

export const HYPOTHESES_HEADER = "HIPÓTESES — primeira impressão, antes do Guia (uma frase por item)";

const HYPOTHESIS_LINE_RE = /^Item (\d+) — hipótese:[ \t]?(.*)$/;

/** Uma linha de hipótese; hipótese vazia fica só com o rótulo. */
export function hypothesisLine(item: number, value: string): string {
  return value.length > 0 ? `Item ${item} — hipótese: ${value}` : `Item ${item} — hipótese:`;
}

/** Texto inicial do Relatório: bloco de hipóteses + modelo da Missão. */
export function initialReport(count: number, template: string, hypotheses: string[] = []): string {
  const lines = Array.from({ length: count }, (_, i) => hypothesisLine(i + 1, hypotheses[i] ?? ""));
  return [HYPOTHESES_HEADER, ...lines, "", template].join("\n");
}

/** As `count` hipóteses que estão no texto (vazias quando ausentes). */
export function readHypotheses(text: string, count: number): string[] {
  const found: string[] = Array.from({ length: count }, () => "");
  const seen = new Set<number>();
  for (const line of text.split("\n")) {
    const match = line.match(HYPOTHESIS_LINE_RE);
    if (!match) continue;
    const item = Number(match[1]);
    if (item < 1 || item > count || seen.has(item)) continue;
    seen.add(item);
    found[item - 1] = match[2];
  }
  return found;
}

/**
 * Grava a hipótese do item no texto do Relatório:
 * - texto vazio → nasce o Relatório (hipóteses + modelo);
 * - linha do item existe → só ela muda;
 * - linha do item ausente → entra junto das outras hipóteses, em ordem;
 * - texto sem nenhuma hipótese (escrito antes) → o bloco entra no topo e
 *   todo o texto existente fica abaixo, intacto.
 * Quebras de linha viram espaço: a hipótese é uma frase, uma linha.
 */
export function setHypothesis(
  text: string,
  item: number,
  value: string,
  count: number,
  template: string,
): string {
  const oneLine = value.replace(/\r?\n/g, " ");
  if (text.trim().length === 0) {
    const hypotheses: string[] = [];
    hypotheses[item - 1] = oneLine;
    return initialReport(count, template, hypotheses);
  }

  const lines = text.split("\n");
  const numbers = lines.map((line) => {
    const match = line.match(HYPOTHESIS_LINE_RE);
    return match ? Number(match[1]) : null;
  });

  const own = numbers.indexOf(item);
  if (own !== -1) {
    lines[own] = hypothesisLine(item, oneLine);
    return lines.join("\n");
  }

  const after = numbers.findIndex((n) => n !== null && n > item);
  if (after !== -1) {
    lines.splice(after, 0, hypothesisLine(item, oneLine));
    return lines.join("\n");
  }
  const last = numbers.map((n) => n !== null).lastIndexOf(true);
  if (last !== -1) {
    lines.splice(last + 1, 0, hypothesisLine(item, oneLine));
    return lines.join("\n");
  }

  const hypotheses: string[] = [];
  hypotheses[item - 1] = oneLine;
  const block = [HYPOTHESES_HEADER, ...Array.from({ length: count }, (_, i) => hypothesisLine(i + 1, hypotheses[i] ?? ""))];
  return [...block, "", text].join("\n");
}

function normalized(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * O aluno já escreveu o relatório além das hipóteses? Sem modelo (Missões
 * sem `productionTemplate`), qualquer texto conta. Com modelo, o bloco de
 * hipóteses e o modelo intocado não contam.
 */
export function hasReportContent(text: string, template?: string): boolean {
  if (!template) return text.trim().length > 0;
  const rest = normalized(
    text
      .split("\n")
      .filter((line) => line.trim() !== HYPOTHESES_HEADER && !HYPOTHESIS_LINE_RE.test(line))
      .join("\n"),
  );
  return rest.length > 0 && rest !== normalized(template);
}
