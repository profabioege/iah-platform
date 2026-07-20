"use client";

import * as React from "react";

import {
  emptyStudentWork,
  getStudentSubmissionStatus,
  isMissionCompleted,
  isProductionDelivered,
  isReflectionRecorded,
  loadStudentWork,
  saveStudentWork,
  type StudentWork,
  type StudentWorkScope,
} from "@/modules/classroom";

import {
  saveProductionDraftAction,
  saveReflectionDraftAction,
  setProductionDeliveredAction,
  setReflectionRecordedAction,
  startMissionAction,
} from "./actions";

/** Fonte do trabalho do aluno: banco real (M22) ou dispositivo (demonstração). */
export type StudentWorkSource =
  | { kind: "real"; initialWork: StudentWork }
  | { kind: "demo"; scope: StudentWorkScope | null };

export type WorkSaveStatus = "idle" | "saving" | "saved" | "error";

const DRAFT_DEBOUNCE_MS = 800;

/**
 * Mesmo StudentWork de sempre — só extraído para hook para ser
 * compartilhado pelas etapas Produção, Critérios, Entrega e Reflexão do
 * Mission Flow, sem duplicar a lógica de carregar/salvar.
 *
 * Modo REAL (M22): cada transição explícita (iniciar, entregar, reabrir,
 * registrar reflexão) é uma Server Action imediata; o texto da Produção/
 * Reflexão usa autosave otimista com debounce — a textarea nunca trava
 * esperando a rede, mas nada é considerado salvo antes da confirmação do
 * servidor (`saveStatus`). `flush()` força o envio pendente (chamado no
 * blur das textareas) para nunca perder as últimas teclas digitadas.
 */
export function useStudentWork(source: StudentWorkSource, missionId: string) {
  const [work, setWork] = React.useState<StudentWork | null>(
    source.kind === "real" ? source.initialWork : null,
  );
  const [saveStatus, setSaveStatus] = React.useState<WorkSaveStatus>("idle");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = React.useRef<
    { field: "production" | "reflection"; value: string } | null
  >(null);

  React.useEffect(() => {
    if (source.kind === "real") {
      setWork(source.initialWork);
      return;
    }
    setWork(source.scope ? loadStudentWork(source.scope, missionId) : emptyStudentWork(missionId));
  }, [source, missionId]);

  const persistReal = React.useCallback(async (action: () => Promise<StudentWork>) => {
    setSaveStatus("saving");
    try {
      const result = await action();
      setWork(result);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, []);

  /**
   * Envia o rascunho pendente AGORA (chamado no blur das textareas e antes
   * de qualquer transição discreta — entregar/reabrir/registrar). Devolve
   * a promessa: quem chama entregar/registrar precisa aguardá-la antes de
   * disparar a própria ação, senão as duas gravações correm em paralelo e
   * a que perder a corrida pode sobrescrever o texto com uma versão velha
   * (exatamente o "perder trabalho do aluno" que a Sprint pede para evitar).
   */
  const flushPendingDraft = React.useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    await persistReal(() =>
      pending.field === "production"
        ? saveProductionDraftAction(missionId, pending.value)
        : saveReflectionDraftAction(missionId, pending.value),
    );
  }, [missionId, persistReal]);

  // Envia o rascunho pendente ao desmontar (ex.: navegação entre etapas
  // sem esperar o debounce) — melhor esforço, sem bloquear a saída.
  React.useEffect(() => {
    return () => {
      void flushPendingDraft();
    };
  }, [flushPendingDraft]);

  const scheduleDraftSave = React.useCallback(
    (field: "production" | "reflection", value: string) => {
      pendingRef.current = { field, value };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flushPendingDraft, DRAFT_DEBOUNCE_MS);
    },
    [flushPendingDraft],
  );

  const update = React.useCallback(
    (partial: Partial<StudentWork>) => {
      if (source.kind === "demo") {
        setWork((current) => {
          if (!current) return current;
          const next = { ...current, ...partial };
          return source.scope ? saveStudentWork(source.scope, next) : next;
        });
        return;
      }

      // Modo real: otimista primeiro (a textarea não trava), persiste depois.
      setWork((current) => (current ? { ...current, ...partial } : current));

      if ("startedAt" in partial) {
        void persistReal(() => startMissionAction(missionId));
        return;
      }
      if ("productionDeliveredAt" in partial) {
        const delivered = partial.productionDeliveredAt !== null;
        void (async () => {
          await flushPendingDraft();
          await persistReal(() => setProductionDeliveredAction(missionId, delivered));
        })();
        return;
      }
      if ("reflectionRecordedAt" in partial) {
        const recordedFlag = partial.reflectionRecordedAt !== null;
        void (async () => {
          await flushPendingDraft();
          await persistReal(() => setReflectionRecordedAction(missionId, recordedFlag));
        })();
        return;
      }
      if (typeof partial.production === "string") {
        scheduleDraftSave("production", partial.production);
        return;
      }
      if (typeof partial.reflection === "string") {
        scheduleDraftSave("reflection", partial.reflection);
        return;
      }
    },
    [source, missionId, persistReal, flushPendingDraft, scheduleDraftSave],
  );

  return {
    work,
    update,
    flush: flushPendingDraft,
    saveStatus: source.kind === "real" ? saveStatus : "idle",
    delivered: work ? isProductionDelivered(work) : false,
    recorded: work ? isReflectionRecorded(work) : false,
    completed: work ? isMissionCompleted(work) : false,
    submissionStatus: work ? getStudentSubmissionStatus(work) : "not_started",
  };
}
