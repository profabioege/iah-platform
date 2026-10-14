/**
 * Diagnóstico e plano semanal DESTA requisição — só no modo real.
 *
 * Mesmo caminho do banco de questões: ator conferido no banco, JWT curto
 * no papel `iah_app`, RLS no caminho. Nenhum dado de escopo vem do
 * cliente.
 */

import { isAuthConfigured, getPlatformConfigError } from "@/lib/auth-flags";
import { createDatabaseQuestionBankRepositories } from "@/modules/question-bank/infrastructure/database-repositories";
import { createAdaptiveCircuitService } from "@/modules/question-bank/services/adaptive-circuit-service";
import {
  createQuestionBankService,
  type QuestionBankActor,
  type QuestionBankService,
} from "@/modules/question-bank/services/question-bank-service";

import { createDatabaseStudyRepositories } from "./database-repositories";
import { createDiagnosticService, type DiagnosticService } from "../services/diagnostic-service";
import { createStudyPlanService, type PlanContext, type StudyPlanService } from "../services/study-plan-service";

export class StudyUnavailableError extends Error {}

export interface StudyContext {
  actor: QuestionBankActor;
  bank: QuestionBankService;
  diagnostic: DiagnosticService;
  plan: StudyPlanService;
  /** Monta o contexto da regra do plano para o aluno da sessão. */
  planContextFor(classroomId: string): Promise<PlanContext>;
}

export async function getStudyContext(): Promise<StudyContext> {
  const configError = getPlatformConfigError();
  if (configError) throw new StudyUnavailableError(configError);
  if (!isAuthConfigured()) {
    throw new StudyUnavailableError("O diagnóstico e o plano estão disponíveis apenas na instalação com banco real.");
  }
  const { getDatabaseActor } = await import("@/modules/platform/infrastructure/database/request-actor");
  const { getScopedDatabaseClient } = await import("@/modules/platform/infrastructure/database/scoped-client");
  const actor = await getDatabaseActor();
  if (!actor) throw new Error("Sessão inválida ou expirada — entre novamente.");
  const db = await getScopedDatabaseClient(actor);
  const bankRepos = createDatabaseQuestionBankRepositories(db);
  const studyRepos = createDatabaseStudyRepositories(db);
  const bank = createQuestionBankService(bankRepos, actor);
  const circuit = createAdaptiveCircuitService(bankRepos, actor, bank);
  const diagnostic = createDiagnosticService(studyRepos, bankRepos, actor, bank);
  const plan = createStudyPlanService(studyRepos, actor);

  async function planContextFor(classroomId: string): Promise<PlanContext> {
    const [{ entries }, mine, myLists, myCircuit, pathways] = await Promise.all([
      bank.plannedSkillsForClassroom(classroomId),
      diagnostic.mine(),
      bank.myLists(),
      circuit.mine().catch(() => null),
      import("@/modules/pathways/infrastructure/load-pathways").then((m) => m.loadStudentPathways()),
    ]);
    const blockListIds = new Set(mine?.blocks.map((b) => b.listId) ?? []);
    const pending = myLists.filter(
      ({ list, attempt }) =>
        list.status === "publicada" && !blockListIds.has(list.id) && attempt?.status !== "entregue",
    );
    const skills = await bankRepos.listSkills([
      ...new Set(pending.map((p) => p.list.targetSkillId).filter((x): x is string => Boolean(x))),
    ]);
    const itemCounts = await bankRepos.listItemsForLists(pending.map((p) => p.list.id));
    const currentSkillId = myCircuit && myCircuit.circuit.status === "ativo" ? myCircuit.position.currentSkillId : null;
    const currentSkill = currentSkillId ? myCircuit!.sequence.find((s) => s.id === currentSkillId) : undefined;
    return {
      planProvisional: entries.some((e) => e.plan.status !== "approved"),
      plannedSkills: entries.map((e) => ({ skillId: e.skill.id, skillCode: e.skill.code })),
      diagnostic: mine
        ? {
            blocks: mine.evidence.skills.map((s) => ({
              listId: s.listId,
              skillId: s.skillId,
              skillCode: s.skillCode,
              position: s.position,
              questions: s.total,
              status: s.blockStatus,
              submittedAt: s.submittedAt,
              level: s.level,
              correct: s.correct,
              answered: s.correct + s.incorrect,
            })),
          }
        : null,
      pendingLists: pending.map(({ list }) => ({
        listId: list.id,
        title: list.title,
        skillId: list.targetSkillId,
        skillCode: skills.find((s) => s.id === list.targetSkillId)?.code ?? null,
        questions: itemCounts.filter((i) => i.listId === list.id).length,
      })),
      pendingMissions: (pathways?.pathways.ai.missions ?? [])
        .filter((m) => m.status === "nova" || m.status === "em_andamento")
        .map((m) => ({ missionId: m.id, number: m.number, title: m.title })),
      circuit: currentSkill ? { skillId: currentSkill.id, skillCode: currentSkill.code } : null,
    };
  }

  return { actor, bank, diagnostic, plan, planContextFor };
}
