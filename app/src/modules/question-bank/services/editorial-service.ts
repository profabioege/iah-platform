import type {
  ContentFormat,
  ContentSource,
  CurriculumSkill,
  EditorialDifficulty,
  GradeCode,
  Question,
  QuestionKey,
  QuestionOption,
  QuestionReview,
  QuestionVersion,
  QuestionVersionStatus,
  ReviewChecklist,
  SkillSuggestion,
} from "../domain/entities";
import type { QuestionBankRepositories } from "../domain/repositories";
import type { QuestionBankActor, QuestionBankService } from "./question-bank-service";

/**
 * Revisão editorial (D-052) — fila, item, decisão e nova versão.
 *
 * Serve à escola e ao Catálogo IAH (cada inquilino revisa o próprio
 * acervo). As regras de verdade estão no banco (0017/0018/0020): autor ≠
 * revisor, conferência completa, resolução e direitos verificados para
 * aprovar, versão imutável depois do envio. Aqui só se organiza o que a
 * tela mostra e se devolvem mensagens claras.
 */

export type ClassificationOrigin = "autor" | "ia" | "desconhecida";

export interface QueueRow {
  version: QuestionVersion;
  question: Question;
  skill: CurriculumSkill | null;
  code: string | null;
  classification: ClassificationOrigin;
  sourceRights: ContentSource["rightsStatus"] | null;
  mine: boolean;
  /** Série sugerida pelo autor/lote (em1–em3), quando informada. Não é planejamento. */
  serie: GradeCode | null;
}

/** Filtros da fila de revisão (D-055): série sugerida e habilidade (código BNCC). */
export interface QueueFilters {
  serie?: GradeCode | null;
  habilidade?: string | null;
}

/** Série sugerida no item ("1ª", "1ª série", "em1"…) → em1–em3. */
export function suggestedGradeOf(question: Question): GradeCode | null {
  const raw = (question.externalRef as { serie_sugerida?: unknown } | null)?.serie_sugerida;
  if (typeof raw !== "string") return null;
  const m = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/^(?:em)?\s*([123])/);
  return m ? (`em${m[1]}` as GradeCode) : null;
}

export function filterQueueRows(rows: QueueRow[], filters: QueueFilters): QueueRow[] {
  const code = filters.habilidade?.trim().toUpperCase() || null;
  return rows.filter(
    (r) => (!filters.serie || r.serie === filters.serie) && (!code || r.skill?.code.toUpperCase() === code),
  );
}

export interface ReviewItem extends QueueRow {
  key: QuestionKey | null;
  source: ContentSource | null;
  suggestions: Array<SkillSuggestion & { skill: CurriculumSkill | null }>;
  reviews: QuestionReview[];
  history: QuestionVersion[];
  externalRef: Record<string, unknown> | null;
  canReview: boolean;
  canEdit: boolean;
}

export interface VersionInput {
  stem: string;
  options: QuestionOption[];
  answerKey: string;
  resolution: string;
  optionFeedback: Record<string, string>;
  editorialDifficulty: EditorialDifficulty | null;
  skillId: string;
  submit: boolean;
}

const REVIEW_STATUSES: QuestionVersionStatus[] = ["rascunho", "em_revisao", "devolvida", "aprovada"];

function classificationOf(question: Question): ClassificationOrigin {
  const c = (question.externalRef as { classificacao?: { origem?: string } } | null)?.classificacao?.origem;
  return c === "autor" || c === "ia" ? c : "desconhecida";
}

function codeOf(question: Question): string | null {
  const ref = question.externalRef as { codigo?: string; chave?: string } | null;
  return ref?.codigo ?? ref?.chave ?? null;
}

