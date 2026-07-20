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

/**
 * Mesmo StudentWork de sempre (localStorage, modules/classroom) — só
 * extraído para hook para ser compartilhado pelas etapas Produção,
 * Critérios, Entrega e Reflexão do Mission Flow, sem duplicar a lógica
 * de carregar/salvar que já existia em mission-workspace.tsx.
 *
 * `scope` (Instituição + usuário do Institutional Workspace) isola o
 * armazenamento por aluno; sem sessão resolvida (ex.: Auth.js real, ainda
 * sem contexto institucional — ver docs/AUTHENTICATION.md), o trabalho
 * não é persistido, para nunca gravar sob uma identidade desconhecida.
 */
export function useStudentWork(scope: StudentWorkScope | null, missionId: string) {
  const [work, setWork] = React.useState<StudentWork | null>(null);

  React.useEffect(() => {
    setWork(scope ? loadStudentWork(scope, missionId) : emptyStudentWork(missionId));
  }, [scope, missionId]);

  const update = React.useCallback(
    (partial: Partial<StudentWork>) => {
      setWork((current) => {
        if (!current) return current;
        const next = { ...current, ...partial };
        return scope ? saveStudentWork(scope, next) : next;
      });
    },
    [scope],
  );

  return {
    work,
    update,
    delivered: work ? isProductionDelivered(work) : false,
    recorded: work ? isReflectionRecorded(work) : false,
    completed: work ? isMissionCompleted(work) : false,
    submissionStatus: work ? getStudentSubmissionStatus(work) : "not_started",
  };
}
