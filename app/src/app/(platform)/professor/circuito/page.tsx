import type { Metadata } from "next";
import Link from "next/link";

import { MasteryBadge } from "@/components/question-bank/mastery-badge";
import { ProvisionalCurriculumNotice } from "@/components/question-bank/provisional-curriculum-notice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import { DEFAULT_ROUND_SIZE, GRADE_LABEL, MASTERY_RULES } from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

import { activateCircuitAction, pauseCircuitAction, unlockSkillAction } from "./actions";

export const metadata: Metadata = {
  title: "Circuito adaptativo",
  description: "Reforço automático por habilidade; o avanço de cada aluno é decisão do professor.",
};

type SearchParams = Promise<{ turma?: string; aviso?: string }>;

const STATUS_LABEL = {
  sem_liberacao: "Sem habilidade liberada",
  praticando: "Praticando",
  pronto_para_avancar: "Pronto para avançar",
  concluiu_sequencia: "Concluiu a sequência",
} as const;

export default async function TeacherCircuitPage({ searchParams }: { searchParams: SearchParams }) {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-6xl text-sm text-muted-foreground">
        O circuito está disponível apenas na instalação com banco real.
      </p>
    );
  }
  const { actor, service, circuit } = await getQuestionBankContext();
  if (actor.role !== "professor") return null;

  const params = await searchParams;
  const classrooms = await service.classrooms();
  const classroom = classrooms.find((c) => c.id === params.turma) ?? classrooms[0] ?? null;
  if (!classroom) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <Header />
        <p className="mt-6 text-sm text-muted-foreground">Você ainda não tem turmas vinculadas.</p>
      </div>
    );
  }

  const panel = await circuit.panel(classroom.id);
  const { sequence, students, pool } = panel;
  const ready = students.filter((s) => s.position.status === "pronto_para_avancar");
  const provisional = sequence.some((e) => e.plan.status === "provisional");
  const lowPool = sequence.filter((e) => (pool[e.skill.id]?.total ?? 0) < DEFAULT_ROUND_SIZE * 2);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Header />
      {provisional ? <ProvisionalCurriculumNotice /> : null}
      {params.aviso ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {params.aviso}
        </p>
      ) : null}

      <nav aria-label="Turma" className="flex flex-wrap gap-2">
        {classrooms.map((c) => (
          <Link
            key={c.id}
            href={`?turma=${encodeURIComponent(c.id)}`}
            className={cn(buttonVariants({ variant: c.id === classroom.id ? "default" : "outline", size: "sm" }))}
            aria-current={c.id === classroom.id ? "page" : undefined}
          >
            {c.name}
            {c.gradeCode ? ` · ${GRADE_LABEL[c.gradeCode]}` : ""}
          </Link>
        ))}
      </nav>

      {/* Situação do circuito */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">
              {panel.circuit ? `Circuito de ${classroom.name}` : `Ligar o circuito em ${classroom.name}`}
            </CardTitle>
            {panel.circuit ? (
              <Badge variant={panel.circuit.status === "ativo" ? "default" : "secondary"}>
                {panel.circuit.status === "ativo" ? "Ativo" : "Pausado"}
              </Badge>
            ) : null}
          </div>
          <CardDescription>
            Rodadas de {DEFAULT_ROUND_SIZE} questões aprovadas (da escola e do Catálogo IAH, com vínculo oficial ou
            confirmado). Reforço na mesma habilidade é automático e nunca repete questão; avançar é com você.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {!panel.circuit || panel.circuit.status === "pausado" ? (
            <form action={activateCircuitAction}>
              <input type="hidden" name="classroomId" value={classroom.id} />
              <button type="submit" className={cn(buttonVariants())} disabled={sequence.length === 0}>
                {panel.circuit ? "Retomar circuito" : "Ligar circuito e liberar a 1ª habilidade"}
              </button>
            </form>
          ) : (
            <form action={pauseCircuitAction}>
              <input type="hidden" name="classroomId" value={classroom.id} />
              <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
                Pausar circuito
              </button>
            </form>
          )}
          {panel.circuit ? (
            <span className="text-sm text-muted-foreground">
              {ready.length} aluno(s) pronto(s) para avançar
            </span>
          ) : null}
        </CardContent>
      </Card>

      {/* Sequência e banco disponível */}
      <section aria-labelledby="sequencia" className="flex flex-col gap-2">
        <h2 id="sequencia" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sequência (ordem do planejamento) e questões disponíveis
        </h2>
        {sequence.length === 0 ? (
          <p className="text-sm text-muted-foreground">A turma não tem habilidades planejadas.</p>
        ) : (
          <ol className="grid gap-2 md:grid-cols-2">
            {sequence.map((e, i) => {
              const p = pool[e.skill.id] ?? { total: 0, catalog: 0 };
              const low = p.total < DEFAULT_ROUND_SIZE * 2;
              return (
                <li key={e.skill.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="font-mono font-semibold">{e.skill.code}</span>
                  <Badge variant="secondary">{e.component.name}</Badge>
                  <Badge variant="outline" className={low ? "border-amber-400 text-amber-800 dark:text-amber-200" : ""}>
                    {p.total} questão(ões){p.catalog ? ` · ${p.catalog} do Catálogo` : ""}
                  </Badge>
                </li>
              );
            })}
          </ol>
        )}
        {lowPool.length ? (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Com menos de {DEFAULT_ROUND_SIZE * 2} questões aprovadas, o reforço se esgota em uma ou duas rodadas
            ({lowPool.map((e) => e.skill.code).join(", ")}). Amplie o banco ou aprove itens do Catálogo.
          </p>
        ) : null}
      </section>

      {/* Turma × habilidade */}
      {panel.circuit ? (
        <section aria-labelledby="turma" className="flex flex-col gap-2">
          <h2 id="turma" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Alunos × habilidades
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Aluno</th>
                  {sequence.map((e) => (
                    <th key={e.skill.id} className="px-3 py-2 font-mono font-medium">{e.skill.code}</th>
                  ))}
                  <th className="px-3 py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {[...students]
                  .sort((a, b) => Number(b.position.status === "pronto_para_avancar") - Number(a.position.status === "pronto_para_avancar"))
                  .map((row) => {
                    const next = sequence.find((e) => e.skill.id === row.position.nextSkillId);
                    const isReady = row.position.status === "pronto_para_avancar";
                    return (
                      <tr key={row.student.id} className="border-t border-border align-top">
                        <td className="px-3 py-2">
                          <span className="font-medium">{row.student.name}</span>
                          <span className="block text-xs text-muted-foreground">{row.rounds} rodada(s)</span>
                        </td>
                        {sequence.map((e) => (
                          <td key={e.skill.id} className="px-3 py-2">
                            {row.unlocked.includes(e.skill.id) ? (
                              <MasteryBadge mastery={row.mastery[e.skill.id]} compact />
                            ) : (
                              <span className="text-xs text-muted-foreground">bloqueada</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <span className={cn("block text-xs", isReady && "font-semibold text-emerald-700 dark:text-emerald-400")}>
                            {STATUS_LABEL[row.position.status]}
                          </span>
                          {next && row.position.status !== "concluiu_sequencia" ? (
                            <form action={unlockSkillAction} className="mt-1">
                              <input type="hidden" name="classroomId" value={classroom.id} />
                              <input type="hidden" name="studentId" value={row.student.id} />
                              <input type="hidden" name="skillId" value={next.skill.id} />
                              <button
                                type="submit"
                                className={cn(buttonVariants({ size: "sm", variant: isReady ? "default" : "ghost" }), !isReady && "text-xs")}
                              >
                                {row.position.status === "sem_liberacao" ? "Liberar" : isReady ? "Liberar" : "Liberar mesmo assim"} {next.skill.code}
                              </button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Estado por regra explícita ({MASTERY_RULES.versao}), não nota nem proficiência: últimas {MASTERY_RULES.janela} respostas
            da habilidade; <strong>consolidado</strong> = ao menos {MASTERY_RULES.consolidadoMinimo} respostas,{" "}
            {MASTERY_RULES.consolidadoTaxa * 100}% de acerto e a última certa; <strong>consolidando</strong> ={" "}
            {MASTERY_RULES.consolidandoTaxa * 100}% ou mais. Contam rodadas do circuito e listas suas publicadas para a habilidade.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Header() {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Ensino Médio</p>
      <h1 className="text-2xl font-semibold">Circuito adaptativo</h1>
      <p className="text-sm text-muted-foreground">
        Cada aluno pratica em rodadas curtas na habilidade liberada; você decide quando ele avança.
      </p>
    </header>
  );
}
