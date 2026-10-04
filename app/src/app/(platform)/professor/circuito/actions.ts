"use server";

/**
 * Server Actions do circuito adaptativo (professor). Escola, usuário e
 * turmas alcançáveis vêm do ator conferido no servidor; do formulário
 * chegam só escolhas — o banco recusa qualquer uma fora do alcance (0019).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthMode } from "@/lib/auth-flags";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

async function teacherCircuit() {
  if (getAuthMode() !== "supabase") {
    throw new Error("O circuito está disponível apenas na instalação com banco real.");
  }
  const { actor, circuit } = await getQuestionBankContext();
  if (actor.role !== "professor") throw new Error("Apenas o professor da turma conduz o circuito.");
  return circuit;
}

async function run(formData: FormData, action: (classroomId: string) => Promise<void>): Promise<void> {
  const classroomId = String(formData.get("classroomId") ?? "");
  const path = `/professor/circuito?turma=${encodeURIComponent(classroomId)}`;
  let aviso: string | null = null;
  try {
    await action(classroomId);
  } catch (error) {
    aviso = error instanceof Error ? error.message : "Não foi possível concluir a ação.";
  }
  // redirect() fora do try: ele interrompe a action lançando uma exceção própria do Next.
  if (aviso) redirect(`${path}&aviso=${encodeURIComponent(aviso)}`);
  revalidatePath("/professor/circuito");
  redirect(path);
}

export async function activateCircuitAction(formData: FormData): Promise<void> {
  const circuit = await teacherCircuit();
  await run(formData, (classroomId) => circuit.activate(classroomId));
}

export async function pauseCircuitAction(formData: FormData): Promise<void> {
  const circuit = await teacherCircuit();
  await run(formData, (classroomId) => circuit.pause(classroomId));
}

export async function unlockSkillAction(formData: FormData): Promise<void> {
  const circuit = await teacherCircuit();
  await run(formData, (classroomId) =>
    circuit.unlock(classroomId, String(formData.get("studentId") ?? ""), String(formData.get("skillId") ?? "")),
  );
}
