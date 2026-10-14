/**
 * Regra do PLANO SEMANAL (D-054) — função pura, versionada e verificável.
 *
 * Entradas: planejamento da escola (provisório ou não), evidências do
 * diagnóstico, atividades publicadas pelo professor e ainda pendentes,
 * revisões necessárias e a disponibilidade informada pelo aluno.
 *
 * Saída: uma proposta com o MOTIVO de cada atividade, que NUNCA passa dos
 * minutos informados para o dia (o banco confere de novo — 0022), e a
 * lista do que não coube, também com motivo.
 *
 * Prioridades (regra plano-v1), na ordem:
 *   R1  etapa pendente do diagnóstico (sem ela, o plano não tem evidência);
 *   R2  lista publicada pelo professor e não entregue;
 *   R3  Missão da Trilha IA & Humanidades atribuída e não entregue;
 *   R4  revisão das devolutivas de habilidade em "prioridade de estudo";
 *   R5  revisão das devolutivas de habilidade "em desenvolvimento";
 *   R6  prática com questões NOVAS no circuito (habilidade liberada pelo professor).
 *
 * Para não repetir questões sem finalidade: revisão = reler resolução e
 * devolutivas do que errou (não refazer a mesma questão); prática nova =
 * rodada do circuito, que o banco monta só com questões inéditas para o
 * aluno (0019). Espaçamento: a revisão de uma habilidade vem pelo menos
 * um dia depois da etapa entregue; a prática nova, pelo menos um dia
 * depois da revisão; nunca duas atividades da mesma habilidade no mesmo dia.
 */

export const PLAN_RULE_VERSION = "plano-v1";

export const PLAN_MINUTES = {
  diagnosticPerQuestion: 2,
  diagnosticMin: 8,
  listPerQuestion: 2,
  listMin: 10,
  listMax: 30,
  mission: 30,
  review: 10,
  circuit: 15,
} as const;

export const WEEKDAY_LABEL = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export type PlanItemKind = "diagnostico" | "lista" | "missao" | "revisao" | "circuito" | "orientacao";

export interface WeeklyPlanInput {
  /** Segunda-feira da semana (AAAA-MM-DD). */
  weekStart: string;
  /** Hoje (AAAA-MM-DD): nada é planejado para dias que já passaram. */
  today: string;
  availability: { days: number[]; minutesPerDay: number };
  planProvisional: boolean;
  plannedSkills: Array<{ skillId: string; skillCode: string }>;
  diagnostic: {
    blocks: Array<{
      listId: string;
      skillId: string;
      skillCode: string;
      position: number;
      questions: number;
      status: "nao_iniciada" | "em_andamento" | "entregue";
      submittedAt: string | null;
      level: "pendente" | "evidencia_insuficiente" | "prioridade_de_estudo" | "em_desenvolvimento" | "indicios_favoraveis";
      correct: number;
      answered: number;
    }>;
  } | null;
  pendingLists: Array<{ listId: string; title: string; skillId: string | null; skillCode: string | null; questions: number }>;
  pendingMissions: Array<{ missionId: string; number: number; title: string }>;
  circuit: { skillId: string; skillCode: string } | null;
  /**
   * Atividades que já estão no plano e ficam (concluídas, ou criadas pelo
   * aluno/professor): ocupam minutos e não são propostas de novo.
   */
  existing?: Array<{ day: string; minutes: number; status: string; kind: string; refId: string | null; skillId: string | null }>;
}

export interface ProposedItem {
  day: string;
  kind: PlanItemKind;
  refId: string | null;
  skillId: string | null;
  title: string;
  minutes: number;
  reason: string;
  rule: string;
}

export interface UnscheduledItem extends Omit<ProposedItem, "day"> {
  why: string;
}

export interface WeeklyPlanProposal {
  ruleVersion: string;
  days: string[];
  minutesPerDay: number;
  weeklyBudget: number;
  items: ProposedItem[];
  unscheduled: UnscheduledItem[];
  notes: string[];
}

