import type { QuestionBankActor } from "@/modules/question-bank/services/question-bank-service";

import type {
  PlanEventAction,
  StudyPlan,
  StudyPlanEvent,
  StudyPlanItem,
  StudyRepositories,
} from "../domain/entities";
import {
  addDays,
  buildWeeklyPlanProposal,
  isoWeekday,
  minutesByDay,
  mondayOf,
  PLAN_RULE_VERSION,
  validateAvailability,
  type WeeklyPlanInput,
  type WeeklyPlanProposal,
} from "../domain/weekly-plan-rule";

/**
 * Plano semanal (D-054). O aluno informa dias e minutos; a regra
 * `plano-v1` propõe; aluno e professor ajustam. Toda alteração vira um
 * registro no histórico (`study_plan_events`, só inserção) e o banco
 * recusa qualquer dia acima dos minutos informados (0022).
 *
 * O contexto da regra (planejamento, diagnóstico, pendências, circuito)
 * é montado pela infraestrutura e entra pronto: o serviço é testável com
 * repositórios em memória.
 */

export type PlanContext = Omit<WeeklyPlanInput, "weekStart" | "today" | "availability">;

export interface PlanView {
  plan: StudyPlan;
  items: StudyPlanItem[];
  events: StudyPlanEvent[];
  usedByDay: Record<string, number>;
}

function requireRole(actor: QuestionBankActor, roles: QuestionBankActor["role"][], message: string) {
  if (!roles.includes(actor.role)) throw new Error(message);
}

const newId = () => crypto.randomUUID();
const sameActivity = (a: { kind: string; refId: string | null; skillId: string | null }, b: typeof a) =>
  a.kind === b.kind && (a.refId ?? "") === (b.refId ?? "") && (a.skillId ?? "") === (b.skillId ?? "");

