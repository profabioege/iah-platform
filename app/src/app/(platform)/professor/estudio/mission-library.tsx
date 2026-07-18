"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";

import {
  createEmptyStudioMission,
  getMissionStudioRepository,
  STATUS_LABEL,
  type StudioMission,
  type StudioMissionStatus,
} from "@/modules/authoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<StudioMissionStatus, string> = {
  draft: "text-muted-foreground",
  review: "text-chart-4",
  published: "text-chart-2",
  archived: "text-muted-foreground/60",
};

/**
 * Biblioteca de Missões do Estúdio — lista tudo que existe neste
 * dispositivo (rotulado), com filtros e pesquisa. Cada linha é UMA
 * versão (v1, v2…) de uma linhagem, transparente por design.
 */
export function MissionLibrary({ author }: { author: string }) {
  const router = useRouter();
  const repository = getMissionStudioRepository();

  const [missions, setMissions] = React.useState<StudioMission[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [year, setYear] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [competency, setCompetency] = React.useState("");
  const [authorFilter, setAuthorFilter] = React.useState("");
  const [status, setStatus] = React.useState("");

  const reload = React.useCallback(() => {
    void repository.list().then(setMissions);
  }, [repository]);

  React.useEffect(reload, [reload]);

  async function handleCreate() {
    const mission = createEmptyStudioMission(author);
    await repository.save(mission);
    router.push(`/professor/estudio/${mission.id}`);
  }

  async function handleDuplicate(id: string) {
    const copy = await repository.duplicate(id);
    router.push(`/professor/estudio/${copy.id}`);
  }

  if (missions === null) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const options = {
    years: distinct(missions.map((m) => m.schoolYear)),
    subjects: distinct(missions.map((m) => m.subject)),
    competencies: distinct(missions.flatMap((m) => m.competencies)),
    authors: distinct(missions.map((m) => m.author)),
  };

  const visible = missions
    .filter((m) => !year || m.schoolYear === year)
    .filter((m) => !subject || m.subject === subject)
    .filter((m) => !competency || m.competencies.includes(competency))
    .filter((m) => !authorFilter || m.author === authorFilter)
    .filter((m) => !status || m.status === status)
    .filter((m) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return [m.title, m.description, m.guidingQuestion]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por título, descrição ou pergunta…"
          className="max-w-sm"
          aria-label="Pesquisar missões"
        />
        <FilterSelect label="Ano" value={year} onChange={setYear} options={options.years} />
        <FilterSelect label="Disciplina" value={subject} onChange={setSubject} options={options.subjects} />
        <FilterSelect label="Competência" value={competency} onChange={setCompetency} options={options.competencies} />
        <FilterSelect label="Autor" value={authorFilter} onChange={setAuthorFilter} options={options.authors} />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={Object.keys(STATUS_LABEL)}
          render={(s) => STATUS_LABEL[s as StudioMissionStatus]}
        />
        <Button size="sm" className="ml-auto" onClick={handleCreate}>
          <Plus className="size-4" />
          Nova Missão
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {missions.length === 0
                ? "Nenhuma missão criada ainda — comece pela sua primeira."
                : "Nenhuma missão corresponde aos filtros."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/professor/estudio/${m.id}`)}
                    className="min-w-40 flex-1 cursor-pointer text-left"
                  >
                    <p className="text-sm font-medium">
                      {m.title || "(sem título)"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[m.schoolYear, m.subject].filter(Boolean).join(" · ") ||
                        "Sem metadados"}{" "}
                      · {m.author}
                    </p>
                  </button>
                  <Badge variant="outline" className="text-muted-foreground">
                    v{m.version}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(STATUS_BADGE[m.status])}
                  >
                    {STATUS_LABEL[m.status]}
                  </Badge>
                  <span className="w-40 text-right text-xs text-muted-foreground">
                    Revisada em {formatDate(m.updatedAt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Duplicar missão"
                    onClick={() => handleDuplicate(m.id)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Missões salvas neste dispositivo. A persistência em banco entra com o
        Supabase (ver docs/PERSISTENCE.md).
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  render,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  render?: (v: string) => string;
}) {
  if (options.length === 0) return null;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Filtrar por ${label.toLowerCase()}`}
      className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
    >
      <option value="">{label}: todos</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {render ? render(option) : option}
        </option>
      ))}
    </select>
  );
}

function distinct(values: string[]): string[] {
  return [...new Set(values.filter((v) => v.trim() !== ""))].sort();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}
