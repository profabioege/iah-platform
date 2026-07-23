import { z } from "zod";

import { EDUCATION_LEVELS } from "../slides/schema.ts";

/**
 * Contrato de entrada e saída da capacidade `docentiah.improve_context`
 * ("Melhorar com IA" no campo "Detalhes adicionais ou contexto") — única
 * fonte de verdade dos tipos, mesmo padrão de `prompts/docentiah/slides/schema.ts`.
 * Reutiliza `EDUCATION_LEVELS` das slides em vez de redeclarar o enum.
 */

export const docentiahImproveContextInputSchema = z.object({
  text: z.string().trim().min(10, "Escreva pelo menos algumas palavras antes de pedir para melhorar.").max(4000),
  language: z.literal("pt-BR").default("pt-BR"),
  teacherIntent: z.string().trim().max(300).optional(),
  subject: z.string().trim().max(120).optional(),
  educationLevel: z.enum(EDUCATION_LEVELS).optional(),
  grade: z.string().trim().max(60).optional(),
});

export type DocentiahImproveContextInput = z.infer<typeof docentiahImproveContextInputSchema>;

export const docentiahImproveContextOutputSchema = z.object({
  improvedText: z.string().trim().min(1, "O texto melhorado não pode vir vazio."),
  changesSummary: z.array(z.string().trim().min(1)).default([]),
  warnings: z.array(z.string().trim().min(1)).default([]),
});

export type DocentiahImproveContextOutput = z.infer<typeof docentiahImproveContextOutputSchema>;
