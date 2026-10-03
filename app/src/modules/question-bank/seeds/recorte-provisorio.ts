/**
 * RECORTE CURRICULAR PROVISÓRIO + ITENS SINTÉTICOS DE DEMONSTRAÇÃO
 *
 * ⚠ PROVISÓRIO até a escola entregar o próprio currículo. Serve para
 * exercitar o fluxo de ponta a ponta (professor escolhe habilidade e
 * questão revisada → aluno responde → professor vê resposta e
 * devolutiva) com dados que não são de ninguém.
 *
 *  - Áreas: as quatro áreas do Ensino Médio na BNCC.
 *  - Componentes: referência comum SUGERIDA. A BNCC do EM organiza as
 *    habilidades por área (Língua Portuguesa é a exceção); a divisão em
 *    componentes é decisão do currículo de cada escola/rede, que pode
 *    criar os próprios.
 *  - Habilidades: UMA por área (código da competência específica 1).
 *    Textos conferidos em https://bncc.dev em 03/10/2026 — conferir com
 *    o documento oficial do MEC antes de qualquer uso em produção.
 *  - Planejamento: 1ª série, 1º bimestre, status `provisional`.
 *  - Questões: 2 por habilidade, ORIGINAIS, escritas para esta
 *    demonstração. Não reproduzem itens do Enem, de vestibulares nem de
 *    material didático (COC/Arco ou outro). Fonte `autoral_iah`.
 *    "Dificuldade" é rótulo editorial, não TRI.
 *  - A revisão dos itens sintéticos é feita no carregamento por uma
 *    conta da escola indicada pelo operador (em teste, a gestão
 *    sintética). Em escola real, os itens precisam ser revisados de novo
 *    pela equipe da escola antes de uso com alunos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EditorialDifficulty, GradeCode, QuestionOption } from "../domain/entities";

export const RECORTE_PROVISORIO_LABEL =
  "Recorte curricular provisório — substituir pelo currículo da escola";

const BNCC_REF = "BNCC — Ensino Médio (MEC, 2018); texto conferido em bncc.dev em 03/10/2026";

export const AREAS = [
  { id: "lgg", code: "LGG", name: "Linguagens e suas Tecnologias" },
  { id: "mat", code: "MAT", name: "Matemática e suas Tecnologias" },
  { id: "cnt", code: "CNT", name: "Ciências da Natureza e suas Tecnologias" },
  { id: "chs", code: "CHS", name: "Ciências Humanas e Sociais Aplicadas" },
] as const;

export const REFERENCE_COMPONENTS = [
  { id: "comp-lgg-lingua-portuguesa", area_id: "lgg", name: "Língua Portuguesa" },
  { id: "comp-lgg-arte", area_id: "lgg", name: "Arte" },
  { id: "comp-lgg-educacao-fisica", area_id: "lgg", name: "Educação Física" },
  { id: "comp-lgg-lingua-inglesa", area_id: "lgg", name: "Língua Inglesa" },
  { id: "comp-mat-matematica", area_id: "mat", name: "Matemática" },
  { id: "comp-cnt-biologia", area_id: "cnt", name: "Biologia" },
  { id: "comp-cnt-fisica", area_id: "cnt", name: "Física" },
  { id: "comp-cnt-quimica", area_id: "cnt", name: "Química" },
  { id: "comp-chs-historia", area_id: "chs", name: "História" },
  { id: "comp-chs-geografia", area_id: "chs", name: "Geografia" },
  { id: "comp-chs-filosofia", area_id: "chs", name: "Filosofia" },
  { id: "comp-chs-sociologia", area_id: "chs", name: "Sociologia" },
] as const;

export const BNCC_SKILLS = [
  {
    id: "bncc-em13mat101",
    area_id: "mat",
    code: "EM13MAT101",
    description:
      "Interpretar criticamente situações econômicas, sociais e fatos relativos às Ciências da Natureza que envolvam a variação de grandezas, pela análise dos gráficos das funções representadas e das taxas de variação, com ou sem apoio de tecnologias digitais.",
  },
  {
    id: "bncc-em13cnt101",
    area_id: "cnt",
    code: "EM13CNT101",
    description:
      "Analisar e representar, com ou sem o uso de dispositivos e de aplicativos digitais específicos, as transformações e conservações em sistemas que envolvam quantidade de matéria, de energia e de movimento para realizar previsões sobre seus comportamentos em situações cotidianas e em processos produtivos que priorizem o desenvolvimento sustentável, o uso consciente dos recursos naturais e a preservação da vida em todas as suas formas.",
  },
  {
    id: "bncc-em13chs101",
    area_id: "chs",
    code: "EM13CHS101",
    description:
      "Identificar, analisar e comparar diferentes fontes e narrativas expressas em diversas linguagens, com vistas à compreensão de ideias filosóficas e de processos e eventos históricos, geográficos, políticos, econômicos, sociais, ambientais e culturais.",
  },
  {
    id: "bncc-em13lgg101",
    area_id: "lgg",
    code: "EM13LGG101",
    description:
      "Compreender e analisar processos de produção e circulação de discursos, nas diferentes linguagens, para fazer escolhas fundamentadas em função de interesses pessoais e coletivos.",
  },
] as const;

/** Onde cada habilidade entra no recorte (1ª série, 1º bimestre). */
export const PROVISIONAL_PLAN: Array<{
  skillId: string;
  componentId: string;
  gradeCode: GradeCode;
  periodOrder: number;
  periodLabel: string;
}> = [
  { skillId: "bncc-em13mat101", componentId: "comp-mat-matematica", gradeCode: "em1", periodOrder: 1, periodLabel: "1º bimestre" },
  { skillId: "bncc-em13cnt101", componentId: "comp-cnt-fisica", gradeCode: "em1", periodOrder: 1, periodLabel: "1º bimestre" },
  { skillId: "bncc-em13chs101", componentId: "comp-chs-historia", gradeCode: "em1", periodOrder: 1, periodLabel: "1º bimestre" },
  { skillId: "bncc-em13lgg101", componentId: "comp-lgg-lingua-portuguesa", gradeCode: "em1", periodOrder: 1, periodLabel: "1º bimestre" },
];

