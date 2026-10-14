/**
 * Diagnóstico por etapas e plano semanal (D-054) — entidades persistidas
 * na migration 0022.
 */

import type { PlanItemKind } from "./weekly-plan-rule";

export type DiagnosticStatus = "rascunho" | "publicado" | "encerrado";

export interface Diagnostic {
  id: string;
  institutionId: string;
  classroomId: string;
  title: string;
  gradeCode: "em1" | "em2" | "em3" | null;
  status: DiagnosticStatus;
  /** Calculado pelo banco: alguma questão de fonte sintética/demonstrativa. */
  demonstrative: boolean;
  /** Calculado pelo banco: alguma etapa ligada a planejamento provisório. */
  curriculumProvisional: boolean;
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface DiagnosticBlock {
  id: string;
  institutionId: string;
  diagnosticId: string;
  position: number;
  listId: string;
  skillId: string;
}

export interface StudyPlan {
  id: string;
  institutionId: string;
  classroomId: string;
  studentId: string;
  weekStart: string;
  availableDays: number[];
  minutesPerDay: number;
  ruleVersion: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PlanItemStatus = "planejada" | "concluida" | "adiada" | "removida";
export type PlanItemOrigin = "regra" | "aluno" | "professor";

export interface StudyPlanItem {
  id: string;
  institutionId: string;
  planId: string;
  studentId: string;
  classroomId: string;
  day: string;
  kind: PlanItemKind;
  refId: string | null;
  skillId: string | null;
  title: string;
  minutes: number;
  reason: string;
  rule: string;
  origin: PlanItemOrigin;
  status: PlanItemStatus;
  createdBy: string;
  updatedAt: string;
}

export type PlanEventAction =
  | "gerado"
  | "regerado"
  | "disponibilidade"
  | "concluido"
  | "adiado"
  | "reagendado"
  | "removido"
  | "adicionado"
  | "reaberto";

export interface StudyPlanEvent {
  id: string;
  institutionId: string;
  planId: string;
  itemId: string | null;
  studentId: string;
  classroomId: string;
  action: PlanEventAction;
  fromDay: string | null;
  toDay: string | null;
  note: string;
  actorUserId: string;
  actorRole: "aluno" | "professor";
  createdAt: string;
}

export const PLAN_ITEM_STATUS_LABEL: Record<PlanItemStatus, string> = {
  planejada: "Planejada",
  concluida: "Concluída",
  adiada: "Adiada",
  removida: "Removida",
};

export const PLAN_EVENT_LABEL: Record<PlanEventAction, string> = {
  gerado: "Plano gerado",
  regerado: "Plano refeito com nova disponibilidade",
  disponibilidade: "Disponibilidade alterada",
  concluido: "Concluída",
  adiado: "Adiada para outra semana",
  reagendado: "Reagendada",
  removido: "Removida",
  adicionado: "Adicionada",
  reaberto: "Reaberta",
};

export interface StudyRepositories {
  // Diagnóstico
  listDiagnostics(classroomIds: string[], status?: DiagnosticStatus[]): Promise<Diagnostic[]>;
  getDiagnostic(id: string): Promise<Diagnostic | null>;
  insertDiagnostic(input: Omit<Diagnostic, "status" | "demonstrative" | "curriculumProvisional" | "createdAt" | "publishedAt">): Promise<void>;
  setDiagnosticStatus(id: string, status: DiagnosticStatus): Promise<Diagnostic>;
  listBlocks(diagnosticIds: string[]): Promise<DiagnosticBlock[]>;
  insertBlocks(blocks: DiagnosticBlock[]): Promise<void>;
  getBlockByList(listId: string): Promise<DiagnosticBlock | null>;
  // Plano
  getPlan(studentId: string, classroomId: string, weekStart: string): Promise<StudyPlan | null>;
  getPlanById(planId: string): Promise<StudyPlan | null>;
  listPlans(classroomId: string, weekStart: string): Promise<StudyPlan[]>;
  insertPlan(plan: Omit<StudyPlan, "createdAt" | "updatedAt">): Promise<StudyPlan>;
  updatePlanAvailability(planId: string, availableDays: number[], minutesPerDay: number, ruleVersion: string): Promise<StudyPlan>;
  listPlanItems(planIds: string[]): Promise<StudyPlanItem[]>;
  getPlanItem(id: string): Promise<StudyPlanItem | null>;
  insertPlanItems(items: Array<Omit<StudyPlanItem, "updatedAt">>): Promise<void>;
  updatePlanItem(id: string, patch: Partial<Pick<StudyPlanItem, "day" | "status" | "minutes">>): Promise<StudyPlanItem>;
  insertPlanEvents(events: Array<Omit<StudyPlanEvent, "createdAt">>): Promise<void>;
  listPlanEvents(planId: string): Promise<StudyPlanEvent[]>;
}
