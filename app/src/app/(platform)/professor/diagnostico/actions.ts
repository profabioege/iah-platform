"use server";

/**
 * Diagnóstico da turma (D-054) — ações do professor. Escola, usuário e
 * permissões vêm da sessão; a RLS da 0022 só deixa o professor da turma
 * criar, publicar e encerrar.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthMode } from "@/lib/auth-flags";
import { getStudyContext } from "@/modules/study/infrastructure/request-context";

const page = (turma: string, extra = "") =>
  `/professor/diagnostico?turma=${encodeURIComponent(turma)}${extra}`;

async function teacher() {
  if (getAuthMode() !== "supabase") throw new Error("Disponível apenas na instalação com banco real.");
  const ctx = await getStudyContext();
  if (ctx.actor.role !== "professor") throw new Error("Apenas o professor da turma.");
  return ctx;
}

export async function createDiagnosticAction(formData: FormData): Promise<void> {
  const turma = String(formData.get("turma") ?? "");
  let target = "";
  try {
    const { diagnostic } = await teacher();
    const id = await diagnostic.create({
      classroomId: turma,
      title: String(formData.get("titulo") ?? ""),
      skillIds: formData.getAll("habilidades").map(String),
    });
    target = page(turma, `&diagnostico=${encodeURIComponent(id)}`);
  } catch (error) {
    target = page(turma, `&aviso=${encodeURIComponent(error instanceof Error ? error.message : "Não foi possível criar.")}`);
  }
  revalidatePath("/professor/diagnostico");
  redirect(target);
}

export async function setDiagnosticStatusAction(formData: FormData): Promise<void> {
  const turma = String(formData.get("turma") ?? "");
  const id = String(formData.get("diagnosticId") ?? "");
  let aviso = "";
  try {
    const { diagnostic } = await teacher();
    if (formData.get("op") === "publicar") await diagnostic.publish(id);
    else if (formData.get("op") === "encerrar") await diagnostic.close(id);
    else throw new Error("Ação desconhecida.");
  } catch (error) {
    aviso = `&aviso=${encodeURIComponent(error instanceof Error ? error.message : "Não foi possível alterar.")}`;
  }
  revalidatePath("/professor/diagnostico");
  revalidatePath("/dashboard/diagnostico");
  redirect(page(turma, `&diagnostico=${encodeURIComponent(id)}${aviso}`));
}
