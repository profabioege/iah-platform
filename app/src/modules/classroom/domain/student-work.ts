/**
 * Trabalho do aluno em uma Missão (contexto Aprendizagem & Entrega).
 *
 * Registra a Produção do Aluno (bloco 8 da Missão) e a Reflexão no Diário
 * do Auditor (bloco 9). A aula é considerada concluída quando a produção
 * foi entregue E a reflexão foi registrada (bloco 10 — Entrega).
 *
 * Fase 1 do MVP: persistido no dispositivo (localStorage), um registro por
 * Missão. A futura sincronização com banco preservará este mesmo formato.
 */
export interface StudentWork {
  /** Missão a que o trabalho pertence. */
  missionId: string;

  /** Texto da Produção do Aluno (ex.: Relatório de Auditoria). */
  production: string;

  /** Momento da entrega da produção (ISO); null enquanto rascunho. */
  productionDeliveredAt: string | null;

  /** Texto da Reflexão registrada no Diário do Auditor. */
  reflection: string;

  /** Momento do registro da reflexão (ISO); null enquanto não registrada. */
  reflectionRecordedAt: string | null;

  /** Última modificação (ISO). */
  updatedAt: string;
}

/** Cria um trabalho vazio para uma Missão. */
export function emptyStudentWork(missionId: string): StudentWork {
  return {
    missionId,
    production: "",
    productionDeliveredAt: null,
    reflection: "",
    reflectionRecordedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

/** A produção foi entregue? */
export function isProductionDelivered(work: StudentWork): boolean {
  return work.productionDeliveredAt !== null;
}

/** A reflexão foi registrada no Diário? */
export function isReflectionRecorded(work: StudentWork): boolean {
  return work.reflectionRecordedAt !== null;
}

/** Critério de conclusão da aula (bloco 10): produção entregue + reflexão registrada. */
export function isMissionCompleted(work: StudentWork): boolean {
  return isProductionDelivered(work) && isReflectionRecorded(work);
}
