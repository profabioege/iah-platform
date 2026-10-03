import type {
  ClassroomRef,
  ContentFormat,
  ContentSource,
  CurriculumComponent,
  CurriculumPlanEntry,
  CurriculumSkill,
  EditorialDifficulty,
  ListAttempt,
  PracticeList,
  PracticeListKind,
  Question,
  QuestionKey,
  QuestionOption,
  QuestionVersion,
  ReviewChecklist,
  SkillSuggestion,
  SourceKind,
  StudentRef,
  AttemptFeedback,
} from "../domain/entities";
import type { QuestionBankRepositories } from "../domain/repositories";
import { buildAttemptReport, validateOptions, type AttemptReport } from "../domain/report";

/**
 * Serviço do banco de questões — casos de uso do incremento 1.
 *
 * `actor` vem SEMPRE da sessão conferida no servidor (`request-actor`);
 * escola, usuário, professor e aluno nunca chegam do cliente. As
 * conferências de papel aqui existem para devolver mensagem clara — a
 * barreira de verdade são as policies e triggers das migrations
 * 0016/0017, que valem mesmo se este código errar.
 */

export interface QuestionBankActor {
  institutionId: string;
  role: "aluno" | "professor" | "administrador" | "admin_iah";
  userId: string;
  teacherId: string | null;
  studentId: string | null;
}

export const MAX_LIST_ITEMS = 10;

function requireRole(actor: QuestionBankActor, roles: QuestionBankActor["role"][], message: string) {
  if (!roles.includes(actor.role)) throw new Error(message);
}

const newId = () => crypto.randomUUID();

/** Ids determinísticos: repetir a mesma ação nunca cria segunda linha. */
export const attemptIdFor = (listId: string, studentId: string) => `att:${listId}:${studentId}`;
export const answerIdFor = (attemptId: string, itemId: string) => `ans:${attemptId}:${itemId}`;

export interface PlannedSkill {
  plan: CurriculumPlanEntry;
  skill: CurriculumSkill;
  component: CurriculumComponent;
}

/** Como a questão chegou à habilidade consultada. */
export type BankItemLink =
  | { kind: "oficial" }
  | {
      kind: "sugerida" | "confirmada";
      confidence: SkillSuggestion["confidence"];
      rationale: string;
      suggestedBy: SkillSuggestion["origin"];
    };

export interface BankItem {
  question: Question;
  version: QuestionVersion;
  source: ContentSource | null;
  key: QuestionKey | null;
  /** "catalogo" = questão comum do Catálogo IAH (só leitura para a escola). */
  origin: "escola" | "catalogo";
  /** Habilidade oficial da questão (no catálogo Enem, a da Matriz). */
  officialSkill: CurriculumSkill | null;
  link: BankItemLink;
}

const CONFIDENCE_RANK: Record<SkillSuggestion["confidence"], number> = { alta: 0, media: 1, baixa: 2 };

export interface StudentListItem {
  id: string;
  position: number;
  skillId: string;
  versionId: string;
  contentFormat: ContentFormat;
  stem: string;
  options: QuestionOption[];
}

export interface StudentListView {
  list: PracticeList;
  attempt: ListAttempt | null;
  items: StudentListItem[];
  answers: Record<string, string>;
  /** Só existe depois da entrega. */
  report: AttemptReport | null;
  feedback: AttemptFeedback | null;
  skills: CurriculumSkill[];
}

export interface ListResults {
  list: PracticeList;
  classroom: ClassroomRef | null;
  skills: CurriculumSkill[];
  students: Array<{
    student: StudentRef;
    attempt: ListAttempt | null;
    report: AttemptReport | null;
    feedback: AttemptFeedback | null;
  }>;
}

