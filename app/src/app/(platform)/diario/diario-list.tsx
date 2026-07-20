"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";

import {
  isReflectionRecorded,
  listAllStudentWork,
  type StudentWork,
  type StudentWorkScope,
} from "@/modules/classroom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Referência mínima de Missão passada pelo servidor. */
export interface MissionRef {
  id: string;
  number: number;
  title: string;
}

/**
 * Fonte das reflexões: no modo REAL (M22), o servidor já leu do banco
 * (fonte de verdade) e entrega prontas; no modo demonstração, seguem
 * vindo do dispositivo (localStorage, `modules/classroom`).
 */
export type DiarioSource =
  | { kind: "real"; entries: { work: StudentWork; mission: MissionRef | undefined }[] }
  | { kind: "demo"; scope: StudentWorkScope | null };

/**
 * Lista as reflexões do aluno, mais recentes primeiro.
 */
export function DiarioList({
  missions,
  source,
}: {
  missions: MissionRef[];
  source: DiarioSource;
}) {
  const [entries, setEntries] = React.useState<
    { work: StudentWork; mission: MissionRef | undefined }[] | null
  >(source.kind === "real" ? source.entries : null);

  React.useEffect(() => {
    if (source.kind === "real") {
      setEntries(source.entries);
      return;
    }
    const byId = new Map(missions.map((m) => [m.id, m]));
    const recorded = (source.scope ? listAllStudentWork(source.scope) : [])
      .filter(isReflectionRecorded)
      .sort((a, b) =>
        (b.reflectionRecordedAt ?? "").localeCompare(a.reflectionRecordedAt ?? ""),
      )
      .map((work) => ({ work, mission: byId.get(work.missionId) }));
    setEntries(recorded);
  }, [missions, source]);

  if (entries === null) return <DiarioSkeleton />;

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-chart-3/15 text-chart-3">
            <NotebookPen className="size-5" />
          </span>
          <p className="text-sm font-medium">
            Seu Diário do Auditor ainda está em branco.
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Conclua uma missão e registre sua reflexão — ela aparecerá aqui,
            como parte da sua trajetória de investigador.
          </p>
          <Link
            href="/missoes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ver missões
            <ArrowRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map(({ work, mission }) => (
        <Card key={work.missionId}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {mission ? (
                  <Badge className="bg-primary/15 text-primary">
                    Missão {String(mission.number).padStart(2, "0")}
                  </Badge>
                ) : null}
                <span className="text-sm font-medium">
                  {mission?.title ?? work.missionId}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(work.reflectionRecordedAt)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-muted-foreground">
              &ldquo;{work.reflection}&rdquo;
            </p>
            {mission ? (
              <Link
                href={`/missoes/${mission.id}#reflexao`}
                className="inline-flex w-fit items-center gap-1 text-xs text-chart-3 transition-colors hover:text-foreground"
              >
                Abrir na missão
                <ArrowRight className="size-3" />
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Espelha o layout real da listagem enquanto as reflexões são lidas. */
function DiarioSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Carregando seu Diário do Auditor"
    >
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
