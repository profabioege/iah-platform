"use server";

/**
 * Server Action do circuito adaptativo (aluno): pedir a rodada. Quem
 * escolhe as questões é o banco (`iah_circuit_next_round`, 0019); daqui
 * não sai nenhuma escolha de questão nem de habilidade.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthMode } from "@/lib/auth-flags";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

export async function startRoundAction(): Promise<void> {
  if (getAuthMode() !== "supabase") {
    throw new Error("O circuito está disponível apenas na instalação com banco real.");
  }
  const { actor, circuit } = await getQuestionBankContext();
  if (actor.role !== "aluno") throw new Error("Apenas alunos fazem o circuito.");
  let listId: string | null = null;
  let aviso: string | null = null;
  try {
    listId = await circuit.startRound();
  } catch (error) {
    aviso = error instanceof Error ? error.message : "Não foi possível montar a rodada.";
  }
  if (aviso || !listId) redirect(`/dashboard/circuito?aviso=${encodeURIComponent(aviso ?? "")}`);
  revalidatePath("/dashboard/circuito");
  redirect(`/dashboard/listas/${encodeURIComponent(listId)}`);
}