export function createQuestionBankService(repos: QuestionBankRepositories, actor: QuestionBankActor) {
  const service = {
    // ------------------------------------------------------------------
    // Matriz curricular
    // ------------------------------------------------------------------
    async classrooms(): Promise<ClassroomRef[]> {
      return repos.listClassrooms();
    },

    /**
     * Habilidades planejadas para a série da turma, com componente. Se a
     * turma ainda não tem série normalizada (`grade_code`), devolve o
     * planejamento do ano inteiro — a tela avisa.
     */
    async plannedSkillsForClassroom(classroomId: string): Promise<{
      classroom: ClassroomRef;
      entries: PlannedSkill[];
      gradeKnown: boolean;
    }> {
      const classroom = (await repos.listClassrooms()).find((c) => c.id === classroomId);
      if (!classroom) throw new Error("Turma fora do seu alcance.");
      const plan = await repos.listPlan({
        academicYearId: classroom.academicYearId,
        gradeCode: classroom.gradeCode,
      });
      const [skills, components] = await Promise.all([
        repos.listSkills([...new Set(plan.map((p) => p.skillId))]),
        repos.listComponents(),
      ]);
      const skillById = new Map(skills.map((s) => [s.id, s]));
      const componentById = new Map(components.map((c) => [c.id, c]));
      const entries = plan
        .map((p) => ({ plan: p, skill: skillById.get(p.skillId), component: componentById.get(p.componentId) }))
        .filter((e): e is PlannedSkill => Boolean(e.skill && e.component));
      return { classroom, entries, gradeKnown: classroom.gradeCode !== null };
    },

    // ------------------------------------------------------------------
    // Banco: consulta
    // ------------------------------------------------------------------
    /**
     * Questões com versão APROVADA para a habilidade (o que pode ir para
     * lista): as da escola e as do catálogo IAH (a RLS da 0018 só deixa
     * passar versões aprovadas do catálogo). Entram por dois caminhos,
     * sempre rotulados: habilidade OFICIAL da questão, ou correspondência
     * BNCC SUGERIDA/CONFIRMADA (`question_skill_suggestions`). Sugestão
     * rejeitada nunca aparece.
     */
    async approvedForSkill(skillId: string): Promise<BankItem[]> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe consulta o banco.");
      const [official, suggestions] = await Promise.all([
        repos.listQuestionsBySkill(skillId),
        repos.listSuggestionsBySkill(skillId, ["sugerida", "confirmada"]),
      ]);
      const officialIds = new Set(official.map((q) => q.id));
      const suggestionByQuestion = new Map(
        suggestions.filter((s) => !officialIds.has(s.questionId)).map((s) => [s.questionId, s]),
      );
      const suggested = await repos.listQuestionsByIds([...suggestionByQuestion.keys()]);
      const questions = [...official, ...suggested];
      const versions = await repos.listVersions({
        questionIds: questions.map((q) => q.id),
        status: "aprovada",
      });
      const [sources, keys, skills] = await Promise.all([
        repos.listSources([...new Set(versions.map((v) => v.sourceId))]),
        repos.listKeys(versions.map((v) => v.id)),
        repos.listSkills([...new Set(questions.map((q) => q.skillId))]),
      ]);
      const questionById = new Map(questions.map((q) => [q.id, q]));
      const sourceById = new Map(sources.map((s) => [s.id, s]));
      const keyById = new Map(keys.map((k) => [k.versionId, k]));
      const skillById = new Map(skills.map((s) => [s.id, s]));
      const items = versions.map((version): BankItem => {
        const question = questionById.get(version.questionId)!;
        const suggestion = suggestionByQuestion.get(question.id);
        return {
          question,
          version,
          source: sourceById.get(version.sourceId) ?? null,
          key: keyById.get(version.id) ?? null,
          origin: question.institutionId === actor.institutionId ? "escola" : "catalogo",
          officialSkill: skillById.get(question.skillId) ?? null,
          link: suggestion
            ? {
                kind: suggestion.status === "confirmada" ? "confirmada" : "sugerida",
                confidence: suggestion.confidence,
                rationale: suggestion.rationale,
                suggestedBy: suggestion.origin,
              }
            : { kind: "oficial" },
        };
      });
      // Oficial primeiro, depois confirmada, depois sugerida (por confiança).
      const rank = (i: BankItem) =>
        i.link.kind === "oficial" ? 0 : i.link.kind === "confirmada" ? 1 : 2 + CONFIDENCE_RANK[i.link.confidence];
      return items.sort((a, b) => rank(a) - rank(b));
    },

    /** Gestão do inquilino dono confirma ou rejeita uma sugestão de habilidade. */
    async decideSuggestion(suggestionId: string, decision: "confirmada" | "rejeitada"): Promise<void> {
      requireRole(actor, ["professor", "administrador"], "Apenas a equipe confirma correspondências.");
      await repos.setSuggestionStatus(suggestionId, decision, actor.userId);
    },

    /** Conteúdo de uma figura — a RLS decide se o ator alcança a versão. */
    async figure(versionId: string, n: number): Promise<Uint8Array | null> {
      if (!Number.isInteger(n) || n < 1 || n > 60) return null;
      return repos.getAssetContent(versionId, n);
    },

    // ------------------------------------------------------------------
    // Banco: autoria e revisão
    // ------------------------------------------------------------------
    async registerSource(input: {
      kind: SourceKind;
      title: string;
      rightsHolder: string;
      license: string;
      licenseUrl?: string | null;
      evidence?: string | null;
    }): Promise<string> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe cadastra fontes.");
      const id = newId();
      await repos.insertSource({
        id,
        institutionId: actor.institutionId,
        kind: input.kind,
        title: input.title.trim(),
        rightsHolder: input.rightsHolder.trim(),
        license: input.license.trim(),
        licenseUrl: input.licenseUrl?.trim() || null,
        evidence: input.evidence?.trim() || null,
        createdBy: actor.userId,
      });
      return id;
    },

    async verifySourceRights(sourceId: string, evidence: string | null = null): Promise<void> {
      requireRole(actor, ["administrador"], "Apenas a gestão verifica direitos de uso.");
      await repos.verifySource(sourceId, actor.userId, evidence);
    },

    /** Cria a questão e a versão 1 em rascunho, com gabarito e resolução. */
    async createQuestionDraft(input: {
      componentId: string;
      skillId: string;
      sourceId: string;
      stem: string;
      options: QuestionOption[];
      answerKey: string;
      resolution: string;
      editorialDifficulty: EditorialDifficulty | null;
      authorship: string;
    }): Promise<{ questionId: string; versionId: string }> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe escreve questões.");
      const problem = validateOptions(input.options, input.answerKey);
      if (problem) throw new Error(problem);
      if (!input.resolution.trim()) throw new Error("Escreva a resolução comentada.");
      const questionId = newId();
      await repos.insertQuestion({
        id: questionId,
        institutionId: actor.institutionId,
        componentId: input.componentId,
        skillId: input.skillId,
        createdBy: actor.userId,
      });
      const versionId = await service.createVersion(questionId, 1, input);
      return { questionId, versionId };
    },

    /** Nova versão (rascunho) de questão existente — corrigir nunca sobrescreve. */
    async createNextVersion(questionId: string, input: {
      sourceId: string;
      stem: string;
      options: QuestionOption[];
      answerKey: string;
      resolution: string;
      editorialDifficulty: EditorialDifficulty | null;
      authorship: string;
    }): Promise<string> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe escreve questões.");
      const problem = validateOptions(input.options, input.answerKey);
      if (problem) throw new Error(problem);
      const existing = await repos.listVersions({ questionIds: [questionId] });
      if (existing.length === 0) throw new Error("Questão não encontrada.");
      const next = Math.max(...existing.map((v) => v.version)) + 1;
      return service.createVersion(questionId, next, input);
    },

    async createVersion(questionId: string, version: number, input: {
      sourceId: string;
      stem: string;
      options: QuestionOption[];
      answerKey: string;
      resolution: string;
      editorialDifficulty: EditorialDifficulty | null;
      authorship: string;
    }): Promise<string> {
      const versionId = newId();
      await repos.insertVersion({
        id: versionId,
        institutionId: actor.institutionId,
        questionId,
        version,
        stem: input.stem.trim(),
        options: input.options.map((o) => ({ key: o.key.trim(), text: o.text.trim() })),
        editorialDifficulty: input.editorialDifficulty,
        sourceId: input.sourceId,
        authorship: input.authorship.trim(),
        createdBy: actor.userId,
      });
      await repos.upsertKey({
        versionId,
        institutionId: actor.institutionId,
        answerKey: input.answerKey.trim(),
        resolution: input.resolution.trim(),
      });
      return versionId;
    },

    /**
     * Escreve a resolução comentada de um rascunho que chegou sem ela
     * (itens importados no catálogo). Só o autor da versão, só em
     * rascunho — policy e trigger da 0017 conferem de novo.
     */
    async writeResolution(versionId: string, resolution: string): Promise<void> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe escreve resoluções.");
      if (!resolution.trim()) throw new Error("Escreva a resolução comentada.");
      const [version] = await repos.listVersions({ ids: [versionId] });
      if (!version || version.institutionId !== actor.institutionId) throw new Error("Versão fora do seu alcance.");
      if (version.status !== "rascunho") throw new Error("Só rascunhos recebem resolução; crie uma nova versão.");
      const [key] = await repos.listKeys([versionId]);
      if (!key) throw new Error("Versão sem gabarito.");
      await repos.upsertKey({
        versionId,
        institutionId: actor.institutionId,
        answerKey: key.answerKey,
        resolution: resolution.trim(),
      });
    },

    async submitForReview(versionId: string): Promise<void> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe envia questões à revisão.");
      await repos.submitVersion(versionId);
    },

    async reviewVersion(
      versionId: string,
      decision: "aprovada" | "devolvida",
      checklist: ReviewChecklist,
      comment: string | null,
    ): Promise<void> {
      requireRole(actor, ["professor", "administrador"], "Apenas professores e gestão revisam questões.");
      await repos.insertReview({
        id: newId(),
        institutionId: actor.institutionId,
        versionId,
        reviewerId: actor.userId,
        decision,
        checklist,
        comment: comment?.trim() || null,
      });
    },

    // ------------------------------------------------------------------
    // Listas (professor)
    // ------------------------------------------------------------------
    async createList(input: {
      classroomId: string;
      componentId: string;
      kind: PracticeListKind;
      title: string;
      instructions?: string;
      versionIds: string[];
      publish: boolean;
    }): Promise<string> {
      requireRole(actor, ["professor"], "Apenas o professor da turma monta listas.");
      const versionIds = [...new Set(input.versionIds)];
      if (versionIds.length === 0) throw new Error("Escolha ao menos uma questão revisada.");
      if (versionIds.length > MAX_LIST_ITEMS) {
        throw new Error(`Uma lista curta tem no máximo ${MAX_LIST_ITEMS} questões.`);
      }
      if (!input.title.trim()) throw new Error("Dê um título à lista.");

      // A lista herda o "provisório" do planejamento: só deixa de ser
      // provisória quando TODAS as habilidades das questões estão num
      // plano APROVADO pela escola para a série da turma.
      const versions = await repos.listVersions({ ids: versionIds });
      if (versions.length !== versionIds.length || versions.some((v) => v.status !== "aprovada")) {
        throw new Error("Só questões com versão aprovada na revisão entram na lista.");
      }
      const questionIds = [...new Set(versions.map((v) => v.questionId))];
      const [{ entries }, questions, suggestions] = await Promise.all([
        service.plannedSkillsForClassroom(input.classroomId),
        repos.listQuestionsByIds(questionIds),
        repos.listSuggestionsByQuestions(questionIds),
      ]);
      const approvedPlanSkills = new Set(
        entries.filter((e) => e.plan.status === "approved").map((e) => e.skill.id),
      );
      // Conta a habilidade oficial ou uma correspondência CONFIRMADA por
      // revisão humana — sugestão não revisada não tira o "provisório".
      const covered = (q: Question) =>
        approvedPlanSkills.has(q.skillId) ||
        suggestions.some(
          (s) => s.questionId === q.id && s.status === "confirmada" && approvedPlanSkills.has(s.skillId),
        );
      const curriculumProvisional = questions.some((q) => !covered(q));

      const listId = newId();
      await repos.insertList({
        id: listId,
        institutionId: actor.institutionId,
        classroomId: input.classroomId,
        componentId: input.componentId,
        kind: input.kind,
        title: input.title.trim(),
        instructions: input.instructions?.trim() ?? "",
        curriculumProvisional,
        createdBy: actor.userId,
      });
      await repos.insertListItems(
        versionIds.map((questionVersionId, index) => ({
          id: newId(),
          institutionId: actor.institutionId,
          listId,
          position: index + 1,
          questionVersionId,
        })),
      );
      if (input.publish) await repos.setListStatus(listId, "publicada");
      return listId;
    },

    async publishList(listId: string): Promise<void> {
      requireRole(actor, ["professor"], "Apenas o professor da turma publica listas.");
      await repos.setListStatus(listId, "publicada");
    },

    async closeList(listId: string): Promise<void> {
      requireRole(actor, ["professor"], "Apenas o professor da turma encerra listas.");
      await repos.setListStatus(listId, "encerrada");
    },

    async listsForClassrooms(classroomIds: string[]): Promise<PracticeList[]> {
      return repos.listLists({ classroomIds });
    },

    /** Respostas e devolutivas da turma numa lista (professor/gestão). */
    async listResults(listId: string): Promise<ListResults> {
      requireRole(actor, ["professor", "administrador", "admin_iah"], "Apenas a equipe consulta resultados.");
      const list = await repos.getList(listId);
      if (!list) throw new Error("Lista não encontrada ou fora do seu alcance.");
      const [items, attempts, students, classrooms] = await Promise.all([
        repos.listItems(listId),
        repos.listAttempts(listId),
        repos.listStudentsOfClassroom(list.classroomId),
        repos.listClassrooms(),
      ]);
      const versionIds = items.map((i) => i.questionVersionId);
      const attemptIds = attempts.map((a) => a.id);
      const [versions, keys, answers, feedback, skills] = await Promise.all([
        repos.listVersions({ ids: versionIds }),
        repos.listKeys(versionIds),
        repos.listAnswers(attemptIds),
        repos.listFeedback(attemptIds),
        repos.listSkills([...new Set(items.map((i) => i.skillId))]),
      ]);
      const attemptByStudent = new Map(attempts.map((a) => [a.studentId, a]));
      const feedbackByAttempt = new Map(feedback.map((f) => [f.attemptId, f]));
      return {
        list,
        classroom: classrooms.find((c) => c.id === list.classroomId) ?? null,
        skills,
        students: students.map((student) => {
          const attempt = attemptByStudent.get(student.id) ?? null;
          const report =
            attempt?.status === "entregue"
              ? buildAttemptReport({
                  items,
                  versions,
                  keys,
                  answers: answers.filter((a) => a.attemptId === attempt.id),
                  skills,
                })
              : null;
          return {
            student,
            attempt,
            report,
            feedback: attempt ? feedbackByAttempt.get(attempt.id) ?? null : null,
          };
        }),
      };
    },

    async saveFeedback(listId: string, studentId: string, comment: string): Promise<void> {
      requireRole(actor, ["professor"], "Apenas o professor da turma registra devolutivas.");
      if (!comment.trim()) throw new Error("Escreva a devolutiva.");
      const attempt = await repos.getAttempt(listId, studentId);
      if (!attempt || attempt.status !== "entregue") {
        throw new Error("A devolutiva só pode ser registrada depois da entrega.");
      }
      await repos.upsertFeedback({
        attemptId: attempt.id,
        institutionId: actor.institutionId,
        classroomId: attempt.classroomId,
        studentId: attempt.studentId,
        teacherUserId: actor.userId,
        comment: comment.trim(),
      });
    },

    // ------------------------------------------------------------------
    // Aluno
    // ------------------------------------------------------------------
    async myLists(): Promise<Array<{ list: PracticeList; attempt: ListAttempt | null }>> {
      requireRole(actor, ["aluno"], "Apenas alunos respondem listas.");
      const classrooms = await repos.listClassrooms();
      const lists = await repos.listLists({
        classroomIds: classrooms.map((c) => c.id),
        status: ["publicada", "encerrada"],
      });
      return Promise.all(
        lists.map(async (list) => ({ list, attempt: await repos.getAttempt(list.id, actor.studentId!) })),
      );
    },

    async openList(listId: string): Promise<StudentListView> {
      requireRole(actor, ["aluno"], "Apenas alunos respondem listas.");
      const studentId = actor.studentId!;
      const list = await repos.getList(listId);
      if (!list) throw new Error("Lista não encontrada ou não disponível para você.");
      const [items, attempt] = await Promise.all([repos.listItems(listId), repos.getAttempt(listId, studentId)]);
      const versionIds = items.map((i) => i.questionVersionId);
      const [versions, skills] = await Promise.all([
        repos.listVersions({ ids: versionIds }),
        repos.listSkills([...new Set(items.map((i) => i.skillId))]),
      ]);
      const answers = attempt ? await repos.listAnswers([attempt.id]) : [];
      const versionById = new Map(versions.map((v) => [v.id, v]));
      let report: AttemptReport | null = null;
      let feedback: AttemptFeedback | null = null;
      if (attempt?.status === "entregue") {
        // Gabarito e resolução só são legíveis pelo aluno depois da
        // entrega (policy da 0017) — antes disso a consulta volta vazia.
        const keys = await repos.listKeys(versionIds);
        report = buildAttemptReport({ items, versions, keys, answers, skills });
        feedback = (await repos.listFeedback([attempt.id]))[0] ?? null;
      }
      return {
        list,
        attempt,
        items: items.map((i) => {
          const version = versionById.get(i.questionVersionId);
          return {
            id: i.id,
            position: i.position,
            skillId: i.skillId,
            versionId: i.questionVersionId,
            contentFormat: version?.contentFormat ?? "texto",
            stem: version?.stem ?? "",
            options: version?.options ?? [],
          };
        }),
        answers: Object.fromEntries(answers.map((a) => [a.listItemId, a.selectedKey])),
        report,
        feedback,
        skills,
      };
    },

    async answer(listId: string, listItemId: string, selectedKey: string): Promise<void> {
      requireRole(actor, ["aluno"], "Apenas alunos respondem listas.");
      const studentId = actor.studentId!;
      const list = await repos.getList(listId);
      if (!list || list.status !== "publicada") throw new Error("Lista não está aberta para respostas.");
      const attempt = await repos.ensureAttempt({
        id: attemptIdFor(listId, studentId),
        institutionId: actor.institutionId,
        classroomId: list.classroomId,
        listId,
        studentId,
      });
      if (attempt.status === "entregue") throw new Error("Você já entregou esta lista.");
      await repos.upsertAnswer({
        id: answerIdFor(attempt.id, listItemId),
        institutionId: actor.institutionId,
        attemptId: attempt.id,
        listItemId,
        studentId,
        selectedKey,
      });
    },

    async submit(listId: string): Promise<ListAttempt> {
      requireRole(actor, ["aluno"], "Apenas alunos respondem listas.");
      const studentId = actor.studentId!;
      const attempt = await repos.getAttempt(listId, studentId);
      if (!attempt) throw new Error("Responda às questões antes de entregar.");
      if (attempt.status === "entregue") return attempt; // repetir a entrega não muda nada
      const [items, answers] = await Promise.all([repos.listItems(listId), repos.listAnswers([attempt.id])]);
      if (answers.length < items.length) {
        throw new Error(`Faltam ${items.length - answers.length} questão(ões) sem resposta.`);
      }
      return repos.submitAttempt(attempt.id);
    },
  };
  return service;
}

export type QuestionBankService = ReturnType<typeof createQuestionBankService>;