export function createEditorialService(
  repos: QuestionBankRepositories,
  actor: QuestionBankActor,
  bank: QuestionBankService,
) {
  const staff = () => {
    if (!["professor", "administrador", "admin_iah"].includes(actor.role)) {
      throw new Error("Apenas a equipe acessa a revisão editorial.");
    }
  };

  async function rows(versions: QuestionVersion[]): Promise<QueueRow[]> {
    const questions = await repos.listQuestionsByIds([...new Set(versions.map((v) => v.questionId))]);
    const [skills, sources] = await Promise.all([
      repos.listSkills([...new Set(questions.map((q) => q.skillId))]),
      repos.listSources([...new Set(versions.map((v) => v.sourceId))]),
    ]);
    const qById = new Map(questions.map((q) => [q.id, q]));
    const sById = new Map(skills.map((s) => [s.id, s]));
    const srcById = new Map(sources.map((s) => [s.id, s]));
    return versions
      .filter((v) => qById.has(v.questionId))
      .map((version) => {
        const question = qById.get(version.questionId)!;
        return {
          version,
          question,
          skill: sById.get(question.skillId) ?? null,
          code: codeOf(question),
          classification: classificationOf(question),
          sourceRights: srcById.get(version.sourceId)?.rightsStatus ?? null,
          mine: version.createdBy === actor.userId,
          serie: suggestedGradeOf(question),
        };
      });
  }

  const service = {
    /** Última versão de cada questão do próprio inquilino, com contagem por status. */
    async queue(status: QuestionVersionStatus = "em_revisao", filters: QueueFilters = {}): Promise<{
      rows: QueueRow[];
      counts: Record<string, number>;
    }> {
      staff();
      const versions = await repos.listVersions({ statuses: REVIEW_STATUSES, institutionId: actor.institutionId });
      const latest = new Map<string, QuestionVersion>();
      for (const v of versions) {
        const current = latest.get(v.questionId);
        if (!current || v.version > current.version) latest.set(v.questionId, v);
      }
      const all = [...latest.values()];
      // Os filtros valem para a contagem por situação e para a lista.
      const filtered = filters.serie || filters.habilidade ? filterQueueRows(await rows(all), filters) : null;
      const visible = filtered ? filtered.map((r) => r.version) : all;
      const counts: Record<string, number> = {};
      for (const v of visible) counts[v.status] = (counts[v.status] ?? 0) + 1;
      const selected = filtered
        ? filtered.filter((r) => r.version.status === status)
        : await rows(all.filter((v) => v.status === status));
      selected.sort((a, b) => (a.code ?? a.version.id).localeCompare(b.code ?? b.version.id, "pt-BR", { numeric: true }));
      return { rows: selected, counts };
    },

    async item(versionId: string): Promise<ReviewItem | null> {
      staff();
      const [version] = await repos.listVersions({ ids: [versionId], institutionId: actor.institutionId });
      if (!version) return null;
      const [row] = await rows([version]);
      const [keys, sources, suggestions, reviews, history] = await Promise.all([
        repos.listKeys([versionId]),
        repos.listSources([version.sourceId]),
        repos.listSuggestionsByQuestions([version.questionId]),
        repos.listReviews(versionId),
        repos.listVersions({ questionIds: [version.questionId], institutionId: actor.institutionId }),
      ]);
      const sugSkills = await repos.listSkills([...new Set(suggestions.map((s) => s.skillId))]);
      const sugById = new Map(sugSkills.map((s) => [s.id, s]));
      const latest = Math.max(...history.map((h) => h.version));
      return {
        ...row,
        key: keys[0] ?? null,
        source: sources[0] ?? null,
        suggestions: suggestions.map((s) => ({ ...s, skill: sugById.get(s.skillId) ?? null })),
        reviews,
        history: history.sort((a, b) => b.version - a.version),
        externalRef: (row.question.externalRef as Record<string, unknown> | null) ?? null,
        canReview: version.status === "em_revisao" && !row.mine && ["professor", "administrador"].includes(actor.role),
        canEdit:
          row.question.createdBy === actor.userId &&
          version.version === latest &&
          (version.status === "devolvida" || version.status === "rascunho"),
      };
    },

    async decide(
      versionId: string,
      decision: "aprovada" | "devolvida",
      checklist: ReviewChecklist,
      comment: string | null,
    ): Promise<void> {
      staff();
      await bank.reviewVersion(versionId, decision, checklist, comment);
    },

    /**
     * Corrige criando NOVA versão (a anterior fica no histórico). Pode
     * trocar a habilidade oficial (só quem criou a questão) e já enviar
     * à revisão.
     */
    async saveNewVersion(versionId: string, input: VersionInput): Promise<string> {
      staff();
      const item = await service.item(versionId);
      if (!item) throw new Error("Versão não encontrada.");
      if (!item.canEdit) throw new Error("Só o autor corrige, e só uma versão devolvida ou em rascunho.");
      if (input.skillId && input.skillId !== item.question.skillId) {
        // Habilidade presa a um componente (Língua Portuguesa na BNCC) leva o componente junto.
        const [skill] = await repos.listSkills([input.skillId]);
        if (!skill) throw new Error("Habilidade fora do seu alcance.");
        await repos.updateQuestionSkill(item.question.id, input.skillId, skill.componentId ?? undefined);
      }
      const format: ContentFormat = item.version.contentFormat === "texto" ? "texto" : "marcacao_v2";
      const newVersionId = await bank.createNextVersion(item.question.id, {
        sourceId: item.version.sourceId,
        stem: input.stem,
        options: input.options,
        answerKey: input.answerKey,
        resolution: input.resolution,
        editorialDifficulty: input.editorialDifficulty,
        authorship: item.version.authorship,
        contentFormat: format,
        optionFeedback: input.optionFeedback,
      });
      if (input.submit) await bank.submitForReview(newVersionId);
      return newVersionId;
    },

    async submit(versionId: string): Promise<void> {
      staff();
      await bank.submitForReview(versionId);
    },

    /** Habilidades que o editor oferece: BNCC e Matriz (referência) e as próprias da escola. */
    async skillOptions(): Promise<CurriculumSkill[]> {
      staff();
      return (await repos.listSkills()).sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true }));
    },

    // ----- fontes (gestão) -----
    async sources(): Promise<ContentSource[]> {
      staff();
      return (await repos.listSources()).filter((s) => s.institutionId === actor.institutionId);
    },

    async verifySource(sourceId: string, evidence: string | null): Promise<void> {
      await bank.verifySourceRights(sourceId, evidence);
    },
  };
  return service;
}

export type EditorialService = ReturnType<typeof createEditorialService>;
