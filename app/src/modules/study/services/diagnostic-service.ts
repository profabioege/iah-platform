import type { ClassroomRef, CurriculumSkill, PracticeList, StudentRef } from "@/modules/question-bank/domain/entities";
import type { QuestionBankRepositories } from "@/modules/question-bank/domain/repositories";
import type {
  BankItem,
  QuestionBankActor,
  QuestionBankService,
} from "@/modules/question-bank/services/question-bank-service";

import {
  buildDiagnosticEvidence,
  DIAGNOSTIC_RULES,
  type DiagnosticBlockInput,
  type DiagnosticEvidence,
  type EvidenceLevel,
} from "../domain/diagnostic-evidence";
import type { Diagnostic, DiagnosticBlock, StudyRepositories } from "../domain/entities";

/**
 * Diagnóstico por etapas (D-054). Reaproveita o banco de questões: cada
 * etapa é uma lista `diagnostica` de UMA habilidade, montada só com
 * versões APROVADAS na revisão e com vínculo oficial ou confirmado por
 * revisão humana (sugestão de IA não revisada não entra).
 *
 * As marcas "demonstrativo" e "planejamento provisório" são calculadas
 * pelo banco (0022) e mostradas em toda tela do diagnóstico.
 */

/** Questões por etapa: curta o bastante para caber numa pausa, longa o bastante para não decidir com uma questão. */
export const QUESTIONS_PER_BLOCK = 4;

function requireRole(actor: QuestionBankActor, roles: QuestionBankActor["role"][], message: string) {
  if (!roles.includes(actor.role)) throw new Error(message);
}

const newId = () => crypto.randomUUID();

/** Pode entrar em diagnóstico: aprovada e com vínculo oficial ou confirmado. */
export function eligibleForDiagnostic(item: BankItem): boolean {
  return item.version.status === "aprovada" && (item.link.kind === "oficial" || item.link.kind === "confirmada");
}

export interface SkillCandidate {
  skill: CurriculumSkill;
  componentId: string;
  componentName: string;
  planProvisional: boolean;
  eligible: number;
  synthetic: number;
  enough: boolean;
}

export interface DiagnosticWithBlocks {
  diagnostic: Diagnostic;
  blocks: Array<DiagnosticBlock & { skill: CurriculumSkill | null; list: PracticeList | null; questions: number }>;
}

export interface StudentDiagnosticView extends DiagnosticWithBlocks {
  evidence: DiagnosticEvidence;
}

export interface ClassroomDiagnosticView extends DiagnosticWithBlocks {
  classroom: ClassroomRef;
  students: Array<{ student: StudentRef; evidence: DiagnosticEvidence }>;
  /** Por habilidade: quantos alunos em cada leitura. */
  bySkill: Array<{ skillId: string; skillCode: string; counts: Record<EvidenceLevel, number> }>;
}