export interface SyntheticItem {
  code: string;
  skillId: string;
  componentId: string;
  stem: string;
  options: QuestionOption[];
  answerKey: string;
  resolution: string;
  editorialDifficulty: EditorialDifficulty;
}

const opts = (...texts: string[]): QuestionOption[] =>
  texts.map((text, i) => ({ key: String.fromCharCode(65 + i), text }));

export const SYNTHETIC_ITEMS: SyntheticItem[] = [
  {
    code: "mat101-01",
    skillId: "bncc-em13mat101",
    componentId: "comp-mat-matematica",
    stem: "Uma caixa-d'água tinha 1.200 litros às 8h. Um registro foi aberto e o volume passou a diminuir sempre no mesmo ritmo, chegando a 600 litros às 11h. Qual foi a taxa de variação do volume, em litros por hora, nesse intervalo?",
    options: opts("−600 L/h", "−200 L/h", "−150 L/h", "200 L/h"),
    answerKey: "B",
    resolution: "Taxa de variação = (volume final − volume inicial) ÷ (tempo final − tempo inicial) = (600 − 1.200) ÷ (11 − 8) = −600 ÷ 3 = −200 L/h. O sinal negativo indica que o volume diminui.",
    editorialDifficulty: "facil",
  },
  {
    code: "mat101-02",
    skillId: "bncc-em13mat101",
    componentId: "comp-mat-matematica",
    stem: "O custo de uma corrida de aplicativo, em reais, é modelado por uma função afim da distância percorrida, em km. O gráfico dessa função passa pelos pontos (2, 14) e (6, 26). De acordo com esse modelo, quanto custa cada quilômetro adicional?",
    options: opts("R$ 2,00", "R$ 4,33", "R$ 3,00", "R$ 7,00"),
    answerKey: "C",
    resolution: "Em uma função afim, o custo por km é a taxa de variação (coeficiente angular): (26 − 14) ÷ (6 − 2) = 12 ÷ 4 = 3. Cada km adicional custa R$ 3,00. R$ 7,00 seria o custo médio por km na corrida de 2 km (14 ÷ 2), que inclui a parte fixa.",
    editorialDifficulty: "media",
  },
  {
    code: "cnt101-01",
    skillId: "bncc-em13cnt101",
    componentId: "comp-cnt-fisica",
    stem: "Um carrinho de montanha-russa parte do repouso no ponto mais alto de um trilho, a 20 m de altura. Desprezando atritos e a resistência do ar e adotando g = 10 m/s², qual é a velocidade do carrinho ao passar pelo ponto mais baixo do trilho, na altura 0 m?",
    options: opts("10 m/s", "14 m/s", "20 m/s", "200 m/s"),
    answerKey: "C",
    resolution: "Sem atritos, a energia mecânica se conserva: m·g·h = m·v²/2. Logo v = √(2·g·h) = √(2·10·20) = √400 = 20 m/s. A massa não interfere no resultado.",
    editorialDifficulty: "media",
  },
  {
    code: "cnt101-02",
    skillId: "bncc-em13cnt101",
    componentId: "comp-cnt-fisica",
    stem: "Uma lâmpada de potência 10 W fica acesa durante 2 horas. Quanta energia elétrica ela transforma em luz e calor nesse período?",
    options: opts("20 J", "1.200 J", "7.200 J", "72.000 J"),
    answerKey: "D",
    resolution: "Energia = potência × tempo. Em unidades do SI: 2 h = 7.200 s, então E = 10 W × 7.200 s = 72.000 J (equivale a 20 Wh). A alternativa A confunde W·h com joule.",
    editorialDifficulty: "facil",
  },
  {
    code: "chs101-01",
    skillId: "bncc-em13chs101",
    componentId: "comp-chs-historia",
    stem: "Uma estudante pesquisa a abolição da escravidão no Brasil (1888) e reúne três materiais: (I) o texto da Lei Áurea; (II) um anúncio de jornal de 1880 que oferece recompensa pela captura de uma pessoa escravizada que fugiu; (III) um livro didático publicado em 2015. Sobre esses materiais, é correto afirmar que",
    options: opts(
      "os três são fontes primárias, porque tratam do mesmo período.",
      "I e II são fontes produzidas na época estudada; III é uma interpretação posterior do processo.",
      "apenas III é confiável, porque foi escrito por especialistas.",
      "II não serve como fonte histórica, por ser um anúncio comercial.",
    ),
    answerKey: "B",
    resolution: "Fontes primárias são produzidas no período estudado (a lei e o anúncio de 1880). O livro de 2015 é uma produção posterior que interpreta o processo. Um anúncio comercial é fonte valiosa justamente por revelar práticas e valores da época.",
    editorialDifficulty: "facil",
  },
  {
    code: "chs101-02",
    skillId: "bncc-em13chs101",
    componentId: "comp-chs-historia",
    stem: "Dois jornais fictícios descrevem a mesma greve operária: um, financiado por donos de fábricas, chama o movimento de \"desordem promovida por agitadores\"; outro, mantido por uma associação de trabalhadores, fala em \"luta justa por salário e jornada\". Para compreender o evento, o procedimento mais adequado é",
    options: opts(
      "escolher o relato publicado primeiro, por estar mais próximo dos fatos.",
      "descartar os dois relatos, por serem parciais.",
      "comparar os relatos, identificar quem os produziu e com que interesses, e confrontá-los com outras fontes.",
      "considerar apenas o jornal de maior circulação.",
    ),
    answerKey: "C",
    resolution: "Toda fonte tem um ponto de vista. Em vez de descartá-las, o trabalho histórico compara narrativas, identifica autoria e interesses e cruza com outras evidências (documentos oficiais, registros sindicais, dados de salário).",
    editorialDifficulty: "media",
  },
  {
    code: "lgg101-01",
    skillId: "bncc-em13lgg101",
    componentId: "comp-lgg-lingua-portuguesa",
    stem: "Uma marca de refrigerantes patrocina uma campanha em redes sociais em que influenciadores repetem o bordão \"energia para o seu dia\". Ao analisar esse discurso, o aspecto MAIS relevante para uma escolha fundamentada de quem consome é",
    options: opts(
      "o número de seguidores dos influenciadores.",
      "a relação entre quem financia a mensagem e o interesse em vender o produto.",
      "a qualidade das imagens da campanha.",
      "o horário em que as postagens foram publicadas.",
    ),
    answerKey: "B",
    resolution: "Analisar a produção e a circulação de um discurso começa por perguntar quem o produz, quem paga e com qual interesse. Aqui o patrocínio indica finalidade comercial, o que muda a leitura do bordão.",
    editorialDifficulty: "facil",
  },
  {
    code: "lgg101-02",
    skillId: "bncc-em13lgg101",
    componentId: "comp-lgg-lingua-portuguesa",
    stem: "Uma informação sobre uma nova vacina circula em três lugares: no site de um órgão público de saúde, em um blog anônimo e em um áudio encaminhado em aplicativo de mensagens, sem autoria identificada. Antes de compartilhar, a atitude que melhor considera a produção e a circulação desses discursos é",
    options: opts(
      "verificar autoria, fonte e data e comparar com a publicação do órgão de saúde e de veículos reconhecidos.",
      "compartilhar o áudio, porque é o mais recente.",
      "confiar no blog, porque não tem vínculo com governos.",
      "compartilhar os três, para que cada pessoa decida.",
    ),
    answerKey: "A",
    resolution: "Autoria identificável, fonte, data e confronto com instituições responsáveis são critérios para avaliar um discurso antes de fazê-lo circular. Ser recente ou \"independente\" não garante confiabilidade.",
    editorialDifficulty: "media",
  },
];

