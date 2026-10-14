import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlanBoard } from "@/components/study/plan-board";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import { addDays, dayLabel, todayIso } from "@/modules/study";
import { getStudyContext } from "@/modules/study/infrastructure/request-context";

import { addGuidanceAction, planItemAction } from "../../../../dashboard/plano/actions";

export const metadata: Metadata = {
  title: "Plano do aluno",
  description: "Plano semanal de um aluno, com ajustes e orientações do professor.",
};

export default async function TeacherStudentPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ turma?: string; aviso?: string }>;
}) {
  if (requirePlatformDataMode() !== "supabase") return null;
  const ctx = await getStudyContext();
  if (ctx.actor.role === "aluno") return null;
  const { planId } = await params;
  const { turma, aviso } = await searchParams;
  const view = await ctx.plan.byId(decodeURIComponent(planId)).catch(() => null);
  if (!view) notFound();
  const student = (await ctx.diagnostic.studentsOf(view.plan.classroomId)).find((x) => x.id === view.plan.studentId);
  const back = `/professor/diagnostico/plano/${encodeURIComponent(view.plan.id)}${turma ? `?turma=${encodeURIComponent(turma)}` : ""}`;
  const today = todayIso();
  const days = view.plan.availableDays.map((d) => addDays(view.plan.weekStart, d - 1)).filter((d) => d >= today);
  const isTeacher = ctx.actor.role === "professor";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href={`/professor/diagnostico${turma ? `?turma=${encodeURIComponent(turma)}` : ""}`}
          className="text-xs text-primary hover:underline"
        >
          ← Diagnóstico e planos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Plano semanal · {student?.name ?? "aluno"}</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes e orientações ficam registrados no histórico, com quem fez e quando.
        </p>
      </header>

      {aviso ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {aviso}
        </p>
      ) : null}

      <PlanBoard
        plan={view.plan}
        items={view.items}
        events={view.events}
        usedByDay={view.usedByDay}
        itemAction={planItemAction}
        returnTo={back}
        viewer="professor"
      />

      {isTeacher ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acrescentar orientação</CardTitle>
            <CardDescription>Entra no plano como “Orientação do professor”, dentro dos minutos do dia.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addGuidanceAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="planId" value={view.plan.id} />
              <input type="hidden" name="voltar" value={back} />
              <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
                Orientação
                <input name="titulo" required maxLength={200} className="h-9 rounded-md border border-input bg-background px-3 text-sm font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
                Por quê
                <input name="motivo" required maxLength={600} className="h-9 rounded-md border border-input bg-background px-3 text-sm font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Dia
                <select name="dia" className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal">
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {dayLabel(d)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Minutos
                <input
                  name="minutos"
                  type="number"
                  min={5}
                  max={120}
                  defaultValue={10}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm font-normal"
                />
              </label>
              <button type="submit" className={cn(buttonVariants(), "w-fit")}>
                Acrescentar
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
