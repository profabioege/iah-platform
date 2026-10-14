import type { Metadata } from "next";
import Link from "next/link";

import { EvidenceBadge } from "@/components/study/evidence-badge";
import {
  DemonstrativeBanner,
  ProvisionalPlanBanner,
} from "@/components/study/study-banners";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import {
  BLOCK_STATUS_LABEL,
  DIAGNOSTIC_RULES,
  EVIDENCE_LABEL,
  todayIso,
  type EvidenceLevel,
} from "@/modules/study";
import { getStudyContext } from "@/modules/study/infrastructure/request-context";
import { QUESTIONS_PER_BLOCK } from "@/modules/study/services/diagnostic-service";

import { createDiagnosticAction, setDiagnosticStatusAction } from "./actions";

export const metadata: Metadata = {
  title: "Diagnóstico e planos",
  description:
    "Diagnóstico por etapas da turma, evidências por habilidade e planos semanais dos alunos.",
};

const LEVELS: EvidenceLevel[] = [
  "pendente",
  "evidencia_insuficiente",
  "prioridade_de_estudo",
  "em_desenvolvimento",
  "indicios_favoraveis",
];

const DIAG_STATUS = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  encerrado: "Encerrado",
} as const;

export default async function TeacherDiagnosticPage({
  searchParams,
}: {
  searchParams: Promise<{
    turma?: string;
    diagnostico?: string;
    aviso?: string;
  }>;
}) {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        O diagnóstico está disponível apenas na instalação com banco real.
      </p>
    );
  }
  const ctx = await getStudyContext();
  if (ctx.actor.role === "aluno") return null;
  const { turma, diagnostico, aviso } = await searchParams;
  const classrooms = await ctx.bank.classrooms();
  const classroom = classrooms.find((c) => c.id === turma) ?? classrooms[0];

  if (!classroom) {
    return (
      <p className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        Você ainda não tem turmas vinculadas.
      </p>
    );
  }

  const diagnostics = await ctx.diagnostic.forClassroom(classroom.id);
  const selected =
    diagnostics.find((d) => d.id === diagnostico) ?? diagnostics[0] ?? null;
  const isTeacher = ctx.actor.role === "professor";
  const [candidates, view, plans] = await Promise.all([
    isTeacher ? ctx.diagnostic.candidates(classroom.id) : Promise.resolve(null),
    selected
      ? ctx.diagnostic.classroomView(selected.id)
      : Promise.resolve(null),
    ctx.plan.forClassroom(classroom.id, todayIso()),
  ]);
  const base = `/professor/diagnostico?turma=${encodeURIComponent(classroom.id)}`;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Trilhas das disciplinas
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Diagnóstico e planos
        </h1>
        <p className="text-sm text-muted-foreground">
          Etapas curtas por habilidade, com questões aprovadas na revisão. O
          resultado é evidência inicial para orientar estudos — não é nota nem
          proficiência.
        </p>
        <nav aria-label="Turmas" className="flex flex-wrap gap-2">
          {classrooms.map((c) => (
            <Link
              key={c.id}
              href={`/professor/diagnostico?turma=${encodeURIComponent(c.id)}`}
              className={cn(
                buttonVariants({
                  size: "sm",
                  variant: c.id === classroom.id ? "default" : "outline",
                }),
              )}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </header>

      {aviso ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          {aviso}
        </p>
      ) : null}

      {candidates ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Novo diagnóstico para {classroom.name}
            </CardTitle>
            <CardDescription>
              Uma etapa por habilidade do planejamento, com até{" "}
              {QUESTIONS_PER_BLOCK} questões aprovadas (vínculo oficial ou
              confirmado). Habilidade com menos de{" "}
              {DIAGNOSTIC_RULES.minAnswered} questões não entra.
              {candidates.gradeKnown
                ? ""
                : " A turma ainda não tem série informada: o planejamento é o do ano inteiro."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createDiagnosticAction}
              className="flex flex-col gap-3"
            >
              <input type="hidden" name="turma" value={classroom.id} />
              <label className="flex flex-col gap-1 text-sm font-medium">
                Título
                <input
                  name="titulo"
                  required
                  maxLength={160}
                  defaultValue="Diagnóstico de entrada — 1º bimestre"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm font-normal"
                />
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">
                  Habilidades (uma etapa cada)
                </legend>
                {candidates.skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma habilidade no planejamento desta turma.
                  </p>
                ) : null}
                {candidates.skills.map((c) => (
                  <label
                    key={c.skill.id}
                    className={cn(
                      "flex items-start gap-3 rounded-md border border-border px-3 py-2 text-sm",
                      !c.enough && "opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="habilidades"
                      value={c.skill.id}
                      disabled={!c.enough}
                      defaultChecked={c.enough}
                      className="mt-1 accent-primary"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span>
                        <span className="font-mono">{c.skill.code}</span> ·{" "}
                        {c.componentName}
                        {c.planProvisional ? " · planejamento provisório" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.eligible} questão(ões) elegível(is)
                        {c.synthetic > 0
                          ? ` · ${c.synthetic} demonstrativa(s), pendente(s) de revisão docente`
                          : ""}
                        {c.enough
                          ? ""
                          : ` · insuficiente (mínimo ${DIAGNOSTIC_RULES.minAnswered})`}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <button type="submit" className={cn(buttonVariants(), "w-fit")}>
                Criar diagnóstico (rascunho)
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {diagnostics.length > 0 ? (
        <nav
          aria-label="Diagnósticos da turma"
          className="flex flex-wrap gap-2"
        >
          {diagnostics.map((d) => (
            <Link
              key={d.id}
              href={`${base}&diagnostico=${encodeURIComponent(d.id)}`}
              className={cn(
                buttonVariants({
                  size: "sm",
                  variant: d.id === selected?.id ? "secondary" : "ghost",
                }),
              )}
            >
              {d.title} · {DIAG_STATUS[d.status]}
            </Link>
          ))}
        </nav>
      ) : null}

      {view ? (
        <section
          aria-labelledby="acompanhamento"
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="acompanhamento" className="text-lg font-semibold">
                {view.diagnostic.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {DIAG_STATUS[view.diagnostic.status]} · {view.blocks.length}{" "}
                etapa(s) · {view.blocks.map((b) => b.skill?.code).join(", ")}
              </p>
            </div>
            {isTeacher && view.diagnostic.status !== "encerrado" ? (
              <form action={setDiagnosticStatusAction}>
                <input type="hidden" name="turma" value={classroom.id} />
                <input
                  type="hidden"
                  name="diagnosticId"
                  value={view.diagnostic.id}
                />
                <input
                  type="hidden"
                  name="op"
                  value={
                    view.diagnostic.status === "rascunho"
                      ? "publicar"
                      : "encerrar"
                  }
                />
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({
                      size: "sm",
                      variant:
                        view.diagnostic.status === "rascunho"
                          ? "default"
                          : "outline",
                    }),
                  )}
                >
                  {view.diagnostic.status === "rascunho"
                    ? "Publicar para a turma"
                    : "Encerrar diagnóstico"}
                </button>
              </form>
            ) : null}
          </div>
          <DemonstrativeBanner demonstrative={view.diagnostic.demonstrative} />
          <ProvisionalPlanBanner
            provisional={view.diagnostic.curriculumProvisional}
          />

          <div className="grid gap-3 md:grid-cols-2">
            {view.bySkill.map((s) => (
              <Card key={s.skillId}>
                <CardContent className="flex flex-col gap-2 py-2">
                  <p className="font-mono text-sm font-semibold">
                    {s.skillCode}
                  </p>
                  <ul className="flex flex-col gap-1 text-xs">
                    {LEVELS.map((l) => (
                      <li
                        key={l}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-muted-foreground">
                          {EVIDENCE_LABEL[l]}
                        </span>
                        <span className="tabular-nums">{s.counts[l]}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* grid + overflow: a tabela rola dentro do cartão em vez de alargar a página no celular */}
          <div className="grid min-w-0">
            <div className="min-w-0 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] text-left text-xs">
                <caption className="sr-only">
                  Alunos e etapas do diagnóstico
                </caption>
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Aluno
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Situação
                    </th>
                    {view.blocks.map((b) => (
                      <th
                        key={b.id}
                        scope="col"
                        className="px-3 py-2 font-mono font-medium"
                      >
                        {b.skill?.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.students.map(({ student, evidence }) => (
                    <tr
                      key={student.id}
                      className="border-t border-border align-top"
                    >
                      <th scope="row" className="px-3 py-2 font-medium">
                        {student.name}
                      </th>
                      <td className="px-3 py-2 text-muted-foreground">
                        {evidence.status === "concluido"
                          ? "Concluído"
                          : evidence.status === "incompleto"
                            ? `Incompleto (${evidence.blocksSubmitted}/${evidence.blocksTotal})`
                            : "Não iniciado"}
                      </td>
                      {evidence.skills.map((s) => (
                        <td key={s.blockId} className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <EvidenceBadge level={s.level} />
                            <span className="text-[11px] text-muted-foreground">
                              {s.blockStatus === "entregue"
                                ? `${s.correct}✓ ${s.incorrect}✗ ${s.unanswered} em branco`
                                : BLOCK_STATUS_LABEL[s.blockStatus]}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="planos" className="flex flex-col gap-3">
        <h2 id="planos" className="text-lg font-semibold">
          Planos desta semana
        </h2>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aluno gerou o plano desta semana ainda.
          </p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {plans.map((p) => {
              const active = p.items.filter((i) => i.status !== "removida");
              const done = active.filter(
                (i) => i.status === "concluida",
              ).length;
              const postponed = active.filter(
                (i) => i.status === "adiada",
              ).length;
              const used = Object.values(p.usedByDay).reduce(
                (a, b) => a + b,
                0,
              );
              const name =
                view?.students.find((s) => s.student.id === p.plan.studentId)
                  ?.student.name ?? p.plan.studentId;
              return (
                <li
                  key={p.plan.id}
                  className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3"
                >
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {done} concluída(s) · {active.length - done - postponed}{" "}
                    planejada(s) · {postponed} adiada(s) · {used}/
                    {p.plan.minutesPerDay * p.plan.availableDays.length} min
                  </p>
                  <Link
                    href={`/professor/diagnostico/plano/${encodeURIComponent(p.plan.id)}?turma=${encodeURIComponent(classroom.id)}`}
                    className="w-fit text-xs font-medium text-primary hover:underline"
                  >
                    Ver e ajustar o plano →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {/* Texto comum (não Badge): o selo não quebra linha e alargava a página no celular. */}
        <p className="text-xs text-muted-foreground">
          Os planos são gerados pelos alunos com a disponibilidade deles; o
          professor ajusta e orienta.
        </p>
      </section>
    </div>
  );
}
