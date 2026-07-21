"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCheck, Clock, Plus, Send, ShieldCheck } from "lucide-react";

import {
  ASSESSMENT_LIFECYCLE_STATUS_LABEL,
  ASSESSMENT_SUBMISSION_STATUS_LABEL,
  getAssessmentStatus,
  type AnswerKeyPolicy,
  type AssessmentAssignment,
  type AssessmentDeadlineExtension,
  type AssessmentSubmission,
  type LessonAssessment,
} from "@/modules/assessment";
import type { Classroom, Student } from "@/modules/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  createAssessmentAction,
  extendAssessmentDeadlineAction,
  publishAssessmentAction,
  releaseAssessmentResultsAction,
  reopenAssessmentSubmissionAction,
  updateSubmissionReviewAction,
  validateAssessmentBatchAction,
  type AssessmentDraftInput,
} from "./actions";

const POLICY_LABEL: Record<AnswerKeyPolicy, string> = {
  after_submission: "Após o envio individual",
  after_end: "Após o encerramento",
  scheduled: "Em data programada",
  manual: "Liberação manual",
  never: "Nunca disponibilizar",
};

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function initialQuestions(): AssessmentDraftInput["questions"] {
  return [
    { type: "multiple_choice", prompt: "Qual alternativa define melhor uma Inteligência Artificial?", points: 2, options: [
      { id: "A", label: "Uma máquina que pensa e sente exatamente como um ser humano." },
      { id: "B", label: "Um sistema capaz de analisar dados, identificar padrões e executar determinadas tarefas." },
      { id: "C", label: "Qualquer aparelho eletrônico conectado à internet." },
      { id: "D", label: "Um robô físico que sempre possui forma humana." },
    ], correctAnswer: "B", justification: "IA analisa dados e padrões para executar tarefas definidas.", rubric: [] },
    { type: "multiple_choice", prompt: "Qual situação representa um uso de Inteligência Artificial?", points: 2, options: [
      { id: "A", label: "Uma calculadora realizando uma soma." }, { id: "B", label: "Um interruptor acendendo uma lâmpada." },
      { id: "C", label: "Um aplicativo recomendando músicas pelo histórico." }, { id: "D", label: "Um livro impresso organizando capítulos." },
    ], correctAnswer: "C", justification: "A recomendação identifica padrões de preferência.", rubric: [] },
    { type: "true_false", prompt: "Uma IA pode produzir uma resposta incorreta mesmo quando escreve de maneira convincente.", points: 1.5, options: [], correctAnswer: true, justification: "Fluência não garante exatidão.", rubric: [] },
    { type: "true_false", prompt: "Tudo o que uma IA produz pode ser usado sem verificar fontes, autoria ou erros.", points: 1.5, options: [], correctAnswer: false, justification: "Conteúdo de IA exige verificação crítica.", rubric: [] },
    { type: "essay", prompt: "Em uma ou duas frases, explique como a IA pode ajudar um estudante sem substituir o pensamento e a autoria dele.", points: 3, options: [], correctAnswer: null, justification: "Apoio legítimo deve preservar pensamento e autoria.", rubric: [
      { score: 3, description: "Apresenta apoio legítimo e preserva claramente pensamento ou autoria.", keywordGroups: [["ajudar", "apoiar", "explicar", "pesquisar", "organizar"], ["autoria", "pensamento", "decidir", "próprio", "autonomia"]] },
      { score: 2, description: "Apresenta apoio, mas trata superficialmente autoria ou autonomia.", keywordGroups: [["ajudar", "apoiar", "explicar", "pesquisar", "organizar"]] },
      { score: 1, description: "Resposta relacionada, porém incompleta.", keywordGroups: [["ia", "estudante", "aprender"]] },
    ] },
  ];
}

