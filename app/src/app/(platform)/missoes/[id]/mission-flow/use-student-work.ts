"use client";

import * as React from "react";

import {
  isMissionCompleted,
  isProductionDelivered,
  isReflectionRecorded,
  loadStudentWork,
  saveStudentWork,
  type StudentWork,
} from "@/modules/classroom";

/**
 * Mesmo StudentWork de sempre (localStorage, modules/classroom) — só
 * extraído para hook para ser compartilhado pelas etapas Produção,
 * Critérios, Entrega e Reflexão do Mission Flow, sem duplicar a lógica
 * de carregar/salvar que já existia em mission-workspace.tsx.
 */
export function useStudentWork(missionId: string) {
  const [work, setWork] = React.useState<StudentWork | null>(null);

  React.useEffect(() => {
    setWork(loadStudentWork(missionId));
  }, [missionId]);

  const update = React.useCallback((partial: Partial<StudentWork>) => {
    setWork((current) =>
      current ? saveStudentWork({ ...current, ...partial }) : current,
    );
  }, []);

  return {
    work,
    update,
    delivered: work ? isProductionDelivered(work) : false,
    recorded: work ? isReflectionRecorded(work) : false,
    completed: work ? isMissionCompleted(work) : false,
  };
}