export const SYNTHETIC_SOURCE = {
  kind: "autoral_iah" as const,
  title: "Itens sintéticos de demonstração — recorte provisório",
  rights_holder: "IAH Educacional",
  license: "Itens originais criados para demonstração do fluxo; uso restrito ao ambiente da escola parceira.",
  evidence: "Redigidos para este incremento; não reproduzem itens de terceiros (Enem, vestibulares, COC/Arco ou outros).",
};

function check(step: string, error: { message: string } | null) {
  if (error) throw new Error(`${step}: ${error.message}`);
}

/**
 * Catálogo de referência (áreas, componentes comuns, habilidades BNCC do
 * recorte). Idempotente. Exige cliente `service_role`: a referência
 * comum não é gravável pelo papel da aplicação.
 */
export async function loadReferenceCatalog(admin: SupabaseClient): Promise<void> {
  check("áreas", (await admin.from("curriculum_areas").upsert([...AREAS], { onConflict: "id" })).error);
  check(
    "componentes",
    (await admin.from("curriculum_components").upsert(
      REFERENCE_COMPONENTS.map((c) => ({ ...c, institution_id: null })),
      { onConflict: "id" },
    )).error,
  );
  check(
    "habilidades",
    (await admin.from("curriculum_skills").upsert(
      BNCC_SKILLS.map((s) => ({
        ...s,
        institution_id: null,
        framework: "bncc",
        component_id: s.area_id === "lgg" && s.code.startsWith("EM13LP") ? "comp-lgg-lingua-portuguesa" : null,
        source_reference: BNCC_REF,
      })),
      { onConflict: "id" },
    )).error,
  );
}