export function AssessmentManager(props: {
  assessments: LessonAssessment[];
  assignments: AssessmentAssignment[];
  classrooms: Classroom[];
  studentsByClassroom: Record<string, Student[]>;
  submissionsByAssignment: Record<string, AssessmentSubmission[]>;
  extensionsByAssignment: Record<string, AssessmentDeadlineExtension[]>;
  timezone: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("Nova sondagem diagnóstica");
  const [instructions, setInstructions] = useState("Responda às cinco questões com atenção.");
  const [questions, setQuestions] = useState(initialQuestions);
  const [assessmentId, setAssessmentId] = useState(props.assessments[0]?.id ?? "");
  const [classroomId, setClassroomId] = useState(props.classrooms[0]?.id ?? "");
  const now = new Date();
  const [startsAt, setStartsAt] = useState(localDateTime(now));
  const [endsAt, setEndsAt] = useState(localDateTime(new Date(now.getTime() + 7 * 86_400_000)));
  const [policy, setPolicy] = useState<AnswerKeyPolicy>("manual");
  const [answerKeyReleaseAt, setAnswerKeyReleaseAt] = useState("");

  function run(task: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      try { await task(); setMessage(success); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir a ação."); }
    });
  }

  function updateQuestion(index: number, patch: Partial<AssessmentDraftInput["questions"][number]>) {
    setQuestions((current) => current.map((question, position) => position === index ? { ...question, ...patch } : question));
  }

  const totalPublished = props.assignments.filter((item) => item.publicationStatus === "published").length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Sondagem diagnóstica</p><h1 className="text-2xl font-semibold">Sondagens diagnósticas</h1><p className="text-sm text-muted-foreground">Autocorreção supervisionada, prazos e devolutiva coletiva.</p></div>
        <Button onClick={() => setShowCreate((value) => !value)}><Plus /> Criar sondagem</Button>
      </header>

      {message ? <p role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo">
        <Metric label="Templates" value={props.assessments.length} />
        <Metric label="Atividades publicadas" value={totalPublished} />
        <Metric label="Entregas recebidas" value={Object.values(props.submissionsByAssignment).flat().filter((item) => item.status !== "draft").length} />
      </section>

      {showCreate ? (
        <Card><CardHeader><CardTitle>Nova sondagem</CardTitle><CardDescription>Estrutura obrigatória: 2 múltipla escolha, 2 verdadeiro/falso e 1 dissertativa.</CardDescription></CardHeader><CardContent className="space-y-5">
          <Field label="Título"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
          <Field label="Orientações"><textarea className="min-h-20 w-full rounded-lg border border-input bg-transparent p-3 text-sm" value={instructions} onChange={(event) => setInstructions(event.target.value)} /></Field>
          {questions.map((question, index) => <QuestionEditor key={index} index={index} question={question} onChange={(patch) => updateQuestion(index, patch)} />)}
          <Button disabled={pending} onClick={() => run(async () => {
            const created = await createAssessmentAction({ title, instructions, competencyIds: ["pensamento-critico", "cultura-digital"], questions });
            setAssessmentId(created.id); setShowCreate(false);
          }, "Sondagem criada com sucesso.")}><ShieldCheck /> Salvar sondagem</Button>
        </CardContent></Card>
      ) : null}

      <Card><CardHeader><CardTitle>Publicar para uma turma</CardTitle><CardDescription>O status é calculado pelas datas no fuso {props.timezone}.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <SelectField label="Sondagem" value={assessmentId} onChange={setAssessmentId} options={props.assessments.map((item) => ({ value: item.id, label: item.title }))} />
        <SelectField label="Turma" value={classroomId} onChange={setClassroomId} options={props.classrooms.map((item) => ({ value: item.id, label: item.name }))} />
        <Field label="Início"><Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></Field>
        <Field label="Encerramento"><Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></Field>
        <SelectField label="Política de gabarito" value={policy} onChange={(value) => setPolicy(value as AnswerKeyPolicy)} options={Object.entries(POLICY_LABEL).map(([value, label]) => ({ value, label }))} />
        {policy === "scheduled" ? <Field label="Liberação do gabarito"><Input type="datetime-local" value={answerKeyReleaseAt} onChange={(event) => setAnswerKeyReleaseAt(event.target.value)} /></Field> : null}
        <label className="flex items-center gap-2 text-sm"><input id="allow-late" type="checkbox" /> Aceitar envios atrasados</label>
        <label className="flex items-center gap-2 text-sm"><input id="auto-correction" type="checkbox" defaultChecked /> Ativar autocorreção</label>
        <Button className="md:col-span-2" disabled={pending || !assessmentId || !classroomId} onClick={() => {
          const late = (document.getElementById("allow-late") as HTMLInputElement)?.checked ?? false;
          const auto = (document.getElementById("auto-correction") as HTMLInputElement)?.checked ?? true;
          run(() => publishAssessmentAction({ assessmentId, classroomId, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), allowLateSubmission: late, autoCorrectionEnabled: auto, answerKeyPolicy: policy, answerKeyReleaseAt: answerKeyReleaseAt ? new Date(answerKeyReleaseAt).toISOString() : null }), "Sondagem publicada.");
        }}><Send /> Publicar atividade</Button>
      </CardContent></Card>

      <section className="space-y-4" aria-label="Atividades publicadas">
        {props.assignments.map((assignment) => (
          <AssignmentPanel key={assignment.id} assignment={assignment} assessment={props.assessments.find((item) => item.id === assignment.assessmentId)} classroom={props.classrooms.find((item) => item.id === assignment.classroomId)} students={props.studentsByClassroom[assignment.classroomId] ?? []} submissions={props.submissionsByAssignment[assignment.id] ?? []} extensions={props.extensionsByAssignment[assignment.id] ?? []} pending={pending} run={run} />
        ))}
      </section>
    </div>
  );
}

