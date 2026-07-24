import { VISUAL_THEME_LIST, type VisualTheme } from "../apresentacao-slides/themes.ts";

/**
 * As 3 paletas básicas do Planejador Conversacional — não são temas
 * novos, são rótulos curados sobre 3 dos 6 temas reais já existentes
 * (`themes.ts`), reaproveitando o gerador de slides sem tocar no
 * schema/Zod (`VISUAL_THEMES`) nem no fluxo do wizard atual. "Outros
 * temas" revela os 6 originais, com os nomes/descrições de sempre.
 */
export interface BasicPalette {
  id: VisualTheme["id"];
  label: string;
  description: string;
}

export const BASIC_PALETTES: BasicPalette[] = [
  { id: "essencial", label: "IAH Claro", description: "Fundo claro, contraste alto, visual limpo." },
  { id: "investigativo", label: "IAH Escuro", description: "Tom mais denso, adequado para projeção em sala escura." },
  { id: "humanidades_tecnologia", label: "IAH Institucional", description: "Identidade visual do IAH — tecnologia e educação em equilíbrio." },
];

export function otherThemes(): VisualTheme[] {
  const basicIds = new Set(BASIC_PALETTES.map((p) => p.id));
  return VISUAL_THEME_LIST.filter((theme) => !basicIds.has(theme.id));
}
