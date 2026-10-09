import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, Bot, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import {
  AI_COMPETENCIES_REFERENCE_LABEL,
  AXIS_LEVELS,
  localMissionRepository,
  resolveAiCompetencies,
} from "@/modules/library";
import { bnccSkillIdOf, type LevelCounts, type TeacherTrailMission } from "@/modules/pathways";
import { loadTeacherAiTrail } from "@/modules/pathways/infrastructure/load-pathways";

import { AssignMissionButton } from "./assign-button";

export const metadata: Metadata = {
  title: "Trilha IA & Humanidades",
  description: "Missões de IA ligadas às Ciências Humanas, com os dois eixos acompanhados separadamente.",
};

/**
 * Painel docente da Trilha IA & Humanidades (D-053). Para cada turma:
 * atribuir a Missão de IA, acompanhar entregas e ler os DOIS eixos
 * separados — disciplina e competência em IA — e chegar aos exercícios
 * disciplinares ligados ao mesmo tema.
 */
export default async function TeacherAiTrailPage() {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">
        O painel da trilha de IA está disponível apenas na instalação com banco real.
      </p>
    );
  }
  const data = await loadTeacherAiTrail();
  if (!data) return null;
  const missions = (await localMissionRepository.list()).filter((m) => m.axes);
  const byId = new Map(missions.map((m) => [m.id, m]));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-chart-2">Ensino de IA</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Trilha IA &amp; Humanidades</h1>
        <p className="text-sm text-muted-foreground">
          Cada missão tem dois objetivos avaliados separadamente: o da disciplina e a competência em IA. Uma
          resposta correta de História não comprova que o aluno verificou criticamente a IA.
        </p>
        <p className="text-[11px] text-muted-foreground">{AI_COMPETENCIES_REFERENCE_LABEL}.</p>
      </header>

      {data.listsUnavailable ? (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Exercícios ligados indisponíveis agora ({data.listsUnavailable}).
        </p>
      ) : null}

      {data.classrooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Você ainda não tem turmas vinculadas.</p>
      ) : null}

      {data.classrooms.map((classroom) => (
        <section key={classroom.id} aria-label={`Turma ${classroom.name}`} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{classroom.name}</h2>
          {classroom.missions.map((row) => {
            const mission = byId.get(row.id);
            if (!mission?.axes) return null;
            return (
              <Card key={row.id}>
                <CardContent className="flex flex-col gap-4 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">{mission.module}</p>
                      <p className="text-base font-semibold">
                        Missão {row.number} · {row.title}
                      </p>
                    </div>
                    {row.assigned ? (
                      <Badge className="bg-chart-2/15 text-chart-2">Atribuída</Badge>
                    ) : (
                      <AssignMissionButton classroomId={classroom.id} missionId={row.id} />
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5 rounded-lg border border-primary/30 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <BookOpenText className="size-4" />
                        Disciplina · {mission.axes.discipline.component} · {mission.axes.discipline.skill.code}
                      </p>
                      <p className="text-xs leading-relaxed text-foreground/80">{mission.axes.discipline.objective}</p>
                      {row.assigned ? <LevelBar label="Disciplina" counts={row.disciplineLevels} tone="primary" /> : null}
                    </div>
                    <div className="flex flex-col gap-1.5 rounded-lg border border-chart-2/40 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-chart-2">
                        <Bot className="size-4" />
                        Competência em IA
                      </p>
                      <ul className="flex flex-col gap-1">
                        {resolveAiCompetencies(mission.axes).map((c) => (
                          <li key={c.id} className="text-xs leading-relaxed text-foreground/80">
                            {c.label}
                          </li>
                        ))}
                      </ul>
                      {row.assigned ? <LevelBar label="IA" counts={row.aiLevels} tone="chart-2" /> : null}
                    </div>
                  </div>

                  {row.assigned ? <Totals row={row} classroomId={classroom.id} /> : null}

                  <LinkedExercises
                    row={row}
                    classroomId={classroom.id}
                    skillId={bnccSkillIdOf(mission.axes.discipline.skill.code)}
                  />
                </CardContent>
              </Card>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function Totals({ row, classroomId }: { row: TeacherTrailMission; classroomId: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Alunos" value={row.students} />
        <Stat label="Iniciaram" value={row.started} />
        <Stat label="Entregaram" value={row.delivered} />
        <Stat label="Avaliados nos 2 eixos" value={row.reviewed} />
      </dl>
      {row.disciplineWithoutAi > 0 || row.aiWithoutDiscipline > 0 ? (
        <p className="rounded-lg bg-muted/40 p-2 text-xs text-foreground/80">
          {row.disciplineWithoutAi > 0
            ? `${row.disciplineWithoutAi} aluno(s) atingiram o objetivo da disciplina sem evidenciar a competência em IA. `
            : ""}
          {row.aiWithoutDiscipline > 0
            ? `${row.aiWithoutDiscipline} aluno(s) evidenciaram a competência em IA sem atingir o objetivo da disciplina.`
            : ""}
        </p>
      ) : null}
      <Link
        href={`/professor/turmas?turma=${encodeURIComponent(classroomId)}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
      >
        Abrir entregas e avaliar os dois eixos
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function LinkedExercises({
  row,
  classroomId,
  skillId,
}: {
  row: TeacherTrailMission;
  classroomId: string;
  skillId: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ListChecks className="size-4" />
        Exercícios disciplinares ligados ao tema ({row.discipline?.skillCode})
      </p>
      {row.linkedLists.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma lista desta habilidade na turma ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {row.linkedLists.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/professor/banco-de-questoes/listas/${encodeURIComponent(l.id)}`}
                className="font-medium hover:underline"
              >
                {l.title}
              </Link>
              <Badge variant="outline" className="font-normal">
                {l.status}
              </Badge>
              <span className="text-muted-foreground">{l.delivered} entrega(s)</span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/professor/banco-de-questoes?turma=${encodeURIComponent(classroomId)}&habilidade=${encodeURIComponent(skillId)}`}
        className="w-fit text-xs font-medium text-primary hover:underline"
      >
        Montar lista com questões revisadas desta habilidade →
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2">
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
    </div>
  );
}

/** Distribuição dos níveis de um eixo na turma (texto sempre visível; a barra só reforça). */
function LevelBar({ label, counts, tone }: { label: string; counts: LevelCounts; tone: "primary" | "chart-2" }) {
  const reviewed = AXIS_LEVELS.reduce((sum, l) => sum + counts[l.value], 0);
  const total = reviewed + counts.pendente;
  const opacity: Record<string, string> = {
    nao_evidenciado: "opacity-25",
    em_desenvolvimento: "opacity-50",
    atingido: "opacity-80",
    superado: "opacity-100",
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {AXIS_LEVELS.map((l) =>
          counts[l.value] > 0 ? (
            <div
              key={l.value}
              className={cn(tone === "primary" ? "bg-primary" : "bg-chart-2", opacity[l.value])}
              style={{ width: `${(counts[l.value] / Math.max(1, total)) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {label}:{" "}
        {AXIS_LEVELS.map((l) => `${l.label.toLowerCase()} ${counts[l.value]}`).join(" · ")} · pendente{" "}
        {counts.pendente}
      </p>
    </div>
  );
}