function AssignmentPanel({ assignment, assessment, classroom, students, submissions, extensions, pending, run }: {
  assignment: AssessmentAssignment; assessment?: LessonAssessment; classroom?: Classroom; students: Student[]; submissions: AssessmentSubmission[]; extensions: AssessmentDeadlineExtension[]; pending: boolean;
  run: (task: () => Promise<unknown>, success: string) => void;
}) {
  const [newDeadline, setNewDeadline] = useState("");
  const [extensionStudent, setExtensionStudent] = useState("");
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [confirmValidate, setConfirmValidate] = useState<"all" | "unflagged" | null>(null);
  const received = submissions.filter((item) => item.status !== "draft");
  const pendingReview = submissions.filter((item) => item.status === "submitted");
  const validated = submissions.filter((item) => item.status === "validated");
  const status = getAssessmentStatus(assignment);
  return <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{assessment?.title ?? "Sondagem"}</CardTitle><CardDescription>{classroom?.name} · {new Date(assignment.startsAt).toLocaleString("pt-BR")} até {new Date(assignment.endsAt).toLocaleString("pt-BR")}</CardDescription></div><Badge variant="outline">{ASSESSMENT_LIFECYCLE_STATUS_LABEL[status]}</Badge></div></CardHeader><CardContent className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-4"><Metric label="Alunos" value={students.length} /><Metric label="Recebidas" value={received.length} /><Metric label="Aguardando validação" value={pendingReview.length} /><Metric label="Validadas" value={validated.length} /></div>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={pending || pendingReview.length === 0} onClick={() => setConfirmValidate("all")}><CheckCheck /> Validar todas prontas</Button>
      <Button variant="outline" disabled={pending || pendingReview.length === 0} onClick={() => setConfirmValidate("unflagged")}>Validar exceto sinalizadas</Button>
      <Button disabled={pending || validated.length === 0} onClick={() => setConfirmRelease(true)}><Send /> Enviar correções validadas</Button>
    </div>
    <AlertDialog open={confirmValidate !== null} onOpenChange={(open) => { if (!open) setConfirmValidate(null); }}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmValidate === "unflagged" ? "Validar resultados prontos, exceto os sinalizados?" : `Validar ${pendingReview.length} resultado(s)?`}</AlertDialogTitle>
          <AlertDialogDescription>{confirmValidate === "unflagged" ? "As entregas sinalizadas ficam de fora e continuam aguardando revisão manual." : "Todas as entregas prontas para validação recebem a nota final calculada."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>Cancelar</AlertDialogClose>
          <Button onClick={() => { const excludeFlagged = confirmValidate === "unflagged"; setConfirmValidate(null); run(() => validateAssessmentBatchAction({ assignmentId: assignment.id, excludeFlagged }), excludeFlagged ? "Entregas sem sinalização validadas." : "Entregas prontas validadas."); }}>Confirmar</Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
    {confirmRelease ? <div role="alertdialog" aria-labelledby={`release-title-${assignment.id}`} className="rounded-lg border border-primary/40 bg-primary/5 p-4"><p id={`release-title-${assignment.id}`} className="font-semibold">Confirmar envio coletivo</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground"><li>Alunos na turma: {students.length}</li><li>Resultados validados: {validated.length}</li><li>Resultados que serão liberados: {validated.length}</li><li>Regra de gabarito: {POLICY_LABEL[assignment.answerKeyPolicy]}</li></ul><div className="mt-3 flex gap-2"><Button disabled={pending} onClick={() => { setConfirmRelease(false); run(() => releaseAssessmentResultsAction(assignment.id), "Resultados validados liberados coletivamente."); }}>Confirmar envio</Button><Button variant="outline" disabled={pending} onClick={() => setConfirmRelease(false)}>Cancelar</Button></div></div> : null}
    <div className="rounded-lg border border-border p-4"><p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clock className="size-4" /> Extensão de prazo</p><div className="grid gap-3 sm:grid-cols-3"><Input type="datetime-local" value={newDeadline} onChange={(event) => setNewDeadline(event.target.value)} /><select className="h-8 rounded-lg border border-input bg-background px-2 text-sm" value={extensionStudent} onChange={(event) => setExtensionStudent(event.target.value)}><option value="">Toda a turma</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select><Button variant="outline" disabled={!newDeadline || pending} onClick={() => run(() => extendAssessmentDeadlineAction({ assignmentId: assignment.id, studentId: extensionStudent || null, newEndsAt: new Date(newDeadline).toISOString(), reason: "Extensão definida pelo professor" }), "Prazo estendido.")}>Aplicar extensão</Button></div>{extensions.length ? <p className="mt-2 text-xs text-muted-foreground">{extensions.length} extensão(ões) registrada(s), preservando prazo original e autoria.</p> : null}</div>
    <div className="space-y-2">{received.map((submission) => <SubmissionReview key={submission.id} assignment={assignment} assessment={assessment} submission={submission} student={students.find((item) => item.id === submission.studentId)} pending={pending} run={run} />)}{received.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma entrega recebida.</p> : null}</div>
  </CardContent></Card>;
}

function SubmissionReview({ assignment, assessment, submission, student, pending, run }: { assignment: AssessmentAssignment; assessment?: LessonAssessment; submission: AssessmentSubmission; student?: Student; pending: boolean; run: (task: () => Promise<unknown>, success: string) => void }) {
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(submission.answers.map((answer) => [answer.questionId, answer.finalScore ?? answer.autoScore ?? 0])));
  const [feedback, setFeedback] = useState<Record<string, string>>(Object.fromEntries(submission.answers.map((answer) => [answer.questionId, answer.teacherFeedback ?? answer.autoFeedback ?? ""])));
  const [flagged, setFlagged] = useState<string[]>(submission.answers.filter((answer) => answer.flagged).map((answer) => answer.questionId));
  const [general, setGeneral] = useState(submission.teacherFeedback ?? "");
  const total = useMemo(() => Object.values(scores).reduce((sum, score) => sum + Number(score || 0), 0), [scores]);
  return <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">{student?.name ?? submission.studentId} · {ASSESSMENT_SUBMISSION_STATUS_LABEL[submission.status]} · {total.toLocaleString("pt-BR")} pontos</summary><div className="mt-4 space-y-4">{submission.answers.map((answer) => { const question = assessment?.questions.find((item) => item.id === answer.questionId); return <div key={answer.id} className="rounded-md bg-muted/30 p-3 text-sm"><p className="font-medium">{question?.position}. {question?.prompt}</p><p className="mt-1 text-muted-foreground">Resposta: {String(answer.value ?? "Em branco")}</p><div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr_auto]"><Input type="number" min={0} max={question?.points} step="0.5" value={scores[answer.questionId]} onChange={(event) => setScores((current) => ({ ...current, [answer.questionId]: Number(event.target.value) }))} aria-label={`Nota da questão ${question?.position}`} /><Input value={feedback[answer.questionId] ?? ""} onChange={(event) => setFeedback((current) => ({ ...current, [answer.questionId]: event.target.value }))} aria-label={`Devolutiva da questão ${question?.position}`} /><label className="flex items-center gap-2"><input type="checkbox" checked={flagged.includes(answer.questionId)} onChange={(event) => setFlagged((current) => event.target.checked ? [...current, answer.questionId] : current.filter((id) => id !== answer.questionId))} /> Sinalizar</label></div></div>; })}<Field label="Devolutiva individual"><textarea className="min-h-16 w-full rounded-lg border border-input bg-transparent p-2 text-sm" value={general} onChange={(event) => setGeneral(event.target.value)} /></Field><div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => run(() => updateSubmissionReviewAction({ assignmentId: assignment.id, studentId: submission.studentId, scores, feedback, flaggedQuestionIds: flagged, teacherFeedback: general, validate: true }), "Entrega validada.")}>Validar entrega</Button><Button variant="outline" disabled={pending} onClick={() => run(() => updateSubmissionReviewAction({ assignmentId: assignment.id, studentId: submission.studentId, scores, feedback, flaggedQuestionIds: flagged, teacherFeedback: general, validate: false }), "Correção individual salva.")}>Salvar correção</Button><Button variant="outline" disabled={pending} onClick={() => run(() => reopenAssessmentSubmissionAction({ assignmentId: assignment.id, studentId: submission.studentId }), "Entrega reaberta para o aluno.")}>Reabrir entrega</Button></div></div></details>;
}