/**
 * Recorte provisório de UMA escola: planejamento (1ª série, 1º bim.),
 * fonte autoral verificada e itens sintéticos passando pelo fluxo
 * editorial real (rascunho → revisão → aprovação), com autor ≠ revisor
 * conferido pelo banco. Idempotente por ids determinísticos.
 */
export async function loadProvisionalCut(
  admin: SupabaseClient,
  target: {
    institutionId: string;
    academicYearId: string;
    /** Conta da escola registrada como autora dos itens sintéticos. */
    authorUserId: string;
    /** Conta da GESTÃO que verifica a fonte e revisa (≠ autora). */
    reviewerUserId: string;
  },
): Promise<{ planEntries: number; approvedVersions: number }> {
  const { institutionId, academicYearId, authorUserId, reviewerUserId } = target;
  if (authorUserId === reviewerUserId) throw new Error("Autor e revisor precisam ser contas diferentes.");

  check(
    "planejamento",
    (await admin.from("school_curriculum_plans").upsert(
      PROVISIONAL_PLAN.map((p) => ({
        id: `plan:${institutionId}:${academicYearId}:${p.gradeCode}:${p.periodOrder}:${p.skillId}`,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        grade_code: p.gradeCode,
        period_order: p.periodOrder,
        period_label: p.periodLabel,
        component_id: p.componentId,
        skill_id: p.skillId,
        status: "provisional",
        notes: RECORTE_PROVISORIO_LABEL,
        created_by: reviewerUserId,
      })),
      { onConflict: "id" },
    )).error,
  );

  const sourceId = `src:${institutionId}:sinteticos-recorte-provisorio`;
  const { data: existingSource } = await admin
    .from("content_sources").select("id, rights_status").eq("id", sourceId).maybeSingle();
  if (!existingSource) {
    check("fonte", (await admin.from("content_sources").insert({
      id: sourceId,
      institution_id: institutionId,
      created_by: authorUserId,
      ...SYNTHETIC_SOURCE,
    })).error);
  }
  if (existingSource?.rights_status !== "verificado") {
    check("verificação da fonte", (await admin.from("content_sources").update({
      rights_status: "verificado",
      rights_verified_by: reviewerUserId,
      rights_verified_at: new Date().toISOString(),
    }).eq("id", sourceId)).error);
  }

  let approved = 0;
  for (const item of SYNTHETIC_ITEMS) {
    const questionId = `q:${institutionId}:${item.code}`;
    const versionId = `qv:${institutionId}:${item.code}:1`;
    const { data: version } = await admin
      .from("question_versions").select("status").eq("id", versionId).maybeSingle();
    if (version?.status === "aprovada") {
      approved += 1;
      continue;
    }
    if (!version) {
      check(`questão ${item.code}`, (await admin.from("questions").upsert({
        id: questionId,
        institution_id: institutionId,
        component_id: item.componentId,
        skill_id: item.skillId,
        created_by: authorUserId,
      }, { onConflict: "id" })).error);
      check(`versão ${item.code}`, (await admin.from("question_versions").insert({
        id: versionId,
        institution_id: institutionId,
        question_id: questionId,
        version: 1,
        stem: item.stem,
        options: item.options,
        editorial_difficulty: item.editorialDifficulty,
        source_id: sourceId,
        authorship: "Equipe IAH — item sintético de demonstração",
        created_by: authorUserId,
      })).error);
      check(`gabarito ${item.code}`, (await admin.from("question_version_keys").insert({
        version_id: versionId,
        institution_id: institutionId,
        answer_key: item.answerKey,
        resolution: item.resolution,
      })).error);
    }
    if (!version || version.status === "rascunho") {
      check(`envio ${item.code}`, (await admin.from("question_versions")
        .update({ status: "em_revisao" }).eq("id", versionId)).error);
    }
    check(`revisão ${item.code}`, (await admin.from("question_reviews").insert({
      id: `rev:${versionId}:carga`,
      institution_id: institutionId,
      version_id: versionId,
      reviewer_id: reviewerUserId,
      decision: "aprovada",
      checklist: { gabarito: true, habilidade: true, direitos: true, linguagem: true },
      comment: "Revisão de carga do recorte provisório (dados sintéticos). Revisar de novo com a equipe da escola antes de uso real.",
    })).error);
    approved += 1;
  }

  return { planEntries: PROVISIONAL_PLAN.length, approvedVersions: approved };
}
