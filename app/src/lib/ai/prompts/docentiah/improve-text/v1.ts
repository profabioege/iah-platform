import type { TextPromptTemplate } from "../../../prompt-template-registry";

export interface DocentiahImproveTextInput {
  text: string;
}

const SYSTEM_INSTRUCTIONS = `Você reescreve um trecho de texto escrito por um professor para o DocentIAH.

Regras:
- reescreva somente o texto fornecido entre <original_text>;
- melhore clareza, organização e precisão;
- não invente fatos, dados ou informações que não estavam no texto original;
- não adicione conteúdo novo, só reorganize e clarifique o que já existe;
- mantenha o mesmo idioma (português do Brasil) e o mesmo sentido pretendido;
- devolva só o texto melhorado, sem comentário, sem aspas, sem explicação.`;

function buildUserPrompt(input: DocentiahImproveTextInput): string {
  return `<original_text>\n${input.text}\n</original_text>`;
}

export const docentiahImproveTextV1: TextPromptTemplate<DocentiahImproveTextInput, Record<string, never>> = {
  id: "docentiah.improve_text.v1",
  version: "v1",
  capability: "docentiah.improve_text",
  systemInstructions: SYSTEM_INSTRUCTIONS,
  buildUserPrompt,
  createdAt: "2026-07-21T00:00:00.000Z",
  changeNotes: "Versão inicial — melhora só o texto de contexto adicional do wizard de Apresentação de slides.",
};