// ---------------------------------------------------------------- datas
const toDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
export const addDays = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** 1 = segunda … 7 = domingo. */
export const isoWeekday = (iso: string) => {
  const w = toDate(iso).getUTCDay();
  return w === 0 ? 7 : w;
};
export const mondayOf = (iso: string) => addDays(iso, 1 - isoWeekday(iso));
const dayOf = (timestamp: string | null) => (timestamp ? timestamp.slice(0, 10) : null);
const maxIso = (...values: Array<string | null>) =>
  values.filter((v): v is string => Boolean(v)).sort().at(-1)!;

interface Candidate extends Omit<ProposedItem, "day"> {
  notBefore: string | null;
  /** Prática nova: só depois do dia em que a revisão desta habilidade foi marcada. */
  afterReviewOf: string | null;
}

export function validateAvailability(days: number[], minutesPerDay: number): string | null {
  const unique = [...new Set(days)];
  if (unique.length === 0) return "Escolha pelo menos um dia.";
  if (unique.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) return "Dia da semana inválido.";
  if (!Number.isInteger(minutesPerDay) || minutesPerDay < 10 || minutesPerDay > 240) {
    return "Informe de 10 a 240 minutos por dia.";
  }
  return null;
}

export function buildWeeklyPlanProposal(input: WeeklyPlanInput): WeeklyPlanProposal {
  const { weekStart, today, availability } = input;
  const invalid = validateAvailability(availability.days, availability.minutesPerDay);
  if (invalid) throw new Error(invalid);
  if (isoWeekday(weekStart) !== 1) throw new Error("A semana do plano começa na segunda-feira.");

  const budget = availability.minutesPerDay;
  const days = [...new Set(availability.days)].sort((a, b) => a - b).map((d) => addDays(weekStart, d - 1));
  const notes: string[] = [];
  if (input.planProvisional) {
    notes.push("O planejamento da escola usado aqui é PROVISÓRIO: as habilidades podem mudar quando a escola validar o planejamento real.");
  }

  const candidates: Candidate[] = [];
  const blocks = input.diagnostic?.blocks ?? [];

  // R1 — etapas pendentes do diagnóstico
  for (const b of blocks.filter((x) => x.status !== "entregue").sort((x, y) => x.position - y.position)) {
    candidates.push({
      kind: "diagnostico",
      refId: b.listId,
      skillId: b.skillId,
      title: `Diagnóstico · etapa ${b.position} (${b.skillCode})`,
      minutes: Math.max(PLAN_MINUTES.diagnosticMin, b.questions * PLAN_MINUTES.diagnosticPerQuestion),
      reason:
        (b.status === "em_andamento" ? "Etapa iniciada e salva: falta terminar. " : "") +
        `Concluir esta etapa dá ao plano evidência sobre ${b.skillCode}; sem ela, o plano usa só o planejamento da escola.`,
      rule: "R1",
      notBefore: null,
      afterReviewOf: null,
    });
  }

  // R2 — listas do professor pendentes
  for (const l of input.pendingLists) {
    candidates.push({
      kind: "lista",
      refId: l.listId,
      skillId: l.skillId,
      title: l.title,
      minutes: Math.min(PLAN_MINUTES.listMax, Math.max(PLAN_MINUTES.listMin, l.questions * PLAN_MINUTES.listPerQuestion)),
      reason: `Lista publicada pelo professor${l.skillCode ? ` (${l.skillCode})` : ""} e ainda não entregue.`,
      rule: "R2",
      notBefore: null,
      afterReviewOf: null,
    });
  }

  // R3 — Missões de IA pendentes
  for (const m of input.pendingMissions) {
    candidates.push({
      kind: "missao",
      refId: m.missionId,
      skillId: null,
      title: `Missão ${m.number} · ${m.title}`,
      minutes: PLAN_MINUTES.mission,
      reason: "Missão da Trilha IA & Humanidades atribuída à turma e ainda não entregue.",
      rule: "R3",
      notBefore: null,
      afterReviewOf: null,
    });
  }

  // R4 / R5 — revisões a partir do diagnóstico entregue
  const delivered = blocks.filter((b) => b.status === "entregue");
  for (const [level, rule] of [
    ["prioridade_de_estudo", "R4"],
    ["em_desenvolvimento", "R5"],
  ] as const) {
    for (const b of delivered.filter((x) => x.level === level)) {
      const after = dayOf(b.submittedAt);
      candidates.push({
        kind: "revisao",
        refId: b.listId,
        skillId: b.skillId,
        title: `Revisar devolutivas · ${b.skillCode}`,
        minutes: PLAN_MINUTES.review,
        reason:
          `No diagnóstico você acertou ${b.correct} de ${b.answered} em ${b.skillCode}. ` +
          "Releia a resolução e a devolutiva das questões que errou — sem refazer as mesmas questões.",
        rule,
        notBefore: after ? addDays(after, 1) : null,
        afterReviewOf: null,
      });
    }
  }

  // R6 — prática nova no circuito (questões inéditas), depois da revisão
  if (input.circuit) {
    const c = input.circuit;
    const evidence = delivered.find((b) => b.skillId === c.skillId);
    const needsReview = Boolean(evidence && (evidence.level === "prioridade_de_estudo" || evidence.level === "em_desenvolvimento"));
    candidates.push({
      kind: "circuito",
      refId: null,
      skillId: c.skillId,
      title: `Circuito · rodada de ${c.skillCode}`,
      minutes: PLAN_MINUTES.circuit,
      reason:
        `Prática com questões novas de ${c.skillCode}, habilidade liberada pelo professor no circuito ` +
        "(o circuito não repete questões que você já viu)" +
        (needsReview ? ", um dia depois da revisão das devolutivas." : "."),
      rule: "R6",
      notBefore: null,
      afterReviewOf: needsReview ? c.skillId : null,
    });
  }

  // Ordem de prioridade: R1, R2, R3, R4, R5, R6.
  const order = ["R1", "R2", "R3", "R4", "R5", "R6"];
  candidates.sort((a, b) => order.indexOf(a.rule) - order.indexOf(b.rule));

  // Alocação: primeiro dia disponível, a partir de hoje e do "não antes de",
  // com minutos livres e sem outra atividade da mesma habilidade no dia.
  const used = new Map(days.map((d) => [d, 0]));
  const skillsOnDay = new Map(days.map((d) => [d, new Set<string>()]));
  const existing = input.existing ?? [];
  for (const e of existing) {
    if (e.status !== "planejada" && e.status !== "concluida") continue;
    if (used.has(e.day)) used.set(e.day, used.get(e.day)! + e.minutes);
    if (e.skillId) skillsOnDay.get(e.day)?.add(e.skillId);
  }
  const alreadyPlanned = (c: Candidate) =>
    existing.some(
      (e) => e.kind === c.kind && (e.refId ?? "") === (c.refId ?? "") && (e.skillId ?? "") === (c.skillId ?? ""),
    );
  const items: ProposedItem[] = [];
  const unscheduled: UnscheduledItem[] = [];
  const reviewDay = new Map<string, string>();
  for (const c of candidates) {
    if (alreadyPlanned(c)) continue;
    const afterReview = c.afterReviewOf ? reviewDay.get(c.afterReviewOf) : undefined;
    const earliest = maxIso(weekStart, today, c.notBefore, afterReview ? addDays(afterReview, 1) : null);
    const day = days.find(
      (d) =>
        d >= earliest &&
        (used.get(d) ?? 0) + c.minutes <= budget &&
        !(c.skillId && skillsOnDay.get(d)?.has(c.skillId)),
    );
    const item = {
      kind: c.kind,
      refId: c.refId,
      skillId: c.skillId,
      title: c.title,
      minutes: c.minutes,
      reason: c.reason,
      rule: c.rule,
    };
    if (!day) {
      const tooLong = c.minutes > budget;
      unscheduled.push({
        ...item,
        why: tooLong
          ? `Precisa de ${c.minutes} min e o dia tem ${budget} min disponíveis.`
          : days.every((d) => d < earliest)
            ? "Só pode ser feita depois dos dias disponíveis desta semana (espaçamento ou dias já passados)."
            : "Não coube nos minutos informados para esta semana.",
      });
      continue;
    }
    used.set(day, (used.get(day) ?? 0) + c.minutes);
    if (c.skillId) skillsOnDay.get(day)!.add(c.skillId);
    if (c.kind === "revisao" && c.skillId) reviewDay.set(c.skillId, day);
    items.push({ day, ...item });
  }

  // Planejamento da escola: diz quais habilidades do período a semana
  // cobre e quais ficaram sem atividade (o professor pode acrescentar).
  if (input.plannedSkills.length) {
    const covered = new Set<string>([
      ...items.map((i) => i.skillId),
      ...existing.filter((e) => e.status === "planejada" || e.status === "concluida").map((e) => e.skillId),
    ].filter((x): x is string => Boolean(x)));
    const planned = [...new Map(input.plannedSkills.map((p) => [p.skillId, p.skillCode])).entries()];
    const without = planned.filter(([id]) => !covered.has(id)).map(([, code]) => code);
    notes.push(
      `Planejamento da escola neste período: ${planned.map(([, c]) => c).join(", ")}.` +
        (without.length ? ` Sem atividade nesta semana: ${without.join(", ")} — o professor pode acrescentar uma.` : " Todas têm atividade nesta semana."),
    );
  }

  const insufficient = delivered.filter((b) => b.level === "evidencia_insuficiente").map((b) => b.skillCode);
  if (insufficient.length) {
    notes.push(
      `Evidência insuficiente em ${insufficient.join(", ")}: nenhuma revisão foi proposta com base nisso. Converse com o professor.`,
    );
  }
  if (!input.diagnostic) {
    notes.push("Ainda não há diagnóstico publicado para a turma: o plano usa as atividades publicadas pelo professor.");
  }
  if (candidates.length === 0) {
    notes.push("Não há atividades pendentes para esta semana.");
  }

  return {
    ruleVersion: PLAN_RULE_VERSION,
    days,
    minutesPerDay: budget,
    weeklyBudget: budget * days.length,
    items: items.sort((a, b) => a.day.localeCompare(b.day)),
    unscheduled,
    notes,
  };
}

/** Minutos ocupados por dia (atividades planejadas ou concluídas). */
export function minutesByDay(items: Array<{ day: string; minutes: number; status: string }>): Map<string, number> {
  const out = new Map<string, number>();
  for (const i of items) {
    if (i.status !== "planejada" && i.status !== "concluida") continue;
    out.set(i.day, (out.get(i.day) ?? 0) + i.minutes);
  }
  return out;
}

/** Hoje (AAAA-MM-DD) no fuso da escola. */
export function todayIso(timeZone = "America/Sao_Paulo", now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "Seg 12/10" para tela. */
export function dayLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${WEEKDAY_LABEL[isoWeekday(iso)].slice(0, 3)} ${d}/${m}`;
}

/** Para onde a atividade do plano leva. */
export function activityHref(item: { kind: PlanItemKind; refId: string | null }): string | null {
  if (item.kind === "missao" && item.refId) return `/missoes/${encodeURIComponent(item.refId)}`;
  if (item.kind === "circuito") return "/dashboard/circuito";
  if ((item.kind === "diagnostico" || item.kind === "lista" || item.kind === "revisao") && item.refId) {
    return `/dashboard/listas/${encodeURIComponent(item.refId)}`;
  }
  return null;
}