export function createDiagnosticService(
  study: StudyRepositories,
  bank: QuestionBankRepositories,
  actor: QuestionBankActor,
  bankService: QuestionBankService,
) {
  async function withBlocks(diagnostic: Diagnostic): Promise<DiagnosticWithBlocks> {
    const blocks = await study.listBlocks([diagnostic.id]);
    const [skills, lists, items] = await Promise.all([
      bank.listSkills([...new Set(blocks.map((b) => b.skillId))]),
      Promise.all(blocks.map((b) => bank.getList(b.listId))),
      bank.listItemsForLists(blocks.map((b) => b.listId)),
    ]);
    return {
      diagnostic,
      blocks: blocks.map((b, i) => ({
        ...b,
        skill: skills.find((s) => s.id === b.skillId) ?? null,
        list: lists[i],
        questions: items.filter((it) => it.listId === b.listId).length,
      })),
    };
  }

  async function evidenceOf(
    view: DiagnosticWithBlocks,
    studentId: string,
    attemptsByList: Map<string, Awaited<ReturnType<QuestionBankRepositories["getAttempt"]>>>,
    answersByAttempt: Map<string, Array<{ listItemId: string; isCorrect: boolean | null }>>,
    itemsByList: Map<string, string[]>,
  ): Promise<DiagnosticEvidence> {
    const inputs: DiagnosticBlockInput[] = view.blocks.map((b) => {
      const attempt = attemptsByList.get(`${b.listId}:${studentId}`) ?? null;
      return {
        blockId: b.id,
        position: b.position,
        listId: b.listId,
        skillId: b.skillId,
        skillCode: b.skill?.code ?? b.skillId,
        itemIds: itemsByList.get(b.listId) ?? [],
        attempt: attempt ? { status: attempt.status, submittedAt: attempt.submittedAt } : null,
        answers: attempt ? answersByAttempt.get(attempt.id) ?? [] : [],
      };
    });
    return buildDiagnosticEvidence(inputs);
  }

  const service = {
    /** Habilidades planejadas para a turma e quantas questões elegíveis cada uma tem. */
    async candidates(classroomId: string): Promise<{ classroom: ClassroomRef; skills: SkillCandidate[]; gradeKnown: boolean }> {
      requireRole(actor, ["professor"], "Apenas o professor da turma monta o diagnóstico.");
      const { classroom, entries, gradeKnown } = await bankService.plannedSkillsForClassroom(classroomId);
      const seen = new Set<string>();
      const skills: SkillCandidate[] = [];
      for (const e of [...entries].sort((a, b) => a.plan.periodOrder - b.plan.periodOrder || a.skill.code.localeCompare(b.skill.code))) {
        if (seen.has(e.skill.id)) continue;
        seen.add(e.skill.id);
        const eligible = (await bankService.approvedForSkill(e.skill.id)).filter(eligibleForDiagnostic);
        skills.push({
          skill: e.skill,
          componentId: e.component.id,
          componentName: e.component.name,
          planProvisional: e.plan.status !== "approved",
          eligible: eligible.length,
          synthetic: eligible.filter((i) => i.source?.synthetic).length,
          enough: eligible.length >= DIAGNOSTIC_RULES.minAnswered,
        });
      }
      return { classroom, skills, gradeKnown };
    },

    /**
     * Cria o diagnóstico em rascunho: uma etapa por habilidade escolhida,
     * com até QUESTIONS_PER_BLOCK questões elegíveis (mínimo
     * DIAGNOSTIC_RULES.minAnswered — abaixo disso a etapa não sustentaria
     * nenhuma leitura).
     */
    async create(input: { classroomId: string; title: string; skillIds: string[] }): Promise<string> {
      requireRole(actor, ["professor"], "Apenas o professor da turma monta o diagnóstico.");
      const title = input.title.trim();
      if (!title) throw new Error("Dê um título ao diagnóstico.");
      const skillIds = [...new Set(input.skillIds)];
      if (skillIds.length === 0) throw new Error("Escolha ao menos uma habilidade.");
      if (skillIds.length > 12) throw new Error("No máximo 12 etapas por diagnóstico.");
      const { classroom, skills } = await service.candidates(input.classroomId);
      const chosen = skillIds.map((id) => {
        const c = skills.find((s) => s.skill.id === id);
        if (!c) throw new Error("Habilidade fora do planejamento da turma.");
        if (!c.enough) {
          throw new Error(
            `${c.skill.code} tem ${c.eligible} questão(ões) aprovada(s); são necessárias pelo menos ${DIAGNOSTIC_RULES.minAnswered}.`,
          );
        }
        return c;
      });

      const diagnosticId = newId();
      await study.insertDiagnostic({
        id: diagnosticId,
        institutionId: actor.institutionId,
        classroomId: classroom.id,
        title,
        gradeCode: classroom.gradeCode,
        createdBy: actor.userId,
      });
      const blocks: DiagnosticBlock[] = [];
      for (const [index, c] of chosen.entries()) {
        const items = (await bankService.approvedForSkill(c.skill.id)).filter(eligibleForDiagnostic);
        // Questões da escola primeiro, depois do catálogo; ordem estável.
        const picked = [...items]
          .sort((a, b) => (a.origin === b.origin ? a.version.id.localeCompare(b.version.id) : a.origin === "escola" ? -1 : 1))
          .slice(0, QUESTIONS_PER_BLOCK);
        const listId = await bankService.createList({
          classroomId: classroom.id,
          componentId: c.componentId,
          kind: "diagnostica",
          title: `${title} · etapa ${index + 1} (${c.skill.code})`,
          instructions:
            "Etapa do diagnóstico: responda o que souber. Você pode salvar e continuar depois; " +
            "pode deixar em branco o que não souber — em branco não conta como erro.",
          versionIds: picked.map((p) => p.version.id),
          publish: false,
          skillId: c.skill.id,
        });
        blocks.push({
          id: newId(),
          institutionId: actor.institutionId,
          diagnosticId,
          position: index + 1,
          listId,
          skillId: c.skill.id,
        });
      }
      await study.insertBlocks(blocks);
      return diagnosticId;
    },

    async publish(diagnosticId: string): Promise<Diagnostic> {
      requireRole(actor, ["professor"], "Apenas o professor da turma publica o diagnóstico.");
      const diagnostic = await study.getDiagnostic(diagnosticId);
      if (!diagnostic) throw new Error("Diagnóstico não encontrado ou fora do seu alcance.");
      if (diagnostic.status !== "rascunho") return diagnostic;
      for (const b of await study.listBlocks([diagnosticId])) {
        const list = await bank.getList(b.listId);
        if (list?.status === "rascunho") await bankService.publishList(b.listId);
      }
      return study.setDiagnosticStatus(diagnosticId, "publicado");
    },

    async close(diagnosticId: string): Promise<Diagnostic> {
      requireRole(actor, ["professor"], "Apenas o professor da turma encerra o diagnóstico.");
      return study.setDiagnosticStatus(diagnosticId, "encerrado");
    },

    async forClassroom(classroomId: string): Promise<Diagnostic[]> {
      return study.listDiagnostics([classroomId]);
    },

    /** Acompanhamento docente: cada aluno × etapa, e o resumo por habilidade. */
    async classroomView(diagnosticId: string): Promise<ClassroomDiagnosticView> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe acompanha o diagnóstico.");
      const diagnostic = await study.getDiagnostic(diagnosticId);
      if (!diagnostic) throw new Error("Diagnóstico não encontrado ou fora do seu alcance.");
      const view = await withBlocks(diagnostic);
      const [students, classrooms, items] = await Promise.all([
        bank.listStudentsOfClassroom(diagnostic.classroomId),
        bank.listClassrooms(),
        bank.listItemsForLists(view.blocks.map((b) => b.listId)),
      ]);
      const attempts = (await Promise.all(view.blocks.map((b) => bank.listAttempts(b.listId)))).flat();
      const answers = await bank.listAnswers(attempts.map((a) => a.id));
      const attemptsByList = new Map(attempts.map((a) => [`${a.listId}:${a.studentId}`, a]));
      const answersByAttempt = new Map<string, Array<{ listItemId: string; isCorrect: boolean | null }>>();
      for (const a of answers) {
        answersByAttempt.set(a.attemptId, [...(answersByAttempt.get(a.attemptId) ?? []), a]);
      }
      const itemsByList = new Map<string, string[]>();
      for (const it of items) itemsByList.set(it.listId, [...(itemsByList.get(it.listId) ?? []), it.id]);
      const rows = await Promise.all(
        students.map(async (student) => ({
          student,
          evidence: await evidenceOf(view, student.id, attemptsByList, answersByAttempt, itemsByList),
        })),
      );
      const bySkill = view.blocks.map((b) => {
        const counts: Record<EvidenceLevel, number> = {
          pendente: 0,
          evidencia_insuficiente: 0,
          prioridade_de_estudo: 0,
          em_desenvolvimento: 0,
          indicios_favoraveis: 0,
        };
        for (const r of rows) {
          const s = r.evidence.skills.find((x) => x.blockId === b.id);
          if (s) counts[s.level] += 1;
        }
        return { skillId: b.skillId, skillCode: b.skill?.code ?? b.skillId, counts };
      });
      return {
        ...view,
        classroom: classrooms.find((c) => c.id === diagnostic.classroomId)!,
        students: rows,
        bySkill,
      };
    },

    /** O diagnóstico publicado mais recente da turma do aluno, com as evidências dele. */
    async mine(): Promise<StudentDiagnosticView | null> {
      requireRole(actor, ["aluno"], "Apenas alunos fazem o diagnóstico.");
      const studentId = actor.studentId!;
      const classrooms = await bank.listClassrooms();
      const [diagnostic] = await study.listDiagnostics(
        classrooms.map((c) => c.id),
        ["publicado", "encerrado"],
      );
      if (!diagnostic) return null;
      const view = await withBlocks(diagnostic);
      const items = await bank.listItemsForLists(view.blocks.map((b) => b.listId));
      const attempts = (
        await Promise.all(view.blocks.map((b) => bank.getAttempt(b.listId, studentId)))
      ).filter((a): a is NonNullable<typeof a> => Boolean(a));
      const answers = await bank.listAnswers(attempts.map((a) => a.id));
      const answersByAttempt = new Map<string, Array<{ listItemId: string; isCorrect: boolean | null }>>();
      for (const a of answers) answersByAttempt.set(a.attemptId, [...(answersByAttempt.get(a.attemptId) ?? []), a]);
      const itemsByList = new Map<string, string[]>();
      for (const it of items) itemsByList.set(it.listId, [...(itemsByList.get(it.listId) ?? []), it.id]);
      const evidence = await evidenceOf(
        view,
        studentId,
        new Map(attempts.map((a) => [`${a.listId}:${studentId}`, a])),
        answersByAttempt,
        itemsByList,
      );
      return { ...view, evidence };
    },

    /** Alunos da turma (a RLS limita à equipe da turma). */
    async studentsOf(classroomId: string): Promise<StudentRef[]> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe vê os alunos da turma.");
      return bank.listStudentsOfClassroom(classroomId);
    },

    /** A lista é etapa de diagnóstico? (Etapa aceita entrega com questões em branco.) */
    async isDiagnosticList(listId: string): Promise<boolean> {
      return Boolean(await study.getBlockByList(listId));
    },
  };
  return service;
}

export type DiagnosticService = ReturnType<typeof createDiagnosticService>;
