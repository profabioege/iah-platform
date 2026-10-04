"use server";

/**
 * Server Actions da revisão editorial (D-052), usadas em `/professor/revisao`
 * e `/gestor/revisao`. Escola, usuário e papel vêm do ator conferido no
 * servidor; do formulário chegam só escolhas — e o banco recusa qualquer
 * uma fora do alcance (autor ≠ revisor, conferência, direitos, imutabilidade).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthMode } from "@/lib/auth-flags";
import type { EditorialDifficulty } from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

const BASES = ["/professor/revisao", "/gestor/revisao", "/gestor/fontes"] as const;

function basePath(formData: FormData): string {
  const base = String(formData.get("base") ?? "");
  return (BASES as readonly string[]).includes(base) ? base : "/professor/revisao";
}

async function editorial() {
  if (getAuthMode() !== "supabase") throw new Error("A revisão está disponível apenas na instalação com banco real.");
  const { editorial, service } = await getQuestionBankContext();
  return { editorial, service };
}

async function run(target: string, action: () => Promise<string | void>): Promise<void> {
  let aviso: string | null = null;
  let next: string | void = undefined;
  try {
    next = await action();
  } catch (error) {
    aviso = error instanceof Error ? error.message : "Não foi possível concluir a ação.";
  }
  // redirect() fora do try: ele interrompe a action lançando uma exceção própria do Next.
  const separator = target.includes("?") ? "&" : "?";
  if (aviso) redirect(`${target}${separator}aviso=${encodeURIComponent(aviso)}`);
  revalidatePath(target.split("?")[0]);
  redirect(typeof next === "string" ? next : target);
}

export async function decideAction(formData: FormData): Promise<void> {
  const { editorial: ed } = await editorial();
  const base = basePath(formData);
  const versionId = String(formData.get("versionId") ?? "");
  const decision = formData.get("decision") === "aprovada" ? "aprovada" : "devolvida";
  const checklist = {
    gabarito: formData.get("gabarito") === "on",
    habilidade: formData.get("habilidade") === "on",
    direitos: formData.get("direitos") === "on",
    linguagem: formData.get("linguagem") === "on",
  };
  const comment = String(formData.get("comment") ?? "").trim() || null;
  await run(`${base}/${encodeURIComponent(versionId)}`, async () => {
    await ed.decide(versionId, decision, checklist, comment);
    return `${base}?status=em_revisao&aviso=${encodeURIComponent(decision === "aprovada" ? "Versão aprovada." : "Versão devolvida ao autor.")}`;
  });
}

export async function suggestionAction(formData: FormData): Promise<void> {
  const { service } = await editorial();
  const base = basePath(formData);
  const versionId = String(formData.get("versionId") ?? "");
  const decision = formData.get("decision") === "confirmada" ? "confirmada" : "rejeitada";
  await run(`${base}/${encodeURIComponent(versionId)}`, () =>
    service.decideSuggestion(String(formData.get("suggestionId") ?? ""), decision),
  );
}

export async function saveVersionAction(formData: FormData): Promise<void> {
  const { editorial: ed } = await editorial();
  const base = basePath(formData);
  const versionId = String(formData.get("versionId") ?? "");
  const letters = ["A", "B", "C", "D", "E"];
  const options = letters
    .map((key) => ({ key, text: String(formData.get(`option:${key}`) ?? "").trim() }))
    .filter((o) => o.text);
  const optionFeedback = Object.fromEntries(
    letters.map((k) => [k, String(formData.get(`feedback:${k}`) ?? "").trim()]).filter(([, v]) => v),
  );
  const difficulty = String(formData.get("difficulty") ?? "");
  await run(`${base}/${encodeURIComponent(versionId)}`, async () => {
    const id = await ed.saveNewVersion(versionId, {
      stem: String(formData.get("stem") ?? ""),
      options,
      answerKey: String(formData.get("answerKey") ?? ""),
      resolution: String(formData.get("resolution") ?? ""),
      optionFeedback,
      editorialDifficulty: ["facil", "media", "dificil"].includes(difficulty) ? (difficulty as EditorialDifficulty) : null,
      skillId: String(formData.get("skillId") ?? ""),
      submit: formData.get("intent") === "enviar",
    });
    return `${base}/${encodeURIComponent(id)}`;
  });
}

export async function submitVersionAction(formData: FormData): Promise<void> {
  const { editorial: ed } = await editorial();
  const base = basePath(formData);
  const versionId = String(formData.get("versionId") ?? "");
  await run(`${base}/${encodeURIComponent(versionId)}`, () => ed.submit(versionId));
}

export async function verifySourceAction(formData: FormData): Promise<void> {
  const { editorial: ed } = await editorial();
  const evidence = String(formData.get("evidence") ?? "").trim() || null;
  await run("/gestor/fontes", () => ed.verifySource(String(formData.get("sourceId") ?? ""), evidence));
}