function QuestionEditor({ index, question, onChange }: { index: number; question: AssessmentDraftInput["questions"][number]; onChange: (patch: Partial<AssessmentDraftInput["questions"][number]>) => void }) {
  return <fieldset className="rounded-lg border border-border p-4"><legend className="px-1 text-sm font-semibold">Questão {index + 1} · {question.type === "multiple_choice" ? "Múltipla escolha" : question.type === "true_false" ? "Verdadeiro ou falso" : "Dissertativa"}</legend><div className="space-y-3"><Field label="Enunciado"><textarea className="min-h-16 w-full rounded-lg border border-input bg-transparent p-2 text-sm" value={question.prompt} onChange={(event) => onChange({ prompt: event.target.value })} /></Field><Field label="Pontuação"><Input type="number" min={0} step="0.5" value={question.points} onChange={(event) => onChange({ points: Number(event.target.value) })} /></Field>{question.type === "multiple_choice" ? question.options.map((option, optionIndex) => <Field key={option.id} label={`Alternativa ${option.id}`}><Input value={option.label} onChange={(event) => onChange({ options: question.options.map((item, position) => position === optionIndex ? { ...item, label: event.target.value } : item) })} /></Field>) : null}{question.type !== "essay" ? <SelectField label="Gabarito" value={String(question.correctAnswer)} onChange={(value) => onChange({ correctAnswer: question.type === "true_false" ? value === "true" : value })} options={question.type === "true_false" ? [{ value: "true", label: "Verdadeiro" }, { value: "false", label: "Falso" }] : question.options.map((option) => ({ value: option.id, label: option.id }))} /> : null}<Field label="Justificativa"><Input value={question.justification} onChange={(event) => onChange({ justification: event.target.value })} /></Field></div></fieldset>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-border bg-card p-3"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="flex flex-col gap-1.5 text-sm font-medium">{label}{children}</label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) { return <Field label={label}><select className="h-8 rounded-lg border border-input bg-background px-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>; }
