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
  Target,
  Undo2,
} from "lucide-react";

import type { Mission } from "@/modules/library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { MissionHeader } from "./mission-header";
import { MissionStep } from "./mission-step";
import { MissionNavigation } from "./mission-navigation";
import { EvidenceCard } from "./evidence-card";
import { RubricCard } from "./rubric-card";
import { ReflectionCard } from "./reflection-card";
import { StepTransition } from "./step-transition";
import {
  chunkIntoParagraphs,
  parseMissionContent,
  splitQuestions,
} from "./parse-mission-content";
import { minutesRemainingFrom, TOTAL_MISSION_MINUTES } from "./mission-timing";
import { useStudentWork } from "./use-student-work";

const TOTAL_STEPS = 9;

/**
 * Mission Flow — a Missão como investigação guiada, não como
 * formulário dividido em etapas (docs/MISSION_STUDIO.md continua
 * sendo a autoria; isto é a experiência de quem investiga). Ver
 * decisões em DECISIONS.md D-027 e o refinamento cognitivo da
 * Sprint M09.
 */
export function MissionFlow({ mission }: { mission: Mission }) {
  const { work, update, delivered, recorded } = useStudentWork(mission.id);
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

  const [step, setStep] = React.useState<number | null>(null);
  const [evidenceIndex, setEvidenceIndex] = React.useState(0);

  // Retomada inteligente: deriva a etapa inicial do StudentWork que já
  // existe — sem persistir nenhum dado novo (só decisão de apresentação).
  React.useEffect(() => {
    if (step !== null || !work) return;
    if (recorded) setStep(9);
    else if (delivered) setStep(8);
    else if (work.production.trim().length > 0) setStep(6);
    else setStep(1);
  }, [step, work, delivered, recorded]);

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
        minutesRemaining={minutesRemainingFrom(step)}
      />

      <StepTransition stepKey={`${step}:${step === 4 ? evidenceIndex : 0}`}>
        {step === 1 && (
          <CoverStep
            mission={mission}
            totalMinutes={TOTAL_MISSION_MINUTES}
            onStart={() => goTo(2)}
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
            <MissionNavigation onBack={() => goTo(2)} onNext={() => goTo(4)} />
          </MissionStep>
        )}

        {step === 4 && (
          <InvestigationStep
            parsed={parsed}
            evidenceIndex={evidenceIndex}
            setEvidenceIndex={setEvidenceIndex}
            onBack={() => goTo(3)}
            onDone={() => goTo(5)}
          />
        )}

        {step === 5 && (
          <MissionStep
            eyebrow="Comparação"
            title="Reveja as 4 evidências lado a lado"
            description="Compare padrões antes de fechar seu veredito."
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
                  readOnly={delivered}
                  autoFocus={!delivered}
                  rows={12}
                  placeholder={
                    "a) Vereditos das 4 manchetes, com evidências…\n" +
                    "b) A manchete falsa que você gerou…\n" +
                    "c) Por que ela engana — e o que a denuncia…"
                  }
                  className="w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:opacity-80"
                  aria-label="Texto do Relatório de Auditoria"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {delivered
                    ? "Já entregue — reabra na etapa Entrega para editar."
                    : "Salvo automaticamente enquanto você escreve."}
                </p>
              </CardContent>
            </Card>
            <MissionNavigation onBack={() => goTo(5)} onNext={() => goTo(7)} />
          </MissionStep>
        )}

        {step === 7 && (
          <MissionStep
            eyebrow="Critérios"
            title="O que torna um veredito válido"
            description="Confira seu relatório contra estes critérios antes de entregar."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {parsed.auditCriteria.map((entry, i) => (
                <RubricCard key={entry.label} entry={entry} index={i} />
              ))}
            </div>
            <MissionNavigation onBack={() => goTo(6)} onNext={() => goTo(8)} />
          </MissionStep>
        )}

        {step === 8 && work && (
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => update({ productionDeliveredAt: null })}
                      >
                        <Undo2 className="size-4" />
                        Reabrir para editar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={() =>
                      update({ productionDeliveredAt: new Date().toISOString() })
                    }
                    disabled={work.production.trim().length === 0}
                  >
                    <CheckCircle2 className="size-4" />
                    Entregar relatório
                  </Button>
                )}
              </CardContent>
            </Card>
            <MissionNavigation
              onBack={() => goTo(7)}
              onNext={() => goTo(9)}
              nextDisabled={!delivered}
              nextLabel="Ir para a Reflexão"
            />
          </MissionStep>
        )}

        {step === 9 && work && (
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
                    Investigação concluída
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Você entregou sua produção e registrou sua reflexão. Missão
                    auditada.
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

            <MissionNavigation onBack={() => goTo(8)} hideNext />
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
        Cerca de {totalMinutes} minutos de investigação
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

function InvestigationStep({
  parsed,
  evidenceIndex,
  setEvidenceIndex,
  onBack,
  onDone,
}: {
  parsed: ReturnType<typeof parseMissionContent>;
  evidenceIndex: number;
  setEvidenceIndex: (i: number) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  // 0 = introdução com o Guia de Investigação; 1..N = uma evidência por tela.
  const isIntro = evidenceIndex === 0;
  const evidence = parsed.evidences[evidenceIndex - 1];

  if (isIntro) {
    return (
      <MissionStep
        eyebrow="Investigação"
        title="Como examinar cada pista"
        description="Aplique estes 5 filtros a cada item do Dossiê que vem a seguir."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {parsed.investigationGuide.map((entry, i) => (
            <RubricCard key={entry.label} entry={entry} index={i} />
          ))}
        </div>
        <MissionNavigation
          onBack={onBack}
          onNext={() => setEvidenceIndex(1)}
          nextLabel="Ver o Dossiê"
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
        prompt="Antes de aplicar o guia: essa manchete parece real ou fabricada, e por quê? Anote sua hipótese — você vai usá-la no Relatório."
      />
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
