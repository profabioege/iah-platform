import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProvisionalCurriculumNotice } from "@/components/question-bank/provisional-curriculum-notice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import { PRACTICE_LIST_KIND_LABEL, PRACTICE_LIST_STATUS_LABEL } from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

import { closeListAction, saveFeedbackAction } from "../../actions";

export const metadata: Metadata = {
  title: "Respostas da lista",
  description: "Respostas dos alunos, devolutiva automática e devolutiva do professor.",
};

export default async function ListResultsPage({ params }: { params: Promise<{ id: string }> }) {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        O banco de questões está disponível apenas na instalação com banco real.
      </p>
    );
  }
  const { actor, service } = await getQuestionBankContext();
  if (actor.role !== "professor") return null;

  const { id } = await params;
  const results = await service.listResults(decodeURIComponent(id)).catch(() => null);
  if (!results) notFound();
  const { list, classroom, students, skills } = results;
  const delivered = students.filter((s) => s.attempt?.status === "entregue");
  const skillCode = new Map(skills.map((s) => [s.id, s.code]));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href={`/professor/banco-de-questoes?turma=${encodeURIComponent(list.classroomId)}`} className="text-xs text-primary hover:underline">
          ← Banco de questões
        </Link>
        <h1 className="text-2xl font-semibold">{list.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{classroom?.name ?? "Turma"}</span>
          <Badge variant="outline">{PRACTICE_LIST_KIND_LABEL[list.kind]}</Badge>
          <Badge variant={list.status === "publicada" ? "default" : "secondary"}>
            {PRACTICE_LIST_STATUS_LABEL[list.status]}
          </Badge>
          <span>
            {delivered.length} de {students.length} entregaram
          </span>
          {skills.map((s) => (
            <Badge key={s.id} variant="secondary" className="font-mono">{s.code}</Badge>
          ))}
        </div>
      </header>
      {list.curriculumProvisional ? <ProvisionalCurriculumNotice /> : null}

      <section aria-label="Respostas por aluno" className="flex flex-col gap-3">
        {students.map(({ student, attempt, report, feedback }) => (
          <Card key={student.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{student.name}</CardTitle>
                {attempt?.status === "entregue" && report ? (
                  <Badge>
                    {report.correct} de {report.total} corretas
                  </Badge>
                ) : (
                  <Badge variant="outline">{attempt ? "Respondendo" : "Não iniciou"}</Badge>
                )}
              </div>
              {report ? (
                <CardDescription>
                  {report.bySkill.map((s) => `${s.skillCode}: ${s.correct}/${s.total}`).join(" · ")}
                </CardDescription>
              ) : null}
            </CardHeader>
            {report ? (
              <CardContent className="flex flex-col gap-3">
                <ol className="flex flex-col gap-1 text-sm">
                  {report.items.map((item) => (
                    <li key={item.itemId} className="flex flex-wrap gap-x-2">
                      <span className="font-medium">Q{item.position}</span>
                      <span className="font-mono text-xs text-muted-foreground">{skillCode.get(item.skillId)}</span>
                      <span>
                        respondeu <strong>{item.selectedKey ?? "—"}</strong>, gabarito <strong>{item.answerKey}</strong>
                      </span>
                      <span className={item.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                        {item.isCorrect ? "✓ correta" : "✗ incorreta"}
                      </span>
                    </li>
                  ))}
                </ol>
                <form action={saveFeedbackAction} className="flex flex-col gap-2">
                  <input type="hidden" name="listId" value={list.id} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <label className="text-sm font-medium" htmlFor={`fb-${student.id}`}>
                    Devolutiva do professor
                  </label>
                  <textarea
                    id={`fb-${student.id}`}
                    name="comment"
                    required
                    rows={2}
                    defaultValue={feedback?.comment ?? ""}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <div>
                    <button type="submit" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                      {feedback ? "Atualizar devolutiva" : "Salvar devolutiva"}
                    </button>
                  </div>
                </form>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </section>

      {list.status === "publicada" ? (
        <form action={closeListAction}>
          <input type="hidden" name="listId" value={list.id} />
          <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
            Encerrar lista (não aceita novas entregas)
          </button>
        </form>
      ) : null}
    </div>
  );
}
