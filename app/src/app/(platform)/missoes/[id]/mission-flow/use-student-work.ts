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
  type AiUseEvidence,
  type StudentWork,
  type StudentWorkScope,
} from "@/modules/classroom";

import {
  saveAiEvidenceDraftAction,
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

/**
 * Estado do salvamento automático de UM campo de texto (modo real):
 * - `idle`: nada editado nesta visita — não afirma gravação;
 * - `pending`: há alteração local aguardando o debounce (ou um envio anterior);
 * - `saving`: a versão mais recente está a caminho do servidor;
 * - `saved`: o servidor confirmou a versão MAIS RECENTE do texto;
 * - `error`: a última gravação falhou — o texto continua no editor e será
 *   reenviado no próximo blur ou na próxima edição.
 */
export type WorkSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type DraftField = "production" | "reflection" | "aiEvidence";
type PendingDraft =
  | { field: "production" | "reflection"; value: string }
  | { field: "aiEvidence"; value: AiUseEvidence };

const DRAFT_FIELDS: readonly DraftField[] = ["production", "reflection", "aiEvidence"];
const IDLE_STATUS: Record<DraftField, WorkSaveStatus> = {
  production: "idle",
  reflection: "idle",
  aiEvidence: "idle",
};

const DRAFT_DEBOUNCE_MS = 800;

/** Ações finais do aluno, confirmadas pelo servidor antes de mudar a tela. */
export type TransitionKind = "deliver" | "reopenProduction" | "record" | "reopenReflection";
/**
 * `reason: "text"` — a versão mais recente do texto não foi confirmada, então
 * a ação nem foi enviada; `"action"` — o servidor não confirmou a ação.
 */
export type Transition =
  | { kind: TransitionKind; status: "running" }
  | { kind: TransitionKind; status: "error"; reason: "text" | "action" };

/**
 * Mesmo StudentWork de sempre — só extraído para hook para ser
 * compartilhado pelas etapas Produção, Critérios, Entrega e Reflexão do
 * Mission Flow, sem duplicar a lógica de carregar/salvar.
 *
 * Modo REAL (M22): cada transição explícita (iniciar, entregar, reabrir,
 * registrar reflexão) é uma Server Action imediata; o texto da Produção/
 * Reflexão usa autosave otimista com debounce — a textarea nunca trava
 * esperando a rede, mas nada é considerado salvo antes da confirmação do
 * servidor (`saveStatusOf`). `flush()` força o envio pendente (chamado no
 * blur das textareas) para nunca perder as últimas teclas digitadas.
 *
 * Toda gravação passa por UMA fila: a escrita mais nova é sempre a última
 * a chegar ao banco. Cada campo tem uma versão; a resposta de um envio só
 * marca "salvo" (e só substitui o texto do editor) se nenhuma edição
 * aconteceu depois daquele envio.
 */
export function useStudentWork(source: StudentWorkSource, missionId: string) {
  const [work, setWork] = React.useState<StudentWork | null>(
    source.kind === "real" ? source.initialWork : null,
  );
  const [fieldStatus, setFieldStatus] = React.useState<Record<DraftField, WorkSaveStatus>>(IDLE_STATUS);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = React.useRef<PendingDraft | null>(null);
  // Versão da edição local por campo × última versão confirmada pelo servidor.
  const versionRef = React.useRef<Record<DraftField, number>>({ production: 0, reflection: 0, aiEvidence: 0 });
  const confirmedRef = React.useRef<Record<DraftField, number>>({ production: 0, reflection: 0, aiEvidence: 0 });
  const queueRef = React.useRef<Promise<void>>(Promise.resolve());
  const [transition, setTransition] = React.useState<Transition | null>(null);
  const transitionRef = React.useRef<Transition | null>(null);

  const setStatus = React.useCallback((field: DraftField, status: WorkSaveStatus) => {
    setFieldStatus((current) => (current[field] === status ? current : { ...current, [field]: status }));
  }, []);

  React.useEffect(() => {
    if (source.kind === "real") {
      setWork(source.initialWork);
      return;
    }
    setWork(source.scope ? loadStudentWork(source.scope, missionId) : emptyStudentWork(missionId));
  }, [source, missionId]);

  /** Resultado do servidor sem apagar texto local que ainda não foi confirmado. */
  const applyServerWork = React.useCallback((result: StudentWork) => {
    setWork((current) => {
      if (!current) return result;
      const merged: StudentWork = { ...result };
      for (const field of DRAFT_FIELDS) {
        if (versionRef.current[field] !== confirmedRef.current[field]) {
          Object.assign(merged, { [field]: current[field] });
        }
      }
      return merged;
    });
  }, []);

  /** Coloca uma operação na fila única de gravações e devolve sua conclusão. */
  const enqueue = React.useCallback((task: () => Promise<void>) => {
    const next = queueRef.current.then(task, task);
    queueRef.current = next.catch(() => {});
    return next;
  }, []);

  const persistReal = React.useCallback(
    (action: () => Promise<StudentWork>) =>
      enqueue(async () => {
        try {
          applyServerWork(await action());
        } catch {
          // Só "Começar" passa por aqui (entregar/registrar/reabrir usam
          // `runTransition`): o estado otimista fica; nada é apagado do editor.
        }
      }),
    [enqueue, applyServerWork],
  );

  const saveDraft = React.useCallback(
    (draft: PendingDraft) =>
      enqueue(async () => {
        const version = versionRef.current[draft.field];
        setStatus(draft.field, "saving");
        try {
          const result =
            draft.field === "aiEvidence"
              ? await saveAiEvidenceDraftAction(missionId, draft.value)
              : draft.field === "production"
                ? await saveProductionDraftAction(missionId, draft.value)
                : await saveReflectionDraftAction(missionId, draft.value);
          const latest = versionRef.current[draft.field] === version;
          if (latest) confirmedRef.current[draft.field] = version;
          applyServerWork(result);
          // Houve edição depois deste envio: a versão nova ainda não foi
          // confirmada — continua pendente até a própria gravação dela.
          setStatus(draft.field, latest ? "saved" : "pending");
        } catch {
          if (versionRef.current[draft.field] === version) {
            // Nada mais novo: guarda para reenviar no próximo blur/edição.
            if (!pendingRef.current || pendingRef.current.field === draft.field) pendingRef.current = draft;
            setStatus(draft.field, "error");
          } else {
            setStatus(draft.field, "pending");
          }
        }
      }),
    [enqueue, applyServerWork, missionId, setStatus],
  );

  /**
   * Envia o rascunho pendente AGORA (chamado no blur das textareas e antes
   * de qualquer transição discreta — entregar/reabrir/registrar) e espera a
   * fila esvaziar. Devolve `true` só se o servidor confirmou a versão mais
   * recente de TODOS os campos: entregar/registrar não seguem sem isso, senão
   * o servidor registraria o texto antigo que está no banco.
   */
  const flushPendingDraft = React.useCallback(async (): Promise<boolean> => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) await saveDraft(pending);
    else await queueRef.current;
    // Um envio que estava em andamento pode ter falhado e voltado a pendente.
    const retry = pendingRef.current;
    if (retry) {
      pendingRef.current = null;
      await saveDraft(retry);
    }
    return DRAFT_FIELDS.every((field) => versionRef.current[field] === confirmedRef.current[field]);
  }, [saveDraft]);

  // Envia o rascunho pendente ao desmontar (ex.: navegação entre etapas
  // sem esperar o debounce) — melhor esforço, sem bloquear a saída.
  React.useEffect(() => {
    return () => {
      void flushPendingDraft();
    };
  }, [flushPendingDraft]);

  const scheduleDraftSave = React.useCallback(
    (pending: PendingDraft) => {
      // Um rascunho de OUTRO campo ainda pendente sai antes (sem esperar o
      // debounce), para nunca ser descartado pela troca de campo.
      const previous = pendingRef.current;
      if (previous && previous.field !== pending.field) {
        pendingRef.current = null;
        void saveDraft(previous);
      }
      versionRef.current[pending.field] += 1;
      setStatus(pending.field, "pending");
      pendingRef.current = pending;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flushPendingDraft, DRAFT_DEBOUNCE_MS);
    },
    [flushPendingDraft, saveDraft, setStatus],
  );

  /**
   * Entregar, registrar e reabrir: NÃO otimistas. A tela só muda de estado
   * depois que o servidor confirmou; até lá `transition` diz "em andamento"
   * e, se falhar, "erro" (o texto continua no editor e o botão permite tentar
   * de novo). Entregar/registrar exigem antes a confirmação da versão mais
   * recente do texto.
   */
  const runTransition = React.useCallback(
    async (kind: TransitionKind, requireSavedText: boolean, action: () => Promise<StudentWork>) => {
      if (transitionRef.current?.status === "running") return;
      const start = { kind, status: "running" as const };
      transitionRef.current = start;
      setTransition(start);
      const finish = (next: Transition | null) => {
        transitionRef.current = next;
        setTransition(next);
      };
      const saved = await flushPendingDraft();
      if (requireSavedText && !saved) {
        finish({ kind, status: "error", reason: "text" });
        return;
      }
      await enqueue(async () => {
        try {
          applyServerWork(await action());
          finish(null);
        } catch {
          finish({ kind, status: "error", reason: "action" });
        }
      });
    },
    [applyServerWork, enqueue, flushPendingDraft],
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

      if ("productionDeliveredAt" in partial) {
        const delivered = partial.productionDeliveredAt !== null;
        void runTransition(delivered ? "deliver" : "reopenProduction", delivered, () =>
          setProductionDeliveredAction(missionId, delivered),
        );
        return;
      }
      if ("reflectionRecordedAt" in partial) {
        const recordedFlag = partial.reflectionRecordedAt !== null;
        void runTransition(recordedFlag ? "record" : "reopenReflection", recordedFlag, () =>
          setReflectionRecordedAction(missionId, recordedFlag),
        );
        return;
      }

      // Texto e início: otimista primeiro (a textarea não trava), persiste depois.
      setWork((current) => (current ? { ...current, ...partial } : current));

      if ("startedAt" in partial) {
        void persistReal(() => startMissionAction(missionId));
        return;
      }
      if (typeof partial.production === "string") {
        scheduleDraftSave({ field: "production", value: partial.production });
        return;
      }
      if (typeof partial.reflection === "string") {
        scheduleDraftSave({ field: "reflection", value: partial.reflection });
        return;
      }
      if (partial.aiEvidence) {
        scheduleDraftSave({ field: "aiEvidence", value: partial.aiEvidence });
        return;
      }
    },
    [source, missionId, persistReal, runTransition, scheduleDraftSave],
  );

  const saveStatusOf = React.useCallback(
    (field: DraftField): WorkSaveStatus => (source.kind === "real" ? fieldStatus[field] : "idle"),
    [source.kind, fieldStatus],
  );

  return {
    work,
    update,
    flush: flushPendingDraft,
    saveStatusOf,
    transition: source.kind === "real" ? transition : null,
    delivered: work ? isProductionDelivered(work) : false,
    recorded: work ? isReflectionRecorded(work) : false,
    completed: work ? isMissionCompleted(work) : false,
    submissionStatus: work ? getStudentSubmissionStatus(work) : "not_started",
  };
}
