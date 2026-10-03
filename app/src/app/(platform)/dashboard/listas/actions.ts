"use server";

/**
 * Server Actions das listas (aluno). O aluno, a turma e a escola vêm do
 * ator conferido no servidor; do formulário chegam só a lista e as
 * alternativas marcadas. Acerto nunca vem do cliente: o banco calcula na
 * entrega (0017).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthMode } from "@/lib/auth-flags";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

async function studentService() {
  if (getAuthMode() !== "supabase") {
    throw new Error("As listas estão disponíveis apenas na instalação com banco real.");
  }
  const { actor, service } = await getQuestionBankContext();
  if (actor.role !== "aluno") throw new Error("Apenas alunos respondem listas.");
  return service;
}

/** Grava as alternativas marcadas (campos `item:<id>`) e, se pedido, entrega. */
export async function saveAnswersAction(formData: FormData): Promise<void> {
  const service = await studentService();
  const listId = String(formData.get("listId") ?? "");
  for (const [field, value] of formData.entries()) {
    if (field.startsWith("item:") && typeof value === "string" && value) {
      await service.answer(listId, field.slice("item:".length), value);
    }
  }
  const path = `/dashboard/listas/${encodeURIComponent(listId)}`;
  if (formData.get("intent") === "entregar") {
    try {
      await service.submit(listId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível entregar.";
      redirect(`${path}?aviso=${encodeURIComponent(message)}`);
    }
  }
  revalidatePath(path);
  revalidatePath("/dashboard/listas");
  redirect(path);
}
