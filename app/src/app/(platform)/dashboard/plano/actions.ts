"use server";

/**
 * Server Actions do plano semanal (D-054), usadas pelo aluno
 * (/dashboard/plano) e pelo professor (/professor/diagnostico/plano/…).
 * Aluno, turma e escola vêm do ator conferido no servidor; do formulário
 * chegam só a disponibilidade, a atividade e o dia. Quem pode mexer em
 * qual plano é decidido pela RLS da 0022; o orçamento de minutos, pelo
 * trigger da 0022.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthMode } from "@/lib/auth-flags";
import { todayIso } from "@/modules/study";
import { getStudyContext } from "@/modules/study/infrastructure/request-context";
import { getWorkspaceContext } from "@/modules/workspace";

async function context() {
  if (getAuthMode() !== "supabase") throw new Error("O plano está disponível apenas na instalação com banco real.");
  return getStudyContext();
}

/** Só volta para as duas telas do plano — nunca para endereço vindo de fora. */
function safeReturn(value: FormDataEntryValue | null): string {
  const path = String(value ?? "");
  return path.startsWith("/dashboard/plano") || path.startsWith("/professor/diagnostico") ? path : "/dashboard/plano";
}

function withNotice(path: string, aviso: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}aviso=${encodeURIComponent(aviso)}`;
}

export async function generatePlanAction(formData: FormData): Promise<void> {
  let aviso: string | null = null;
  try {
    const ctx = await context();
    if (ctx.actor.role !== "aluno") throw new Error("O plano é gerado pelo próprio aluno.");
    const workspace = await getWorkspaceContext();
    const classroomId = workspace?.classrooms[0]?.id;
    if (!classroomId) throw new Error("Você ainda não está matriculado em uma turma.");
    const days = formData.getAll("dias").map((d) => Number(d));
    const minutesPerDay = Number(formData.get("minutos"));
    const planContext = await ctx.planContextFor(classroomId);
    await ctx.plan.generate(classroomId, planContext, { days, minutesPerDay }, todayIso());
  } catch (error) {
    aviso = error instanceof Error ? error.message : "Não foi possível gerar o plano.";
  }
  if (aviso) redirect(withNotice("/dashboard/plano", aviso));
  revalidatePath("/dashboard/plano");
  redirect("/dashboard/plano");
}

export async function planItemAction(formData: FormData): Promise<void> {
  const back = safeReturn(formData.get("voltar"));
  let aviso: string | null = null;
  try {
    const { plan } = await context();
    const itemId = String(formData.get("itemId") ?? "");
    const op = String(formData.get("op") ?? "");
    const note = String(formData.get("nota") ?? "");
    if (op === "concluir") await plan.complete(itemId);
    else if (op === "reabrir") await plan.reopen(itemId);
    else if (op === "adiar") await plan.postpone(itemId, note);
    else if (op === "remover") await plan.remove(itemId, note);
    else if (op === "reagendar") await plan.reschedule(itemId, String(formData.get("dia") ?? ""), note, todayIso());
    else throw new Error("Ação desconhecida.");
  } catch (error) {
    aviso = error instanceof Error ? error.message : "Não foi possível alterar a atividade.";
  }
  if (aviso) redirect(withNotice(back, aviso));
  revalidatePath(back.split("?")[0]);
  redirect(back);
}

export async function addGuidanceAction(formData: FormData): Promise<void> {
  const back = safeReturn(formData.get("voltar"));
  let aviso: string | null = null;
  try {
    const { plan } = await context();
    await plan.addGuidance(String(formData.get("planId") ?? ""), {
      day: String(formData.get("dia") ?? ""),
      title: String(formData.get("titulo") ?? ""),
      minutes: Number(formData.get("minutos")),
      reason: String(formData.get("motivo") ?? ""),
    }, todayIso());
  } catch (error) {
    aviso = error instanceof Error ? error.message : "Não foi possível acrescentar a orientação.";
  }
  if (aviso) redirect(withNotice(back, aviso));
  revalidatePath(back.split("?")[0]);
  redirect(back);
}
