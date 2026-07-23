import type { PromptTemplate } from "../../../prompt-template-registry";
import { docentiahImproveContextOutputSchema, type DocentiahImproveContextInput, type DocentiahImproveContextOutput } from "./schema.ts";
import { EDUCATION_LEVEL_LABEL } from "../slides/schema.ts";

const SYSTEM_INSTRUCTIONS = `Você reescreve um trecho de texto escrito por um professor para o DocentIAH.

Reescreva somente o texto fornecido, melhorando clareza e organização. Preserve intenção, fatos e vocabulário pedagógico. Não acrescente informações não presentes. Responda no schema JSON solicitado.

Regras adicionais:
- corrija ambiguidades linguísticas sem mudar o sentido pretendido pelo professor;
- não invente fatos, dados, referências ou exemplos que não estavam no texto original;
- não transforme o texto num plano de aula, avaliação ou lista de slides — só melhore o texto que já existe;
- não substitua a autoria do professor: o texto deve continuar soando como algo que ele escreveria;
- mantenha o mesmo idioma (português do Brasil);
- "changesSummary" deve listar, em poucas frases curtas, o que mudou (ex.: "Reorganizei a ordem das ideias", "Corrigi concordância verbal") — nunca repita o texto inteiro ali;
- "warnings" só deve conter avisos genuínos (ex.: "O texto original tinha um trecho ambíguo que precisei interpretar") — normalmente vazio;
- responda só com um JSON válido que respeite o schema pedido, sem nenhum texto fora do JSON.`;

function buildUserPrompt(input: DocentiahImproveContextInput): string {
  const contextLines: string[] = [];
  if (input.subject) contextLines.push(`Disciplina: ${input.subject}`);
  if (input.educationLevel) contextLines.push(`Etapa: ${EDUCATION_LEVEL_LABEL[input.educationLevel]}`);
  if (input.grade) contextLines.push(`Ano/série: ${input.grade}`);
  if (input.teacherIntent) contextLines.push(`Intenção do professor ao escrever: ${input.teacherIntent}`);

  const context = contextLines.length > 0 ? `<teacher_context>\n${contextLines.join("\n")}\n</teacher_context>\n\n` : "";
  return `${context}<original_text>\n${input.text}\n</original_text>`;
}

export const docentiahImproveContextV1: PromptTemplate<
  DocentiahImproveContextInput,
  Record<string, never>,
  DocentiahImproveContextOutput
> = {
  id: "docentiah.improve_context.v1",
  version: "v1",
  capability: "docentiah.improve_context",
  systemInstructions: SYSTEM_INSTRUCTIONS,
  buildUserPrompt,
  outputSchema: docentiahImproveContextOutputSchema,
  createdAt: "2026-07-23T00:00:00.000Z",
  changeNotes:
    "Evolui docentiah.improve_text (texto livre) para capability estruturada, com changesSummary/warnings — primeira capability roteada a um provedor real (DeepSeek).",
};
