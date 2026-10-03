"use server";

/**
 * Server Actions do banco de questões (professor). Escola, usuário e
 * turma alcançável vêm do ator conferido no servidor
 * (`getQuestionBankContext`); do formulário chegam só escolhas — e o
 * banco recusa qualquer escolha fora do alcance do ator (0017).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthMode } from "@/lib/auth-flags";
import type { PracticeListKind } from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

const KINDS: PracticeListKind[] = ["diagnostica", "periodica", "revisao"];

async function teacherService() {
  if (getAuthMode() !== "supabase") {
    throw new Error("O banco de questões está disponível apenas na instalação com banco real.");
  }
  const { actor, service } = await getQuestionBankContext();
  if (actor.role !== "professor") throw new Error("Apenas o professor da turma monta listas.");
  return service;
}

export async function createListAction(formData: FormData): Promise<void> {
  const service = await teacherService();
  const kind = String(formData.get("kind") ?? "diagnostica") as PracticeListKind;
  const classroomId = String(formData.get("classroomId") ?? "");
  let listId: string | null = null;
  let aviso: string | null = null;
  try {
    listId = await service.createList({
      classroomId,
      componentId: String(formData.get("componentId") ?? ""),
      kind: KINDS.includes(kind) ? kind : "diagnostica",
      title: String(formData.get("title") ?? ""),
      instructions: String(formData.get("instructions") ?? ""),
      versionIds: formData.getAll("versionIds").map(String),
      publish: true,
    });
  } catch (error) {
    aviso = error instanceof Error ? error.message : "Não foi possível publicar a lista.";
  }
  // redirect() fora do try: ele interrompe a action lançando uma exceção própria do Next.
  if (aviso || !listId) {
    const skill = String(formData.get("skillId") ?? "");
    redirect(
      `/professor/banco-de-questoes?turma=${encodeURIComponent(classroomId)}` +
        `${skill ? `&habilidade=${encodeURIComponent(skill)}` : ""}&aviso=${encodeURIComponent(aviso ?? "")}`,
    );
  }
  revalidatePath("/professor/banco-de-questoes");
  revalidatePath("/dashboard/listas");
  redirect(`/professor/banco-de-questoes/listas/${encodeURIComponent(listId)}`);
}

export async function saveFeedbackAction(formData: FormData): Promise<void> {
  const service = await teacherService();
  const listId = String(formData.get("listId") ?? "");
  await service.saveFeedback(listId, String(formData.get("studentId") ?? ""), String(formData.get("comment") ?? ""));
  revalidatePath(`/professor/banco-de-questoes/listas/${encodeURIComponent(listId)}`);
}

export async function closeListAction(formData: FormData): Promise<void> {
  const service = await teacherService();
  const listId = String(formData.get("listId") ?? "");
  await service.closeList(listId);
  revalidatePath(`/professor/banco-de-questoes/listas/${encodeURIComponent(listId)}`);
  revalidatePath("/dashboard/listas");
}
