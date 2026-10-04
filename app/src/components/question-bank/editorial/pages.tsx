import { notFound } from "next/navigation";

import { requirePlatformDataMode } from "@/lib/platform-access";
import type { QuestionBankActor, QuestionVersionStatus } from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

import { ReviewItemView } from "./review-item";
import { ReviewQueue } from "./review-queue";

/**
 * Páginas da revisão editorial (D-052), montadas em `/professor/revisao`
 * (papel professor) e `/gestor/revisao` (papel administrador). Mesma tela,
 * mesmas regras — quem decide o que cada um pode é o banco.
 */

const STATUSES: QuestionVersionStatus[] = ["em_revisao", "devolvida", "rascunho", "aprovada"];

function Unavailable() {
  return (
    <p className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
      A revisão editorial está disponível apenas na instalação com banco real.
    </p>
  );
}

function Notice({ aviso }: { aviso?: string }) {
  if (!aviso) return null;
  const ok = /aprovada|devolvida ao autor/i.test(aviso);
  return (
    <p
      role={ok ? "status" : "alert"}
      className={
        ok
          ? "rounded-md border border-emerald-400/50 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
          : "rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
      }
    >
      {aviso}
    </p>
  );
}

export async function EditorialQueuePage({
  base,
  role,
  searchParams,
}: {
  base: string;
  role: QuestionBankActor["role"];
  searchParams: Promise<{ status?: string; aviso?: string }>;
}) {
  if (requirePlatformDataMode() !== "supabase") return <Unavailable />;
  const { actor, editorial } = await getQuestionBankContext();
  if (actor.role !== role) return null;
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.status) ?? "em_revisao";
  const { rows, counts } = await editorial.queue(status);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Banco de questões</p>
        <h1 className="text-2xl font-semibold">Revisão editorial</h1>
        <p className="text-sm text-muted-foreground">
          Nenhuma questão chega ao aluno sem aprovação de alguém diferente de quem a escreveu, com gabarito, resolução e
          direitos conferidos.
        </p>
      </header>
      <Notice aviso={params.aviso} />
      <ReviewQueue rows={rows} counts={counts} status={status} base={base} />
    </div>
  );
}

export async function EditorialItemPage({
  base,
  role,
  params,
  searchParams,
}: {
  base: string;
  role: QuestionBankActor["role"];
  params: Promise<{ versao: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  if (requirePlatformDataMode() !== "supabase") return <Unavailable />;
  const { actor, editorial } = await getQuestionBankContext();
  if (actor.role !== role) return null;
  const { versao } = await params;
  const { aviso } = await searchParams;
  const item = await editorial.item(decodeURIComponent(versao));
  if (!item) notFound();
  const skills = item.canEdit ? await editorial.skillOptions() : [];
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <Notice aviso={aviso} />
      <ReviewItemView item={item} base={base} skills={skills} />
    </div>
  );
}
