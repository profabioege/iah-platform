"use client";

import * as React from "react";
import { ChevronDown, NotebookPen, PenLine } from "lucide-react";

import {
  STUDENT_MISSION_STATUSES,
  type StudentMissionSnapshot,
  type StudentMissionStatus,
} from "@/modules/classroom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/** Rótulo e marcador visual de cada estado (conforme especificação). */
const STATUS_META: Record<
  StudentMissionStatus,
  { emoji: string; label: string }
> = {
  nao_acessou: { emoji: "○", label: "Não acessou" },
  visualizou: { emoji: "👁", label: "Visualizou" },
  investigando: { emoji: "🔎", label: "Investigando" },
  produzindo: { emoji: "✍", label: "Produzindo" },
  rascunho: { emoji: "💾", label: "Rascunho" },
  entregue: { emoji: "📤", label: "Entregue" },
  reflexao: { emoji: "💭", label: "Reflexão" },
  concluiu: { emoji: "✅", label: "Concluiu" },
};

type Filter = StudentMissionStatus | "todos";

/**
 * Painel de acompanhamento da turma em uma Missão.
 * Recebe as fotografias dos alunos prontas (via contrato ClassMonitorReader);
 * aqui ficam apenas contadores, filtro e a abertura de produção/reflexão.
 */
export function ClassPanel({
  students,
}: {
  students: StudentMissionSnapshot[];
}) {
  const [filter, setFilter] = React.useState<Filter>("todos");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const map = new Map<StudentMissionStatus, number>();
    for (const s of students) map.set(s.status, (map.get(s.status) ?? 0) + 1);
    return map;
  }, [students]);

  const visible =
    filter === "todos" ? students : students.filter((s) => s.status === filter);

  return (
    <div className="flex flex-col gap-4">
      {/* Contadores por status — clicáveis, funcionam como filtro */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
        <FilterChip
          active={filter === "todos"}
          onClick={() => setFilter("todos")}
          label={`Todos · ${students.length}`}
        />
        {STUDENT_MISSION_STATUSES.map((status) => (
          <FilterChip
            key={status}
            active={filter === status}
            onClick={() => setFilter(filter === status ? "todos" : status)}
            label={`${STATUS_META[status].emoji} ${STATUS_META[status].label} · ${counts.get(status) ?? 0}`}
          />
        ))}
      </div>

      {/* Lista de alunos */}
      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum aluno neste status.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((s) => {
                const meta = STATUS_META[s.status];
                const hasContent = Boolean(s.production || s.reflection);
                const open = openId === s.studentId;
                return (
                  <li key={s.studentId}>
                    <button
                      type="button"
                      onClick={() =>
                        hasContent && setOpenId(open ? null : s.studentId)
                      }
                      disabled={!hasContent}
                      aria-expanded={hasContent ? open : undefined}
                      className={cn(
                        "flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors",
                        hasContent
                          ? "cursor-pointer hover:bg-muted/50"
                          : "cursor-default",
                      )}
                    >
                      <span className="w-7 text-center text-base" aria-hidden="true">
                        {meta.emoji}
                      </span>
                      <span className="min-w-40 flex-1 truncate text-sm font-medium">
                        {s.studentName}
                      </span>
                      <Badge variant="outline" className="text-muted-foreground">
                        {meta.label}
                      </Badge>
                      <span className="w-40 text-right text-xs text-muted-foreground">
                        {s.lastAccessAt
                          ? `Último acesso ${formatDateTime(s.lastAccessAt)}`
                          : "Nunca acessou"}
                      </span>
                      {hasContent ? (
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      ) : (
                        <span className="size-4" aria-hidden="true" />
                      )}
                    </button>

                    {open ? (
                      <div className="flex flex-col gap-4 border-t border-border/60 bg-muted/20 px-6 py-4 md:px-14">
                        {s.production ? (
                          <div>
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-chart-2">
                              <PenLine className="size-3.5" />
                              Produção do Aluno
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                              {s.production}
                            </p>
                          </div>
                        ) : null}
                        {s.reflection ? (
                          <div>
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-chart-3">
                              <NotebookPen className="size-3.5" />
                              Reflexão no Diário do Auditor
                            </p>
                            <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-foreground/90">
                              &ldquo;{s.reflection}&rdquo;
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
