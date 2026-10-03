import type { Metadata } from "next";
import Link from "next/link";

import { ProvisionalCurriculumNotice } from "@/components/question-bank/provisional-curriculum-notice";
import { QuestionContent } from "@/components/question-bank/question-content";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import {
  type BankItemLink,
  EDITORIAL_DIFFICULTY_LABEL,
  GRADE_LABEL,
  MAX_LIST_ITEMS,
  PRACTICE_LIST_KIND_LABEL,
  PRACTICE_LIST_STATUS_LABEL,
  SOURCE_KIND_LABEL,
} from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

import { createListAction } from "./actions";

export const metadata: Metadata = {
  title: "Banco de questões",
  description: "Escolha uma habilidade e questões revisadas para montar uma lista curta.",
};

type SearchParams = Promise<{ turma?: string; habilidade?: string; aviso?: string }>;

const AREA_ORDER = ["lgg", "mat", "cnt", "chs"];
const AREA_LABEL: Record<string, string> = {
  lgg: "Linguagens",
  mat: "Matemática",
  cnt: "Ciências da Natureza",
  chs: "Ciências Humanas e Sociais Aplicadas",
};

export default async function QuestionBankTeacherPage({ searchParams }: { searchParams: SearchParams }) {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        O banco de questões está disponível apenas na instalação com banco real.
      </p>
    );
  }
  const { actor, service } = await getQuestionBankContext();
  if (actor.role !== "professor") return null;

  const params = await searchParams;
  const classrooms = await service.classrooms();
  const classroom = classrooms.find((c) => c.id === params.turma) ?? classrooms[0] ?? null;

  if (!classroom) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <Header />
        <p className="mt-6 text-sm text-muted-foreground">Você ainda não tem turmas vinculadas.</p>
      </div>
    );
  }

  const [{ entries, gradeKnown }, lists] = await Promise.all([
    service.plannedSkillsForClassroom(classroom.id),
    service.listsForClassrooms([classroom.id]),
  ]);
  const selected = entries.find((e) => e.skill.id === params.habilidade) ?? null;
  const bank = selected ? await service.approvedForSkill(selected.skill.id) : [];
  const anyProvisional = entries.some((e) => e.plan.status === "provisional");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Header />
      {anyProvisional ? <ProvisionalCurriculumNotice /> : null}
      {params.aviso ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {params.aviso}
        </p>
      ) : null}

      {/* 1. Turma */}
      <section aria-labelledby="turma" className="flex flex-col gap-2">
        <h2 id="turma" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          1. Turma
        </h2>
        <div className="flex flex-wrap gap-2">
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
        </div>
        {!gradeKnown ? (
          <p className="text-xs text-muted-foreground">
            Esta turma ainda não tem série cadastrada; mostrando o planejamento do ano letivo inteiro.
          </p>
        ) : null}
      </section>

      {/* 2. Habilidade */}
      <section aria-labelledby="habilidade" className="flex flex-col gap-3">
        <h2 id="habilidade" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          2. Habilidade planejada
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma habilidade planejada para esta turma.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {[...entries]
              .sort((a, b) => AREA_ORDER.indexOf(a.skill.areaId) - AREA_ORDER.indexOf(b.skill.areaId))
              .map((e) => {
                const active = selected?.plan.id === e.plan.id;
                return (
                  <Link
                    key={e.plan.id}
                    href={`?turma=${encodeURIComponent(classroom.id)}&habilidade=${encodeURIComponent(e.skill.id)}`}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors hover:bg-muted/60",
                      active ? "border-primary ring-2 ring-primary/30" : "border-border",
                    )}
                    aria-current={active ? "true" : undefined}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{e.skill.code}</span>
                      <Badge variant="outline">{AREA_LABEL[e.skill.areaId] ?? e.skill.areaId}</Badge>
                      <Badge variant="secondary">{e.component.name}</Badge>
                      {e.plan.status === "provisional" ? <Badge variant="outline">Provisório</Badge> : null}
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{e.skill.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {GRADE_LABEL[e.plan.gradeCode]} · {e.plan.periodLabel}
                    </p>
                  </Link>
                );
              })}
          </div>
        )}
      </section>

      {/* 3. Questões revisadas → lista */}
      {selected ? (
        <section aria-labelledby="questoes" className="flex flex-col gap-3">
          <h2 id="questoes" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            3. Questões revisadas de {selected.skill.code}
          </h2>
          {bank.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há questão aprovada na revisão editorial para esta habilidade.
            </p>
          ) : (
            <form action={createListAction} className="flex flex-col gap-4">
              <input type="hidden" name="classroomId" value={classroom.id} />
              <input type="hidden" name="componentId" value={selected.component.id} />
              <input type="hidden" name="skillId" value={selected.skill.id} />
              {bank.map(({ version, source, key, origin, officialSkill, link }) => (
                <Card key={version.id}>
                  <CardHeader>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        name="versionIds"
                        value={version.id}
                        defaultChecked={origin === "escola" && link.kind === "oficial"}
                        className="mt-1 size-4 accent-primary"
                      />
                      <span className="flex flex-col gap-2">
                        <span className="flex flex-wrap gap-2">
                          <Badge variant={origin === "catalogo" ? "default" : "secondary"}>
                            {origin === "catalogo" ? "Catálogo IAH" : "Questão da escola"}
                          </Badge>
                          <LinkBadge link={link} skillCode={selected.skill.code} />
                          {origin === "catalogo" && officialSkill ? (
                            <Badge variant="outline" title={officialSkill.description}>
                              Matriz {officialSkill.code}
                            </Badge>
                          ) : null}
                        </span>
                        <CardTitle className="text-base font-medium leading-snug">
                          <QuestionContent text={version.stem} format={version.contentFormat} versionId={version.id} />
                        </CardTitle>
                        <CardDescription>
                          Versão {version.version} · revisada
                          {version.editorialDifficulty
                            ? ` · ${EDITORIAL_DIFFICULTY_LABEL[version.editorialDifficulty]}`
                            : ""}
                          {source ? ` · ${SOURCE_KIND_LABEL[source.kind]} (${source.rightsHolder})` : ""}
                        </CardDescription>
                        {link.kind !== "oficial" ? (
                          <span className="text-xs text-muted-foreground">Motivo da correspondência: {link.rationale}</span>
                        ) : null}
                      </span>
                    </label>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 pl-12">
                    <ol className="flex flex-col gap-1 text-sm">
                      {version.options.map((o) => (
                        <li key={o.key} className={o.key === key?.answerKey ? "font-semibold text-primary" : ""}>
                          {o.key}){" "}
                          <QuestionContent text={o.text} format={version.contentFormat} versionId={version.id} inline />
                          {o.key === key?.answerKey ? " — gabarito" : ""}
                        </li>
                      ))}
                    </ol>
                    {key?.resolution ? (
                      <details className="text-sm text-muted-foreground">
                        <summary className="cursor-pointer">Resolução comentada</summary>
                        <p className="mt-1 whitespace-pre-line">{key.resolution}</p>
                      </details>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
              <Card>
                <CardContent className="grid gap-3 pt-6 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <label className="flex flex-col gap-1 text-sm">
                    Título da lista
                    <input
                      name="title"
                      required
                      defaultValue={`Diagnóstica — ${selected.skill.code}`}
                      className="h-9 rounded-md border border-input bg-background px-3"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Tipo
                    <select name="kind" defaultValue="diagnostica" className="h-9 rounded-md border border-input bg-background px-3">
                      {Object.entries(PRACTICE_LIST_KIND_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className={cn(buttonVariants())}>
                    Publicar lista para {classroom.name}
                  </button>
                  <p className="text-xs text-muted-foreground sm:col-span-3">
                    Até {MAX_LIST_ITEMS} questões. Depois de publicada, a lista não muda; os alunos veem
                    gabarito e resolução só após entregar.
                  </p>
                </CardContent>
              </Card>
            </form>
          )}
        </section>
      ) : null}

      {/* Listas da turma */}
      <section aria-labelledby="listas" className="flex flex-col gap-3">
        <h2 id="listas" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Listas de {classroom.name}
        </h2>
        {lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma lista ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lists.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/professor/banco-de-questoes/listas/${encodeURIComponent(l.id)}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted/60"
                >
                  <span className="font-medium">{l.title}</span>
                  <span className="flex gap-2">
                    <Badge variant="outline">{PRACTICE_LIST_KIND_LABEL[l.kind]}</Badge>
                    <Badge variant={l.status === "publicada" ? "default" : "secondary"}>
                      {PRACTICE_LIST_STATUS_LABEL[l.status]}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const CONFIDENCE_LABEL = { alta: "confiança alta", media: "confiança média", baixa: "confiança baixa" } as const;

/** Rótulo de como a questão chegou à habilidade: oficial, BNCC confirmada ou sugerida. */
function LinkBadge({ link, skillCode }: { link: BankItemLink; skillCode: string }) {
  if (link.kind === "oficial") return <Badge variant="outline">Habilidade oficial: {skillCode}</Badge>;
  if (link.kind === "confirmada") return <Badge variant="outline">{skillCode} confirmada pela equipe</Badge>;
  return (
    <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">
      {skillCode} sugerida {link.suggestedBy === "ia" ? "por IA" : "pela equipe"} · {CONFIDENCE_LABEL[link.confidence]} · não revisada
    </Badge>
  );
}

function Header() {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Ensino Médio</p>
      <h1 className="text-2xl font-semibold">Banco de questões</h1>
      <p className="text-sm text-muted-foreground">
        Escolha uma habilidade do planejamento da turma e questões já revisadas para publicar uma lista curta.
      </p>
    </header>
  );
}