export function createStudyPlanService(study: StudyRepositories, actor: QuestionBankActor) {
  const actorRole = (): "aluno" | "professor" => {
    if (actor.role === "aluno") return "aluno";
    if (actor.role === "professor") return "professor";
    throw new Error("Apenas o aluno e o professor da turma ajustam o plano.");
  };

  async function view(plan: StudyPlan): Promise<PlanView> {
    const [items, events] = await Promise.all([study.listPlanItems([plan.id]), study.listPlanEvents(plan.id)]);
    return { plan, items, events, usedByDay: Object.fromEntries(minutesByDay(items)) };
  }

  async function record(
    plan: StudyPlan,
    action: PlanEventAction,
    extra: { itemId?: string | null; fromDay?: string | null; toDay?: string | null; note?: string } = {},
  ) {
    await study.insertPlanEvents([
      {
        id: newId(),
        institutionId: plan.institutionId,
        planId: plan.id,
        itemId: extra.itemId ?? null,
        studentId: plan.studentId,
        classroomId: plan.classroomId,
        action,
        fromDay: extra.fromDay ?? null,
        toDay: extra.toDay ?? null,
        note: (extra.note ?? "").slice(0, 600),
        actorUserId: actor.userId,
        actorRole: actorRole(),
      },
    ]);
  }

  async function itemOf(itemId: string): Promise<{ plan: StudyPlan; item: StudyPlanItem }> {
    // A RLS só devolve itens e planos que o ator alcança.
    const item = await study.getPlanItem(itemId);
    const plan = item ? await study.getPlanById(item.planId) : null;
    if (!plan || !item) throw new Error("Atividade não encontrada ou fora do seu alcance.");
    return { plan, item };
  }

  function checkDay(plan: StudyPlan, items: StudyPlanItem[], day: string, minutes: number, ignoreId?: string, today?: string) {
    if (day < plan.weekStart || day > addDays(plan.weekStart, 6)) throw new Error("Dia fora da semana do plano.");
    if (today && day < today) throw new Error("Escolha hoje ou um dia à frente.");
    if (!plan.availableDays.includes(isoWeekday(day))) throw new Error("Esse dia não está entre os disponíveis.");
    const used = minutesByDay(items.filter((i) => i.id !== ignoreId)).get(day) ?? 0;
    if (used + minutes > plan.minutesPerDay) {
      throw new Error(`Não cabe: o dia já tem ${used} de ${plan.minutesPerDay} minutos ocupados.`);
    }
  }

  const service = {
    weekOf: (today: string) => mondayOf(today),

    /** Plano do aluno na semana de `today` (ou null). */
    async mine(classroomId: string, today: string): Promise<PlanView | null> {
      requireRole(actor, ["aluno"], "Apenas o aluno vê o próprio plano por aqui.");
      const plan = await study.getPlan(actor.studentId!, classroomId, mondayOf(today));
      return plan ? view(plan) : null;
    },

    async byId(planId: string): Promise<PlanView> {
      const plan = await study.getPlanById(planId);
      if (!plan) throw new Error("Plano não encontrado ou fora do seu alcance.");
      return view(plan);
    },

    /** Planos da turma na semana (professor/gestão). */
    async forClassroom(classroomId: string, today: string): Promise<PlanView[]> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe acompanha os planos da turma.");
      const plans = await study.listPlans(classroomId, mondayOf(today));
      return Promise.all(plans.map(view));
    },

    /** Só a proposta, sem gravar (prévia). */
    preview(context: PlanContext, availability: { days: number[]; minutesPerDay: number }, today: string): WeeklyPlanProposal {
      return buildWeeklyPlanProposal({ ...context, weekStart: mondayOf(today), today, availability });
    },

    /**
     * Gera (ou refaz) o plano da semana. Ao refazer: atividades PLANEJADAS
     * criadas pela REGRA saem (status "removida", com histórico); as
     * concluídas, as adiadas e as do aluno/professor ficam (as concluídas e
     * planejadas ocupam seus minutos); a nova proposta não repete nada que
     * já está no plano.
     */
    async generate(
      classroomId: string,
      context: PlanContext,
      availability: { days: number[]; minutesPerDay: number },
      today: string,
    ): Promise<{ view: PlanView; proposal: WeeklyPlanProposal }> {
      requireRole(actor, ["aluno"], "O plano é gerado pelo próprio aluno, com a disponibilidade dele.");
      const days = [...new Set(availability.days.map(Number))].sort((a, b) => a - b);
      const invalid = validateAvailability(days, Number(availability.minutesPerDay));
      if (invalid) throw new Error(invalid);
      const weekStart = mondayOf(today);
      let plan = await study.getPlan(actor.studentId!, classroomId, weekStart);
      let kept: StudyPlanItem[] = [];
      if (plan) {
        const current = await study.listPlanItems([plan.id]);
        // Confere antes de mexer: o que fica precisa caber na nova disponibilidade.
        const staying = current.filter((i) => !(i.origin === "regra" && i.status === "planejada") && i.status !== "removida");
        for (const i of staying.filter((x) => x.status === "planejada" || x.status === "concluida")) {
          if (!days.includes(isoWeekday(i.day))) {
            throw new Error(`"${i.title}" está num dia que deixaria de estar disponível; reagende-a antes.`);
          }
        }
        for (const [day, used] of minutesByDay(staying)) {
          if (used > availability.minutesPerDay) {
            throw new Error(`O dia ${day} já tem ${used} minutos de atividades que ficam; aumente os minutos ou reagende-as.`);
          }
        }
        for (const item of current.filter((i) => i.origin === "regra" && i.status === "planejada")) {
          await study.updatePlanItem(item.id, { status: "removida" });
          await record(plan, "removido", { itemId: item.id, fromDay: item.day, note: "Plano refeito com nova disponibilidade." });
        }
        kept = current.filter((i) => !(i.origin === "regra" && i.status === "planejada") && i.status !== "removida");
        plan = await study.updatePlanAvailability(plan.id, days, availability.minutesPerDay, PLAN_RULE_VERSION);
        await record(plan, "regerado", { note: `Dias ${days.join(",")}, ${availability.minutesPerDay} min/dia.` });
      } else {
        plan = await study.insertPlan({
          id: `plan:${newId()}`,
          institutionId: actor.institutionId,
          classroomId,
          studentId: actor.studentId!,
          weekStart,
          availableDays: days,
          minutesPerDay: availability.minutesPerDay,
          ruleVersion: PLAN_RULE_VERSION,
          createdBy: actor.userId,
        });
        await record(plan, "gerado", { note: `Dias ${days.join(",")}, ${availability.minutesPerDay} min/dia.` });
      }

      // Atividades já no plano (concluídas ou do aluno/professor) ocupam minutos
      // e não são propostas de novo.
      const proposal = buildWeeklyPlanProposal({
        ...context,
        weekStart,
        today,
        availability: { days, minutesPerDay: availability.minutesPerDay },
        existing: kept.map((i) => ({ day: i.day, minutes: i.minutes, status: i.status, kind: i.kind, refId: i.refId, skillId: i.skillId })),
      });
      const fresh = proposal.items.filter((p) => !kept.some((k) => sameActivity(k, p)));
      await study.insertPlanItems(
        fresh.map((p) => ({
          id: `item:${plan!.id}:${newId()}`,
          institutionId: plan!.institutionId,
          planId: plan!.id,
          studentId: plan!.studentId,
          classroomId: plan!.classroomId,
          day: p.day,
          kind: p.kind,
          refId: p.refId,
          skillId: p.skillId,
          title: p.title,
          minutes: p.minutes,
          reason: p.reason,
          rule: p.rule,
          origin: "regra",
          status: "planejada",
          createdBy: actor.userId,
        })),
      );
      return { view: await view(plan), proposal };
    },

    async complete(itemId: string): Promise<StudyPlanItem> {
      const { plan, item } = await itemOf(itemId);
      if (item.status === "concluida") return item;
      if (item.status !== "planejada") throw new Error("Só uma atividade planejada pode ser concluída.");
      const updated = await study.updatePlanItem(item.id, { status: "concluida" });
      await record(plan, "concluido", { itemId: item.id, fromDay: item.day });
      return updated;
    },

    async reopen(itemId: string): Promise<StudyPlanItem> {
      const { plan, item } = await itemOf(itemId);
      if (item.status !== "concluida") throw new Error("Só uma atividade concluída pode ser reaberta.");
      const updated = await study.updatePlanItem(item.id, { status: "planejada" });
      await record(plan, "reaberto", { itemId: item.id, fromDay: item.day });
      return updated;
    },

    /** Adiar = tirar desta semana (volta a ser considerada no próximo plano). */
    async postpone(itemId: string, note = ""): Promise<StudyPlanItem> {
      const { plan, item } = await itemOf(itemId);
      if (item.status !== "planejada") throw new Error("Só uma atividade planejada pode ser adiada.");
      const updated = await study.updatePlanItem(item.id, { status: "adiada" });
      await record(plan, "adiado", { itemId: item.id, fromDay: item.day, note });
      return updated;
    },

    /** Reagendar = outro dia disponível desta semana, dentro dos minutos do dia. */
    async reschedule(itemId: string, day: string, note = "", today?: string): Promise<StudyPlanItem> {
      const { plan, item } = await itemOf(itemId);
      if (item.status !== "planejada" && item.status !== "adiada") {
        throw new Error("Só uma atividade planejada ou adiada pode ser reagendada.");
      }
      const items = await study.listPlanItems([plan.id]);
      checkDay(plan, items, day, item.minutes, item.id, today);
      const updated = await study.updatePlanItem(item.id, { day, status: "planejada" });
      await record(plan, "reagendado", { itemId: item.id, fromDay: item.day, toDay: day, note });
      return updated;
    },

    async remove(itemId: string, note = ""): Promise<StudyPlanItem> {
      const { plan, item } = await itemOf(itemId);
      if (item.status === "removida") return item;
      const updated = await study.updatePlanItem(item.id, { status: "removida" });
      await record(plan, "removido", { itemId: item.id, fromDay: item.day, note });
      return updated;
    },

    /** Orientação do professor no plano do aluno (origem "professor"). */
    async addGuidance(
      planId: string,
      input: { day: string; title: string; minutes: number; reason: string },
      today?: string,
    ): Promise<StudyPlanItem> {
      requireRole(actor, ["professor"], "Apenas o professor da turma acrescenta orientações.");
      const plan = await study.getPlanById(planId);
      if (!plan) throw new Error("Plano não encontrado ou fora do seu alcance.");
      const title = input.title.trim();
      const reason = input.reason.trim();
      const minutes = Number(input.minutes);
      if (!title || !reason) throw new Error("Escreva a orientação e o motivo.");
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 120) throw new Error("Duração de 5 a 120 minutos.");
      const items = await study.listPlanItems([plan.id]);
      checkDay(plan, items, input.day, minutes, undefined, today);
      const id = `item:${plan.id}:${newId()}`;
      await study.insertPlanItems([
        {
          id,
          institutionId: plan.institutionId,
          planId: plan.id,
          studentId: plan.studentId,
          classroomId: plan.classroomId,
          day: input.day,
          kind: "orientacao",
          refId: null,
          skillId: null,
          title,
          minutes,
          reason,
          rule: "professor",
          origin: "professor",
          status: "planejada",
          createdBy: actor.userId,
        },
      ]);
      await record(plan, "adicionado", { itemId: id, toDay: input.day, note: title });
      return (await study.listPlanItems([plan.id])).find((i) => i.id === id)!;
    },
  };
  return service;
}

export type StudyPlanService = ReturnType<typeof createStudyPlanService>;
