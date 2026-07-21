"use client";

import * as React from "react";
import Link from "next/link";
import { History, Rocket, Wand2 } from "lucide-react";

import { getLessonRepository } from "@/modules/lesson";
import { getMissionStudioRepository } from "@/modules/authoring";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DraftItem {
  id: string;
  kind: "aula" | "missao";
  title: string;
  updatedAt: string;
  href: string;
}

/**
 * "Continuar de onde parei" + "Rascunhos recentes" — lidos dos mesmos
 * repositórios locais que já alimentam `professor/aulas` e
 * `professor/estudio` (`lesson-list.tsx`/`mission-library.tsx`), nunca
 * dados inventados (D-016). Cliente porque a fonte hoje é o
 * `localStorage` deste dispositivo.
 */
export function ContinueSection() {
  const [items, setItems] = React.useState<DraftItem[] | null>(null);

  React.useEffect(() => {
    Promise.all([getLessonRepository().list(), getMissionStudioRepository().list()]).then(
      ([lessons, missions]) => {
        const drafts: DraftItem[] = [
          ...lessons.map((lesson) => ({
            id: lesson.id,
            kind: "aula" as const,
            title: lesson.topic || "Aula sem título",
            updatedAt: lesson.updatedAt,
            href: `/professor/aulas/${lesson.id}`,
          })),
          ...missions.map((mission) => ({
            id: mission.id,
            kind: "missao" as const,
            title: mission.title || "Missão sem título",
            updatedAt: mission.updatedAt,
            href: `/professor/estudio/${mission.id}`,
          })),
        ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setItems(drafts);
      },
    );
  }, []);

  const [latest, ...rest] = items ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" aria-hidden />
            Continuar de onde parei
          </CardTitle>
          <CardDescription>O último item que você editou.</CardDescription>
        </CardHeader>
        <CardContent>
          {items === null ? (
            <Skeleton className="h-14 w-full rounded-xl" />
          ) : latest ? (
            <DraftRow item={latest} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Você ainda não começou nada neste dispositivo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rascunhos recentes</CardTitle>
          <CardDescription>Aulas e Missões salvas neste dispositivo.</CardDescription>
        </CardHeader>
        <CardContent>
          {items === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : rest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum outro rascunho ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {rest.slice(0, 4).map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <DraftRow item={item} compact />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DraftRow({ item, compact = false }: { item: DraftItem; compact?: boolean }) {
  const Icon = item.kind === "aula" ? Wand2 : Rocket;
  return (
    <Link
      href={item.href}
      className={
        compact
          ? "flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-accent/50"
          : "flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/50"
      }
    >
      <Icon className={compact ? "size-3.5 shrink-0 text-muted-foreground" : "size-4 shrink-0 text-muted-foreground"} aria-hidden />
      <div className="flex min-w-0 flex-col">
        <span className={compact ? "truncate text-sm" : "truncate text-sm font-medium"}>
          {item.title}
        </span>
        {!compact ? (
          <span className="text-xs text-muted-foreground">
            {item.kind === "aula" ? "Aula" : "Missão"} ·{" "}
            {new Date(item.updatedAt).toLocaleDateString("pt-BR")}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
