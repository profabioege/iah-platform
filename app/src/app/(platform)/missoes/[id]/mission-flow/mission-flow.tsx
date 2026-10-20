"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ClipboardList,
  Compass,
  PartyPopper,
  MessageSquareText,
  Target,
  Undo2,
} from "lucide-react";

import type { Mission } from "@/modules/library";
import { isAiEvidenceComplete } from "@/modules/classroom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { MissionHeader } from "./mission-header";
import { MissionStep } from "./mission-step";
import { MissionNavigation } from "./mission-navigation";
import { EvidenceCard } from "./evidence-card";
import { InvestigationGuideStepper } from "./investigation-guide-stepper";
import { RubricCard } from "./rubric-card";
import { ReflectionCard } from "./reflection-card";
import { StepTransition } from "./step-transition";
import {
  chunkIntoParagraphs,
  parseMissionContent,
  splitQuestions,
} from "./parse-mission-content";
import { minutesRemainingFrom, totalMissionMinutes, totalSteps } from "./mission-timing";
import {
  hasReportContent,
  initialReport,
  readHypotheses,
  setHypothesis,
} from "./report-hypotheses";
import { AiEvidenceForm, AxesObjectives, AxesReviewCards } from "./two-axes";
import {
  useStudentWork,
  type StudentWorkSource,
  type Transition,
  type TransitionKind,
  type WorkSaveStatus,
} from "./use-student-work";

/**
 * Mission Flow — a Missão como investigação guiada, não como
 * formulário dividido em etapas (docs/MISSION_STUDIO.md continua
 * sendo a autoria; isto é a experiência de quem investiga). Ver
 * decisões em DECISIONS.md D-027 e o refinamento cognitivo da
 * Sprint M09.
 */
