import Link from "next/link";
import { ArrowRight, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  activityHref,
  addDays,
  dayLabel,
  PLAN_EVENT_LABEL,
  PLAN_ITEM_STATUS_LABEL,
  todayIso,
  type StudyPlan,
  type StudyPlanEvent,
  type StudyPlanItem,
} from "@/modules/study";

const ORIGIN_LABEL = { regra: "Proposta pela regra", aluno: "Incluída por você", professor: "Orientação do professor" } as const;
const KIND_LABEL = {
  diagnostico: "Diagnóstico",
  lista: "Lista",
  missao: "Missão de IA",
  revisao: "Revisão",
  circuito: "Prática nova",
  orientacao: "Orientação",
} as const;

/**
 * Quadro do plano semanal — o mesmo para aluno e professor (D-054).
 * Cada dia mostra minutos usados / disponíveis; cada atividade mostra o
 * motivo da recomendação e as ações (concluir, reagendar, adiar,
 * remover). Formulários HTML puros: funcionam sem JavaScript.
 */
export function PlanBoard({
  plan,
  items,
  events,
  usedByDay,
  itemAction,
  returnTo,
  viewer,
}: {
  plan: StudyPlan;
  items: StudyPlanItem[];
  events: StudyPlanEvent[];
  usedByDay: Record<string, number>;
  itemAction: (formData: FormData) => Promise<void>;
  returnTo: string;
  viewer: "aluno" | "professor";
}) {
  const days = plan.availableDays.map((d) => addDays(plan.weekStart, d - 1));
  // Reagendar só para hoje em diante.
  const today = todayIso();
  const futureDays = days.filter((d) => d >= today);
  const visible = items.filter((i) => i.status === "planejada" || i.status === "concluida");
  const postponed = items.filter((i) => i.status === "adiada");
  const total = days.length * plan.minutesPerDay;
  const used = Object.values(usedByDay).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Semana de {dayLabel(plan.weekStart)} · {plan.minutesPerDay} min por dia em {days.length} dia(s) ·{" "}
        {used} de {total} min ocupados · regra {plan.ruleVersion}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {days.map((day) => {
          const dayItems = visible.filter((i) => i.day === day);
          const dayUsed = usedByDay[day] ?? 0;
          return (
            <section key={day} aria-label={dayLabel(day)} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{dayLabel(day)}</h3>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {dayUsed}/{plan.minutesPerDay} min
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (dayUsed / plan.minutesPerDay) * 100)}%` }}
                />
              </div>
              {dayItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Livre.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {dayItems.map((item) => (
                    <PlanItemCard
                      key={item.id}
                      item={item}
                      days={futureDays}
                      itemAction={itemAction}
                      returnTo={returnTo}
                      viewer={viewer}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {postponed.length > 0 ? (
        <section aria-labelledby="adiadas" className="flex flex-col gap-2">
          <h3 id="adiadas" className="text-sm font-semibold">
            Adiadas (fora desta semana)
          </h3>
          <ul className="flex flex-col gap-2">
            {postponed.map((item) => (
              <PlanItemCard key={item.id} item={item} days={futureDays} itemAction={itemAction} returnTo={returnTo} viewer={viewer} />
            ))}
          </ul>
        </section>
      ) : null}

      <details className="rounded-xl border border-border bg-card p-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <History className="size-4" />
          Histórico de alterações ({events.length})
        </summary>
        <ol className="mt-2 flex flex-col gap-1 text-xs">
          {events.map((e) => {
            const item = items.find((i) => i.id === e.itemId);
            return (
              <li key={e.id} className="text-muted-foreground">
                <span className="tabular-nums">{new Date(e.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>{" "}
                · {e.actorRole === "professor" ? "Professor" : "Aluno"} · {PLAN_EVENT_LABEL[e.action]}
                {item ? ` · ${item.title}` : ""}
                {e.fromDay && e.toDay ? ` · ${dayLabel(e.fromDay)} → ${dayLabel(e.toDay)}` : ""}
                {e.note ? ` · ${e.note}` : ""}
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}

function PlanItemCard({
  item,
  days,
  itemAction,
  returnTo,
  viewer,
}: {
  item: StudyPlanItem;
  days: string[];
  itemAction: (formData: FormData) => Promise<void>;
  returnTo: string;
  viewer: "aluno" | "professor";
}) {
  const href = viewer === "aluno" ? activityHref(item) : null;
  const done = item.status === "concluida";
  return (
    <li className={cn("flex flex-col gap-2 rounded-lg border border-border p-3", done && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className={cn("text-sm font-medium", done && "line-through")}>{item.title}</p>
        <span className="text-[11px] tabular-nums text-muted-foreground">{item.minutes} min</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="font-normal">
          {KIND_LABEL[item.kind]}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          {PLAN_ITEM_STATUS_LABEL[item.status]}
        </Badge>
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {ORIGIN_LABEL[item.origin]}
        </Badge>
      </div>
      <p className="text-xs leading-relaxed text-foreground/80">
        <strong>Por quê:</strong> {item.reason}
        {item.rule && item.origin === "regra" ? ` (${item.rule})` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {href && !done ? (
          <Link href={href} className={cn(buttonVariants({ size: "sm" }), "gap-1")}>
            Fazer agora
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
        {item.status === "planejada" ? (
          <ItemForm itemAction={itemAction} itemId={item.id} op="concluir" returnTo={returnTo} label="Concluir" />
        ) : null}
        {item.status === "concluida" ? (
          <ItemForm itemAction={itemAction} itemId={item.id} op="reabrir" returnTo={returnTo} label="Reabrir" />
        ) : null}
        {item.status === "planejada" ? (
          <ItemForm itemAction={itemAction} itemId={item.id} op="adiar" returnTo={returnTo} label="Adiar" />
        ) : null}
        {item.status !== "concluida" && days.length > 0 ? (
          <form action={itemAction} className="flex items-center gap-1">
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="op" value="reagendar" />
            <input type="hidden" name="voltar" value={returnTo} />
            <label className="sr-only" htmlFor={`dia-${item.id}`}>
              Novo dia
            </label>
            <select
              id={`dia-${item.id}`}
              name="dia"
              defaultValue={days.includes(item.day) ? item.day : days[0]}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </select>
            <button type="submit" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Reagendar
            </button>
          </form>
        ) : null}
        {item.status !== "concluida" ? (
          <ItemForm itemAction={itemAction} itemId={item.id} op="remover" returnTo={returnTo} label="Remover" ghost />
        ) : null}
      </div>
    </li>
  );
}

function ItemForm({
  itemAction,
  itemId,
  op,
  returnTo,
  label,
  ghost = false,
}: {
  itemAction: (formData: FormData) => Promise<void>;
  itemId: string;
  op: string;
  returnTo: string;
  label: string;
  ghost?: boolean;
}) {
  return (
    <form action={itemAction}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="voltar" value={returnTo} />
      <button type="submit" className={cn(buttonVariants({ size: "sm", variant: ghost ? "ghost" : "outline" }))}>
        {label}
      </button>
    </form>
  );
}
