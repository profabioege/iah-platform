"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createEmptyLessonPlanningBrief,
  type LessonPlanningBrief,
  type LessonPlanningStatus,
} from "@/modules/docentiah";

import { sendChatMessageAction } from "./actions";
import { CurriculumReviewStep } from "./planner-review-panels";
import { MaterialGenerationFlow } from "./planner-material-flow";
import { PlannerSummaryPanel } from "./planner-summary-panel";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

const STARTER_SUGGESTIONS = [
  "Criar aula de História",
  "Preparar aula de Matemática",
  "Criar atividade interdisciplinar",
  "Relacionar um conteúdo com IAH",
  "Adaptar para uma turma",
  "Criar material visual",
];

function newMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return { id: crypto.randomUUID(), role, text };
}

export function ConversationalPlanner({ institutionId, teacherId }: { institutionId: string; teacherId: string }) {
  const [status, setStatus] = React.useState<LessonPlanningStatus>("collecting_context");
  const [brief, setBrief] = React.useState<LessonPlanningBrief>(() => createEmptyLessonPlanningBrief(institutionId, teacherId));
  const [messages, setMessages] = React.useState<ChatMessage[]>([newMessage("assistant", "Que aula você precisa preparar?")]);
  const [inputValue, setInputValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [guidedOpen, setGuidedOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setMessages((prev) => [...prev, newMessage("user", trimmed)]);
    setInputValue("");
    setPending(true);
    setErrorMessage(null);
    const result = await sendChatMessageAction(trimmed, brief);
    setPending(false);
    if (result.error) {
      setErrorMessage(result.error);
      return;
    }
    const updatedBrief: LessonPlanningBrief = { ...brief, ...result.extractedFields };
    setBrief(updatedBrief);
    if (result.confirmationSummary) {
      setMessages((prev) => [...prev, newMessage("assistant", result.confirmationSummary as string)]);
      setStatus("awaiting_confirmation");
    } else if (result.nextQuestion) {
      setMessages((prev) => [...prev, newMessage("assistant", result.nextQuestion as string)]);
    }
  }

  function handleConfirm() {
    setMessages((prev) => [...prev, newMessage("user", "Confirmar")]);
    setStatus("curriculum_review");
  }

  function handleAdjust() {
    setMessages((prev) => [...prev, newMessage("assistant", "Sem problema — o que você quer ajustar?")]);
    setStatus("collecting_context");
  }

  async function handleGuidedComplete(fields: { subject: string; grade: string; topic: string }) {
    setGuidedOpen(false);
    // Reaproveita o mesmo extrator do chat livre — sintetiza uma frase a
    // partir das 3 respostas guiadas, para inferir educationLevel corretamente
    // (mesma lógica testada em lesson-brief-extractor.ts, sem duplicar regra).
    const synthesized = `Preciso de uma aula de ${fields.subject} para ${fields.grade} sobre ${fields.topic}.`;
    setMessages((prev) => [...prev, newMessage("user", `${fields.subject} · ${fields.grade} · ${fields.topic}`)]);
    setPending(true);
    const result = await sendChatMessageAction(synthesized, brief);
    setPending(false);
    if (result.error) {
      setErrorMessage(result.error);
      return;
    }
    const updatedBrief: LessonPlanningBrief = { ...brief, ...result.extractedFields };
    setBrief(updatedBrief);
    if (result.confirmationSummary) {
      setMessages((prev) => [...prev, newMessage("assistant", result.confirmationSummary as string)]);
      setStatus("awaiting_confirmation");
    } else if (result.nextQuestion) {
      setMessages((prev) => [...prev, newMessage("assistant", result.nextQuestion as string)]);
    }
  }

  function resetToNewPlan() {
    setBrief(createEmptyLessonPlanningBrief(institutionId, teacherId));
    setStatus("collecting_context");
    setMessages((prev) => [...prev, newMessage("assistant", "Certo — vamos começar uma nova aula. Que aula você precisa preparar?")]);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">DocentIAH</p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
            <Sparkles className="size-6 text-primary" aria-hidden />
            Planejador de aula
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Planeje sua aula com apoio inteligente, curricular e interdisciplinar.
          </p>
        </header>

        <div className="flex justify-end md:hidden">
          <PlannerSummaryPanel brief={brief} variant="mobile" />
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <div role="log" aria-live="polite" className="flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "assistant"
                      ? "max-w-[85%] whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
                      : "ml-auto max-w-[85%] whitespace-pre-line rounded-lg bg-primary/15 px-3 py-2 text-sm text-foreground"
                  }
                >
                  {message.text}
                </div>
              ))}
              {pending ? <div className="max-w-[60%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Analisando…</div> : null}
            </div>

            {status === "awaiting_confirmation" ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={handleConfirm}>
                  Confirmar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleAdjust}>
                  Ajustar
                </Button>
              </div>
            ) : null}

            {status === "collecting_context" ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitMessage(inputValue);
                }}
              >
                <label htmlFor="planner-chat-input" className="sr-only">
                  Descreva em uma frase o que você precisa
                </label>
                <textarea
                  id="planner-chat-input"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitMessage(inputValue);
                    }
                  }}
                  placeholder="Descreva em uma frase o que você precisa."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setGuidedOpen(true)}
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Ajude-me a começar
                  </button>
                  <Button type="submit" size="sm" disabled={!inputValue.trim() || pending}>
                    Enviar
                  </Button>
                </div>
                {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
              </form>
            ) : null}

            {status === "collecting_context" && messages.length <= 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {STARTER_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInputValue(suggestion)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {guidedOpen ? <GuidedStartFlow onComplete={handleGuidedComplete} onCancel={() => setGuidedOpen(false)} /> : null}

        {status === "curriculum_review" ? (
          <CurriculumReviewStep
            brief={brief}
            onBriefChange={setBrief}
            onContinue={() => setStatus("material_selection")}
          />
        ) : null}

        {status === "material_selection" || status === "generating" || status === "ready_for_review" ? (
          <MaterialGenerationFlow
            brief={brief}
            status={status}
            onStatusChange={setStatus}
            onSaved={() => setStatus("saved")}
          />
        ) : null}

        {status === "saved" ? (
          <Card className="border-primary/40">
            <CardContent className="flex flex-col gap-3 py-4">
              <p className="text-sm font-medium text-foreground">Rascunho salvo em Meus materiais.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={resetToNewPlan}>
                  Voltar ao chat
                </Button>
                <Link href="/professor/docente-iah/materiais" className={buttonVariants({ size: "sm" })}>
                  Ver Meus materiais
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {status === "cancelled" ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-3 py-4">
              <p className="text-sm text-muted-foreground">Planejamento cancelado.</p>
              <Button type="button" size="sm" variant="outline" onClick={resetToNewPlan}>
                Recomeçar
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="hidden w-72 shrink-0 md:block">
        <PlannerSummaryPanel brief={brief} variant="desktop" />
      </div>
    </div>
  );
}

function GuidedStartFlow({
  onComplete,
  onCancel,
}: {
  onComplete: (fields: { subject: string; grade: string; topic: string }) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [subject, setSubject] = React.useState("");
  const [grade, setGrade] = React.useState("");
  const [topic, setTopic] = React.useState("");

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-3 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Ajude-me a começar</p>
        {step === 1 ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-foreground" htmlFor="guided-subject">
              Disciplina ou área
            </label>
            <input
              id="guided-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="ex.: História"
              className="rounded-lg border border-input bg-background p-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="button" size="sm" disabled={!subject.trim()} onClick={() => setStep(2)}>
                Avançar
              </Button>
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-foreground" htmlFor="guided-grade">
              Ano ou série
            </label>
            <input
              id="guided-grade"
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder="ex.: 2ª série"
              className="rounded-lg border border-input bg-background p-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button type="button" size="sm" disabled={!grade.trim()} onClick={() => setStep(3)}>
                Avançar
              </Button>
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-foreground" htmlFor="guided-topic">
              Conteúdo
            </label>
            <input
              id="guided-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="ex.: Revolução Industrial"
              className="rounded-lg border border-input bg-background p-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button type="button" size="sm" disabled={!topic.trim()} onClick={() => onComplete({ subject, grade, topic })}>
                Concluir
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