export function MissionFlow({
  mission,
  source,
}: {
  mission: Mission;
  source: StudentWorkSource;
}) {
  const { work, update, flush, saveStatusOf, transition, delivered, recorded, submissionStatus } =
    useStudentWork(source, mission.id);
  const running = (kind: TransitionKind) => transition?.kind === kind && transition.status === "running";
  const reviewed = submissionStatus === "reviewed";
  const parsed = React.useMemo(
    () => parseMissionContent(mission.didacticMaterials),
    [mission.didacticMaterials],
  );
  const contextParagraphs = React.useMemo(
    () => chunkIntoParagraphs(mission.context, 2),
    [mission.context],
  );
  const reflectionQuestions = React.useMemo(
    () => splitQuestions(mission.reflection),
    [mission.reflection],
  );

  // Missão de dois eixos (D-053): etapa extra "Uso da IA" depois da
  // Produção; as seguintes andam uma posição.
  const twoAxes = Boolean(mission.axes);
  const TOTAL_STEPS = totalSteps(twoAxes);
  const S = {
    production: 6,
    aiEvidence: twoAxes ? 7 : -1,
    criteria: twoAxes ? 8 : 7,
    delivery: twoAxes ? 9 : 8,
    reflection: twoAxes ? 10 : 9,
  };
  const evidenceReady = !twoAxes || (work ? isAiEvidenceComplete(work.aiEvidence) : false);

  // Hipóteses registradas na Investigação, guardadas no topo do texto da
  // Produção (D-057) — só nas Missões com modelo de Relatório.
  const template = mission.productionTemplate;
  const evidenceCount = parsed.evidences.length;
  const hypotheses = template && work ? readHypotheses(work.production, evidenceCount) : null;

  const [step, setStep] = React.useState<number | null>(null);
  const [evidenceIndex, setEvidenceIndex] = React.useState(0);

  // Retomada inteligente: deriva a etapa inicial do StudentWork que já
  // existe — sem persistir nenhum dado novo (só decisão de apresentação).
  // Quem só registrou parte das hipóteses volta ao primeiro item sem
  // hipótese; quem já escreveu o relatório volta à Produção.
  React.useEffect(() => {
    if (step !== null || !work) return;
    if (recorded) setStep(S.reflection);
    else if (delivered) setStep(S.delivery);
    else if (hasReportContent(work.production, template)) setStep(S.production);
    else if (template && work.production.trim().length > 0) {
      const firstEmpty = readHypotheses(work.production, evidenceCount).findIndex((h) => !h.trim());
      if (firstEmpty === -1) setStep(S.production);
      else {
        setStep(4);
        setEvidenceIndex(firstEmpty + 1);
      }
    } else setStep(1);
  }, [step, work, delivered, recorded, template, evidenceCount, S.reflection, S.delivery, S.production]);

  if (step === null) return <FlowSkeleton />;

  const goTo = (next: number) => {
    setStep(Math.min(TOTAL_STEPS, Math.max(1, next)));
    setEvidenceIndex(0);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <MissionHeader
        missionNumber={mission.number}
        title={mission.title}
        step={step}
        totalSteps={TOTAL_STEPS}
        minutesRemaining={minutesRemainingFrom(step, twoAxes, mission.stepMinutes)}
      />

      <StepTransition stepKey={`${step}:${step === 4 ? evidenceIndex : 0}`}>
        {step === 1 && (
          <CoverStep
            mission={mission}
            totalMinutes={totalMissionMinutes(twoAxes, mission.stepMinutes)}
            onStart={() => {
              if (work && !work.startedAt) {
                update({ startedAt: new Date().toISOString() });
              }
              goTo(2);
            }}
          />
        )}

        {step === 2 && (
          <MissionStep eyebrow="Contexto" title="Antes de começar">
            <Card className="border-none bg-muted/30">
              <CardContent className="flex flex-col gap-4 py-5">
                {contextParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-foreground/90">
                    {paragraph}
                  </p>
                ))}
              </CardContent>
            </Card>
            <MissionNavigation onBack={() => goTo(1)} onNext={() => goTo(3)} />
          </MissionStep>
        )}

        {step === 3 && (
          <MissionStep
            eyebrow="Objetivo"
            title="O que você vai descobrir"
            description="É isso que guia toda a investigação desta missão."
          >
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex items-start gap-3 py-2">
                <Target className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-foreground/90">
                  {mission.objective}
                </p>
              </CardContent>
            </Card>
            {mission.axes ? (
              <>
                <p className="text-center text-xs text-muted-foreground">
                  Esta missão tem dois objetivos, avaliados separadamente pelo professor.
                </p>
                <AxesObjectives axes={mission.axes} />
              </>
            ) : null}
            <MissionNavigation onBack={() => goTo(2)} onNext={() => goTo(4)} />
          </MissionStep>
        )}

        {step === 4 && (
          <InvestigationStep
            parsed={parsed}
            hypothesisPrompt={mission.hypothesisPrompt}
            evidenceIndex={evidenceIndex}
            setEvidenceIndex={setEvidenceIndex}
            onBack={() => goTo(3)}
            onDone={() => goTo(5)}
            hypothesis={
              template && work && hypotheses && evidenceIndex > 0
                ? {
                    value: hypotheses[evidenceIndex - 1] ?? "",
                    onChange: (value) =>
                      update({
                        production: setHypothesis(work.production, evidenceIndex, value, evidenceCount, template),
                      }),
                    onBlur: flush,
                    readOnly: delivered || running("deliver"),
                    statusLabel: delivered
                      ? "Já entregue — reabra na etapa Entrega para editar."
                      : saveStatusLabel(saveStatusOf("production")),
                    statusError: !delivered && saveStatusOf("production") === "error",
                  }
                : undefined
            }
          />
        )}

        {step === 5 && (
          <MissionStep
            eyebrow="Comparação"
            title={`Reveja as ${parsed.evidences.length} evidências lado a lado`}
            description="Compare padrões antes de fechar sua conclusão."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {parsed.evidences.map((evidence) => (
                <EvidenceCard key={evidence.number} evidence={evidence} compact />
              ))}
            </div>
            <MissionNavigation onBack={() => goTo(4)} onNext={() => goTo(6)} />
          </MissionStep>
        )}

        {step === 6 && work && (
          <MissionStep
            eyebrow="Produção"
            title="Escreva seu Relatório de Auditoria"
            description={mission.studentProduction}
          >
            <Card>
              <CardContent className="py-2">
                <textarea
                  value={work.production}
                  onChange={(e) => update({ production: e.target.value })}
                  onBlur={flush}
                  readOnly={delivered || running("deliver")}
                  autoFocus={!delivered}
                  rows={12}
                  placeholder={
                    template
                      ? initialReport(evidenceCount, template)
                      : (mission.productionPlaceholder ?? "Escreva aqui a sua produção…")
                  }
                  className="w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:opacity-80"
                  aria-label="Texto do Relatório de Auditoria"
                />
                <p
                  role="status"
                  aria-live="polite"
                  className={`mt-2 text-xs ${!delivered && saveStatusOf("production") === "error" ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {delivered
                    ? "Já entregue — reabra na etapa Entrega para editar."
                    : saveStatusLabel(saveStatusOf("production"))}
                </p>
              </CardContent>
            </Card>
            <MissionNavigation onBack={() => goTo(5)} onNext={() => goTo(S.production + 1)} />
          </MissionStep>
        )}

        {step === S.aiEvidence && work && mission.axes && (
          <MissionStep
            eyebrow="Uso da IA"
            title="Registre como você usou a IA"
            description={`Este registro mostra ao professor a sua competência em IA — separada do conteúdo de ${mission.axes.discipline.component}.`}
          >
            <AiEvidenceForm
              axes={mission.axes}
              evidence={work.aiEvidence}
              readOnly={delivered}
              onChange={(next) => update({ aiEvidence: next })}
              onBlur={flush}
              statusLabel={
                delivered
                  ? "Já entregue — reabra na etapa Entrega para editar."
                  : saveStatusLabel(saveStatusOf("aiEvidence"))
              }
            />
            <MissionNavigation onBack={() => goTo(S.production)} onNext={() => goTo(S.criteria)} />
          </MissionStep>
        )}

        {step === S.criteria && (
          <MissionStep
            eyebrow="Critérios"
            title={mission.criteriaTitle ?? "Critérios de avaliação"}
            description="Confira seu relatório contra estes critérios antes de entregar."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {parsed.auditCriteria.map((entry, i) => (
                <RubricCard key={entry.label} entry={entry} index={i} />
              ))}
            </div>
            <MissionNavigation onBack={() => goTo(S.criteria - 1)} onNext={() => goTo(S.delivery)} />
          </MissionStep>
        )}

        {step === S.delivery && work && (
          <MissionStep eyebrow="Entrega" title="Pronto para entregar?">
            <Card className={delivered ? "border-chart-2/50" : undefined}>
              <CardContent className="flex flex-col gap-4 py-2">
                <div className="flex items-start gap-3">
                  <ClipboardList className="mt-0.5 size-5 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {mission.delivery}
                  </p>
                </div>
                {delivered ? (
                  <div className="flex items-center gap-3 rounded-xl border border-chart-2/50 bg-chart-2/10 p-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2/20 text-chart-2">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <div className="flex flex-col items-start gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        Entregue em {formatDate(work.productionDeliveredAt)}
                      </p>
                      {reviewed ? (
                        <span className="text-xs text-muted-foreground">
                          Avaliação concluída — entrega preservada.
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => update({ productionDeliveredAt: null })}
                          disabled={running("reopenProduction")}
                        >
                          <Undo2 className="size-4" />
                          {running("reopenProduction") ? "Reabrindo…" : "Reabrir para editar"}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={() =>
                      update({ productionDeliveredAt: new Date().toISOString() })
                    }
                    disabled={work.production.trim().length === 0 || !evidenceReady || running("deliver")}
                  >
                    <CheckCircle2 className="size-4" />
                    {running("deliver") ? "Entregando…" : "Entregar relatório"}
                  </Button>
                )}
                <TransitionError transition={transition} kinds={["deliver", "reopenProduction"]} />
                {!delivered && !evidenceReady ? (
                  <p className="text-xs text-muted-foreground">
                    Falta completar o registro de uso da IA (etapa anterior a Critérios).
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <MissionNavigation
              onBack={() => goTo(S.criteria)}
              onNext={() => goTo(S.reflection)}
              nextDisabled={!delivered}
              nextLabel="Ir para a Reflexão"
            />
          </MissionStep>
        )}

        {step === S.reflection && work && (
          <MissionStep
            eyebrow="Reflexão Final"
            title="O que essa investigação mudou em você?"
          >
            <div className="flex flex-col gap-2">
              {reflectionQuestions.map((question, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-chart-3/20 text-[11px] font-semibold text-chart-3">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {question}
                  </p>
                </div>
              ))}
            </div>

            <ReflectionCard
              prompt="Responda livremente, considerando as perguntas acima."
              value={work.reflection}
              onChange={(value) => update({ reflection: value })}
              onBlur={flush}
              saveStatus={saveStatusOf("reflection")}
              saveStatusLabel={saveStatusLabel(saveStatusOf("reflection"))}
              recording={running("record")}
              reopening={running("reopenReflection")}
              transitionError={<TransitionError transition={transition} kinds={["record", "reopenReflection"]} />}
              recorded={recorded}
              delivered={delivered}
              recordedAt={work.reflectionRecordedAt}
              onRecord={() =>
                update({ reflectionRecordedAt: new Date().toISOString() })
              }
              onReopen={() => update({ reflectionRecordedAt: null })}
            />

            {recorded ? (
              <div className="flex items-center gap-3 rounded-xl border border-chart-2/50 bg-chart-2/10 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2/20 text-chart-2">
                  <PartyPopper className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {reviewed ? "Missão avaliada" : "Entrega em avaliação"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {reviewed
                      ? "A devolutiva do Professor já está disponível abaixo."
                      : "Você entregou sua produção e reflexão. Agora o Professor fará a devolutiva."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <Link
                      href="/diario"
                      className="inline-flex items-center gap-1 text-xs font-medium text-chart-2 transition-colors hover:text-foreground"
                    >
                      Ver no Diário do Auditor
                      <ArrowRight className="size-3" />
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1 text-xs font-medium text-chart-2 transition-colors hover:text-foreground"
                    >
                      Voltar ao Dashboard
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            {work.review ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex flex-col gap-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <MessageSquareText className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Devolutiva do Professor</p>
                      <p className="text-xs text-muted-foreground">
                        {work.review.reviewerName} · {formatDate(work.review.reviewedAt)}
                      </p>
                    </div>
                    <Badge className="ml-auto bg-chart-2/15 text-chart-2">
                      {work.review.grade}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {work.review.feedback}
                  </p>
                  {mission.axes && work.review.axes ? (
                    <AxesReviewCards axes={mission.axes} review={work.review.axes} />
                  ) : null}
                  {work.review.observedCriteria.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Critérios observados
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {work.review.observedCriteria.map((criterion) => (
                          <li key={criterion} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-chart-2" />
                            {criterion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <MissionNavigation onBack={() => goTo(S.delivery)} hideNext />
          </MissionStep>
        )}
      </StepTransition>
    </div>
  );
}

function CoverStep({
  mission,
  totalMinutes,
  onStart,
}: {
  mission: Mission;
  totalMinutes: number;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-7 py-6 text-center">
      <div className="relative flex size-24 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-chart-2/20 blur-xl"
          aria-hidden="true"
        />
        <span className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-chart-2/20 text-primary">
          <Compass className="size-10" />
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {mission.module}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {mission.title}
        </h1>
        <p className="mx-auto max-w-md text-lg italic leading-relaxed text-chart-2">
          &ldquo;{mission.guidingQuestion}&rdquo;
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Clock className="size-3.5" />
        Tempo estimado: cerca de {totalMinutes} minutos de investigação
      </div>
      <div className="flex max-w-md flex-wrap justify-center gap-2">
        {mission.competencies.map((competency) => (
          <Badge key={competency} variant="outline" className="font-normal">
            {competency}
          </Badge>
        ))}
      </div>
      <Button size="lg" onClick={onStart}>
        Começar investigação
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/** Campo da hipótese de um item (D-057): grava no texto da Produção. */
interface HypothesisField {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  readOnly: boolean;
  statusLabel: string;
  statusError: boolean;
}

function InvestigationStep({
  parsed,
  hypothesisPrompt,
  evidenceIndex,
  setEvidenceIndex,
  onBack,
  onDone,
  hypothesis,
}: {
  parsed: ReturnType<typeof parseMissionContent>;
  hypothesisPrompt?: string;
  evidenceIndex: number;
  setEvidenceIndex: (i: number) => void;
  onBack: () => void;
  onDone: () => void;
  hypothesis?: HypothesisField;
}) {
  // 0 = introdução com o Guia de Investigação; 1..N = uma evidência por tela.
  const isIntro = evidenceIndex === 0;
  const evidence = parsed.evidences[evidenceIndex - 1];

  if (isIntro) {
    return (
      <MissionStep
        eyebrow="Investigação"
        title="Como examinar cada pista"
        description={`Use estes ${parsed.investigationGuide.length} filtros para investigar os itens do Dossiê.`}
      >
        <InvestigationGuideStepper
          entries={parsed.investigationGuide}
          onBack={onBack}
          onComplete={() => setEvidenceIndex(1)}
        />
      </MissionStep>
    );
  }

  return (
    <MissionStep
      eyebrow={`Investigação · Item ${evidenceIndex} de ${parsed.evidences.length}`}
      title="Registre sua primeira impressão"
    >
      <EvidenceCard
        evidence={evidence}
        prompt={
          hypothesisPrompt ??
          "Antes de aplicar o guia: anote sua hipótese sobre este item — você vai usá-la no Relatório."
        }
      />
      {hypothesis ? (
        <Card>
          <CardContent className="py-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Sua hipótese sobre o item {evidenceIndex}
              <input
                value={hypothesis.value}
                onChange={(e) => hypothesis.onChange(e.target.value)}
                onBlur={hypothesis.onBlur}
                readOnly={hypothesis.readOnly}
                maxLength={300}
                placeholder="Uma frase: parece confiável ou suspeito, e por quê?"
                className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:opacity-80"
              />
            </label>
            <p
              role="status"
              aria-live="polite"
              className={`mt-2 text-xs ${hypothesis.statusError ? "text-destructive" : "text-muted-foreground"}`}
            >
              {hypothesis.statusLabel}
            </p>
          </CardContent>
        </Card>
      ) : null}
      <MissionNavigation
        onBack={() =>
          evidenceIndex === 1 ? setEvidenceIndex(0) : setEvidenceIndex(evidenceIndex - 1)
        }
        onNext={() =>
          evidenceIndex === parsed.evidences.length
            ? onDone()
            : setEvidenceIndex(evidenceIndex + 1)
        }
        nextLabel={
          evidenceIndex === parsed.evidences.length ? "Comparar tudo" : "Próxima evidência"
        }
      />
    </MissionStep>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const TRANSITION_ERROR: Record<TransitionKind, Record<"text" | "action", string>> = {
  deliver: {
    text: "A entrega não foi feita: a última versão do seu relatório ainda não foi salva. Seu texto continua aqui — verifique a conexão e clique em “Entregar relatório” de novo.",
    action: "Não foi possível entregar agora. Seu relatório continua salvo como rascunho — verifique a conexão e clique em “Entregar relatório” de novo.",
  },
  reopenProduction: {
    text: "Não foi possível reabrir agora. Sua entrega continua registrada — tente de novo.",
    action: "Não foi possível reabrir agora. Sua entrega continua registrada — tente de novo.",
  },
  record: {
    text: "A reflexão não foi registrada: a última versão do texto ainda não foi salva. Seu texto continua aqui — verifique a conexão e clique em “Registrar reflexão” de novo.",
    action: "Não foi possível registrar a reflexão agora. Seu texto continua aqui como rascunho — verifique a conexão e clique em “Registrar reflexão” de novo.",
  },
  reopenReflection: {
    text: "Não foi possível reabrir agora. Sua reflexão continua registrada — tente de novo.",
    action: "Não foi possível reabrir agora. Sua reflexão continua registrada — tente de novo.",
  },
};

/** Falha de entregar/registrar/reabrir: nada mudou no servidor; o botão permite tentar de novo. */
function TransitionError({ transition, kinds }: { transition: Transition | null; kinds: TransitionKind[] }) {
  if (!transition || transition.status !== "error" || !kinds.includes(transition.kind)) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {TRANSITION_ERROR[transition.kind][transition.reason]}
    </p>
  );
}

/**
 * Nunca anuncia sucesso antes da confirmação do servidor (modo real, M22):
 * "Salvo" só depois que o servidor confirmou a versão mais recente do texto.
 */
function saveStatusLabel(status: WorkSaveStatus): string {
  if (status === "pending") return "Alterações ainda não salvas…";
  if (status === "saving") return "Salvando…";
  if (status === "saved") return "Salvo.";
  if (status === "error") {
    return "Não foi possível salvar. Seu texto continua aqui — não feche a página; verifique a conexão e clique fora do campo (ou continue escrevendo) para tentar de novo.";
  }
  return "Seu texto será salvo automaticamente enquanto você escreve.";
}

function FlowSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando a missão"
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="flex flex-col items-center gap-6 py-6">
        <Skeleton className="size-16 rounded-2xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-80" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}
