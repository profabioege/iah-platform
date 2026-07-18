"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Tag,
} from "lucide-react";

import type { CurriculumTheme, CurriculumUnit } from "@/modules/curriculum";
import { buildCurriculumTimeline, summarizeCurriculumTimeline } from "@/modules/curriculum";
import { getLessonRepository, type Lesson } from "@/modules/lesson";
import type { Mission } from "@/modules/library";
import type { KnowledgeDocument } from "@/modules/knowledge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
// Reaproveita o parser e o cartão de rubrica do Mission Flow — a
// Avaliação de um Tema é derivada das Missões que ele referencia, não
// duplicada (Sprint M14: "usar apenas a arquitetura existente").
import { parseMissionContent } from "@/app/(platform)/missoes/[id]/mission-flow/parse-mission-content";
import { RubricCard } from "@/app/(platform)/missoes/[id]/mission-flow/rubric-card";

/**
 * Navegação curricular: o professor visualiza o ano inteiro (Unidades),
 * seleciona qualquer Unidade (expande seus Temas), abre qualquer Lesson
 * ou Mission Flow, e vê a Timeline (aulas concluídas/pendentes,
 * competências desenvolvidas) — tudo derivado das Lessons já salvas
 * neste dispositivo.
 */
export function CurriculumExplorer({
  units,
  themesByUnit,
  missions,
  knowledgeDocuments,
}: {
  units: CurriculumUnit[];
  themesByUnit: Record<string, CurriculumTheme[]>;
  missions: Mission[];
  knowledgeDocuments: KnowledgeDocument[];
}) {
  const [lessons, setLessons] = React.useState<Lesson[] | null>(null);
  const [expandedUnits, setExpandedUnits] = React.useState<Set<string>>(
    () => new Set(units.length === 1 ? [units[0].id] : []),
  );
  const [expandedThemes, setExpandedThemes] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    getLessonRepository().list().then(setLessons);
  }, []);

  const allThemes = React.useMemo(() => Object.values(themesByUnit).flat(), [themesByUnit]);
  const timeline = React.useMemo(
    () => (lessons ? buildCurriculumTimeline(allThemes, lessons) : []),
    [allThemes, lessons],
  );
  const summary = React.useMemo(
    () => (lessons ? summarizeCurriculumTimeline(timeline, lessons) : null),
    [timeline, lessons],
  );

  function toggleUnit(id: string) {
    setExpandedUnits((current) => toggleSet(current, id));
  }
  function toggleTheme(id: string) {
    setExpandedThemes((current) => toggleSet(current, id));
  }

  if (lessons === null || summary === null) return <ExplorerSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <TimelineSummary summary={summary} />

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma Unidade cadastrada no Currículo ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {units.map((unit) => (
            <div key={unit.id} className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => toggleUnit(unit.id)}
                className="flex items-center gap-2 text-left"
              >
                {expandedUnits.has(unit.id) ? (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">{unit.label}</span>
                <Badge variant="outline" className="font-normal">
                  {(themesByUnit[unit.id] ?? []).length} tema
                  {(themesByUnit[unit.id] ?? []).length === 1 ? "" : "s"}
                </Badge>
              </button>

              {expandedUnits.has(unit.id) ? (
                <div className="flex flex-col gap-3 border-l border-border pl-5">
                  {(themesByUnit[unit.id] ?? []).map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      expanded={expandedThemes.has(theme.id)}
                      onToggle={() => toggleTheme(theme.id)}
                      lessons={lessons}
                      missions={missions}
                      knowledgeDocuments={knowledgeDocuments}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineSummary({
  summary,
}: {
  summary: ReturnType<typeof summarizeCurriculumTimeline>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Timeline do currículo
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-chart-2" />
            {summary.completedCount} aula{summary.completedCount === 1 ? "" : "s"} concluída
            {summary.completedCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Circle className="size-4" />
            {summary.pendingCount} pendente{summary.pendingCount === 1 ? "" : "s"}
          </span>
        </div>
        {summary.developedCompetencies.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Competências desenvolvidas</p>
            <div className="flex flex-wrap gap-2">
              {summary.developedCompetencies.map((c) => (
                <Badge key={c} variant="outline" className="font-normal">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ThemeCard({
  theme,
  expanded,
  onToggle,
  lessons,
  missions,
  knowledgeDocuments,
}: {
  theme: CurriculumTheme;
  expanded: boolean;
  onToggle: () => void;
  lessons: Lesson[];
  missions: Mission[];
  knowledgeDocuments: KnowledgeDocument[];
}) {
  const themeLessons = lessons.filter((l) => theme.lessonIds.includes(l.id));
  const themeMissions = missions.filter((m) => theme.missionIds.includes(m.id));
  const themeDocuments = knowledgeDocuments.filter((d) =>
    theme.knowledgeDocumentIds.includes(d.id),
  );
  const criteria = themeMissions[0]
    ? parseMissionContent(themeMissions[0].didacticMaterials).auditCriteria
    : [];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold">{theme.label}</span>
        </button>

        {expanded ? (
          <div className="flex flex-col gap-4 pl-6">
            {theme.objectives.length > 0 ? (
              <Section icon={Tag} label="Objetivos">
                <ul className="flex flex-col gap-1">
                  {theme.objectives.map((o) => (
                    <li key={o} className="text-sm text-foreground/90">{o}</li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {(theme.bnccCompetencies.length > 0 || theme.bnccComputacaoCompetencies.length > 0) ? (
              <Section icon={Tag} label="Competências BNCC">
                <div className="flex flex-wrap gap-2">
                  {theme.bnccCompetencies.map((c) => (
                    <Badge key={c} variant="outline" className="font-normal">{c}</Badge>
                  ))}
                  {theme.bnccComputacaoCompetencies.map((c) => (
                    <Badge key={c} variant="outline" className="font-normal">{c}</Badge>
                  ))}
                </div>
              </Section>
            ) : null}

            {theme.estimatedMinutes ? (
              <Section icon={Clock} label="Tempo previsto">
                <p className="text-sm text-foreground/90">{theme.estimatedMinutes} minutos</p>
              </Section>
            ) : null}

            <Section icon={BookOpen} label={`Mission Flows (${themeMissions.length})`}>
              {themeMissions.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {themeMissions.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/missoes/${m.id}`}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {m.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma Mission Flow vinculada.</p>
              )}
            </Section>

            <Section icon={FileText} label={`Lessons (${themeLessons.length})`}>
              {themeLessons.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {themeLessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center gap-2">
                      <Link
                        href={`/professor/aulas/${lesson.id}`}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {lesson.topic || "Aula sem tema definido"}
                      </Link>
                      <Badge
                        className={cn(
                          "font-normal",
                          lesson.savedAt ? "bg-chart-2/15 text-chart-2" : undefined,
                        )}
                        variant={lesson.savedAt ? undefined : "outline"}
                      >
                        {lesson.savedAt ? "Concluída" : "Rascunho"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma Lesson deste Tema ainda —{" "}
                  <Link href="/professor/aulas" className="font-medium text-primary underline-offset-4 hover:underline">
                    monte uma no Lesson Composer
                  </Link>
                  .
                </p>
              )}
            </Section>

            <Section icon={FileText} label={`Recursos (${themeDocuments.length})`}>
              {themeDocuments.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {themeDocuments.map((d) => (
                    <li key={d.id} className="text-sm text-foreground/90">{d.title}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum recurso vinculado.</p>
              )}
            </Section>

            <Section icon={FileText} label="Avaliação">
              {criteria.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {criteria.map((entry, i) => (
                    <RubricCard key={entry.label} entry={entry} index={i} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem Mission Flow vinculada, não há critérios a herdar.
                </p>
              )}
            </Section>

            <Section icon={FileText} label="Portfólio">
              <p className="text-sm text-muted-foreground">
                Ainda conceitual (D-028) — nenhuma produção é arquivada num Portfólio nesta Sprint.
              </p>
            </Section>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof BookOpen;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      {children}
    </div>
  );
}

function toggleSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function ExplorerSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando o currículo">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
