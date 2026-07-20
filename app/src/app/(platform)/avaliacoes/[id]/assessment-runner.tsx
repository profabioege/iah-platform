"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Clock3, Save, Send } from "lucide-react";

import type {
  AssessmentAssignment,
  AssessmentLifecycleStatus,
  AssessmentOption,
  AssessmentQuestionType,
  AssessmentResultVisibility,
  AssessmentSubmission,
} from "@/modules/assessment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { saveAssessmentDraftAction, submitAssessmentAction } from "./actions";

interface StudentQuestion {
  id: string;
  position: number;
  type: AssessmentQuestionType;
  prompt: string;
  points: number;
  options: AssessmentOption[];
  correctAnswer: string | boolean | null;
  justification: string | null;
}

export function AssessmentRunner({ assignment, title, instructions, questions, submission, status, effectiveEndsAt, visibility }: {
  assignment: AssessmentAssignment; title: string; instructions: string; questions: StudentQuestion[]; submission: AssessmentSubmission | null; status: AssessmentLifecycleStatus; effectiveEndsAt: string; visibility: AssessmentResultVisibility;
}) {
  const [answers, setAnswers] = useState<Record<string, string | boolean | null>>(Object.fromEntries(questions.map((question) => [question.id, submission?.answers.find((answer) => answer.questionId === question.id)?.value ?? null])));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const locked = Boolean(submission && submission.status !== "draft");
  const now = Date.now();
  const withinWindow =
    now >= new Date(assignment.startsAt).getTime() &&
    (now <= new Date(effectiveEndsAt).getTime() || assignment.allowLateSubmission);
  const canAnswer = assignment.publicationStatus === "published" && withinWindow && !locked;
  const answered = useMemo(() => Object.values(answers).filter((value) => value !== null && value !== "").length, [answers]);
  const total = questions.reduce((sum, question) => sum + question.points, 0);

  function run(task: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => { try { await task(); setMessage(success); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir."); } });
  }

  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-5"><header className="space-y-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Sondagem diagnóstica</p><h1 className="text-2xl font-semibold">{title}</h1></div><Badge variant="outline">{status}</Badge></div><p className="text-sm text-muted-foreground">{instructions}</p><div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="size-3.5" /> Início: {new Date(assignment.startsAt).toLocaleString("pt-BR")}</span><span>Encerramento efetivo: {new Date(effectiveEndsAt).toLocaleString("pt-BR")}</span><span>{assignment.allowLateSubmission ? "Atrasos aceitos" : "Atrasos bloqueados"}</span></div></header>
    {message ? <p role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{message}</p> : null}
    {questions.map((question) => <QuestionCard key={question.id} question={question} value={answers[question.id]} disabled={!canAnswer} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} answer={submission?.answers.find((item) => item.questionId === question.id)} visibility={visibility} />)}
    {canAnswer ? <div className="sticky bottom-4 flex flex-col gap-2 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center"><p className="mr-auto text-sm text-muted-foreground">{answered} de {questions.length} respondidas</p><Button variant="outline" disabled={pending} onClick={() => run(() => saveAssessmentDraftAction(assignment.id, answers), "Rascunho salvo.")}><Save /> Salvar rascunho</Button><Button disabled={pending || answered < questions.length} onClick={() => { if (confirm("Após o envio, as respostas ficarão bloqueadas até eventual reabertura pelo professor. Confirmar envio?")) run(() => submitAssessmentAction(assignment.id, answers), "Sondagem enviada. A correção aguarda validação docente."); }}><Send /> Enviar respostas</Button></div> : null}
    {locked && !visibility.result ? <Card><CardContent className="flex items-center gap-3 py-5"><CheckCircle2 className="size-5 text-primary" /><div><p className="font-medium">Entrega recebida</p><p className="text-sm text-muted-foreground">O resultado será exibido somente após a liberação docente.</p></div></CardContent></Card> : null}
    {visibility.result && submission ? <Card><CardHeader><CardTitle>Resultado individual</CardTitle><CardDescription>Resultado e feedback liberados pelo professor.</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-3xl font-semibold">{submission.finalScore?.toLocaleString("pt-BR") ?? "—"} <span className="text-base font-normal text-muted-foreground">de {total.toLocaleString("pt-BR")}</span></p>{visibility.feedback ? <div><p className="text-sm font-medium">Feedback individual</p><p className="text-sm text-muted-foreground">{submission.teacherFeedback ?? "Sem feedback adicional."}</p></div> : null}</CardContent></Card> : null}
    {visibility.answerKey ? <Card><CardHeader><CardTitle>Gabarito completo</CardTitle><CardDescription>Disponível conforme a política definida pelo professor.</CardDescription></CardHeader><CardContent className="space-y-3">{questions.map((question) => <div key={question.id} className="rounded-lg border border-border p-3 text-sm"><p className="font-medium">Questão {question.position}: {question.type === "essay" ? "rubrica docente" : `resposta ${String(question.correctAnswer)}`}</p><p className="text-muted-foreground">{question.justification}</p></div>)}</CardContent></Card> : null}
  </div>;
}

function QuestionCard({ question, value, disabled, onChange, answer, visibility }: { question: StudentQuestion; value: string | boolean | null; disabled: boolean; onChange: (value: string | boolean) => void; answer?: AssessmentSubmission["answers"][number]; visibility: AssessmentResultVisibility }) {
  return <Card><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="text-base">{question.position}. {question.prompt}</CardTitle><Badge variant="outline">{question.points.toLocaleString("pt-BR")} pts</Badge></div></CardHeader><CardContent className="space-y-3">{question.type === "multiple_choice" ? question.options.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary"><input type="radio" name={question.id} value={option.id} checked={value === option.id} disabled={disabled} onChange={() => onChange(option.id)} /><span><strong>{option.id}.</strong> {option.label}</span></label>) : null}{question.type === "true_false" ? <div className="grid grid-cols-2 gap-3">{[[true, "Verdadeiro"], [false, "Falso"]].map(([choice, label]) => <label key={String(choice)} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary"><input type="radio" name={question.id} checked={value === choice} disabled={disabled} onChange={() => onChange(choice as boolean)} />{label as string}</label>)}</div> : null}{question.type === "essay" ? <textarea aria-label={`Resposta da questão ${question.position}`} className="min-h-28 w-full rounded-lg border border-input bg-transparent p-3 text-sm" value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)} /> : null}{visibility.feedback && answer ? <p className="rounded-md bg-muted/40 p-2 text-sm"><strong>Feedback:</strong> {answer.teacherFeedback ?? answer.autoFeedback ?? "Sem observação específica."}</p> : null}</CardContent></Card>;
}
