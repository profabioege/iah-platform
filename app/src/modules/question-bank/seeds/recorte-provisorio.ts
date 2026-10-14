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
  // Fonte sintética (0022): diagnóstico com estes itens é sempre demonstrativo.
  check("fonte sintética", (await admin.from("content_sources").update({ synthetic: true }).eq("id", sourceId)).error);
  if (existingSource?.rights_status !== "verificado") {
    check("verificação da fonte", (await admin.from("content_sources").update({
      rights_status: "verificado",
      rights_verified_by: reviewerUserId,
      rights_verified_at: new Date().toISOString(),
    }).eq("id", sourceId)).error);
  }

  const approved = await approveSyntheticItems(admin, target, sourceId, SYNTHETIC_ITEMS, "Equipe IAH — item sintético de demonstração");
  return { planEntries: PROVISIONAL_PLAN.length, approvedVersions: approved };
}

/**
 * Passa itens sintéticos pelo fluxo editorial real (rascunho → revisão →
 * aprovação pela GESTÃO ≠ autora). Idempotente por ids determinísticos.
 */
async function approveSyntheticItems(
  admin: SupabaseClient,
  target: { institutionId: string; authorUserId: string; reviewerUserId: string },
  sourceId: string,
  items: SyntheticItem[],
  authorship: string,
): Promise<number> {
  const { institutionId, authorUserId, reviewerUserId } = target;
  let approved = 0;
  for (const item of items) {
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
        authorship,
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

  return approved;
}

/**
 * ITENS DEMONSTRATIVOS DO DIAGNÓSTICO (D-054) — 2 por habilidade do
 * recorte, para que cada etapa tenha 4 questões (o diagnóstico não lê uma
 * habilidade com menos de 3 respostas). Sintéticos, escritos pela equipe
 * IAH em 09/10/2026 e PENDENTES DE REVISÃO DOCENTE: a aprovação feita
 * pela carga é de uma conta sintética de gestão, não de um professor.
 * Mesma fonte sintética do recorte → todo diagnóstico com eles é
 * marcado como demonstrativo pelo banco (0022).
 */
export const DEMONSTRATIVE_DIAGNOSTIC_ITEMS: SyntheticItem[] = [
  {
    code: "mat101-03",
    skillId: "bncc-em13mat101",
    componentId: "comp-mat-matematica",
    stem: "A população de uma cidade fictícia era de 50.000 habitantes em 2010 e de 62.000 habitantes em 2020. Supondo que o crescimento tenha sido linear, qual foi o aumento médio de habitantes por ano nesse período?",
    options: opts("1.200 habitantes por ano", "12.000 habitantes por ano", "6.200 habitantes por ano", "1.120 habitantes por ano"),
    answerKey: "A",
    resolution: "Taxa de variação = (62.000 − 50.000) ÷ (2020 − 2010) = 12.000 ÷ 10 = 1.200 habitantes por ano. 12.000 é o aumento total, não o anual.",
    editorialDifficulty: "facil",
  },
  {
    code: "mat101-04",
    skillId: "bncc-em13mat101",
    componentId: "comp-mat-matematica",
    stem: "O tanque de um caminhão tem 300 litros e o consumo é constante: 25 litros a cada 100 km. Partindo com o tanque cheio, depois de quantos quilômetros restarão 100 litros?",
    options: opts("400 km", "800 km", "1.200 km", "200 km"),
    answerKey: "B",
    resolution: "Serão consumidos 300 − 100 = 200 litros. Como o consumo é de 25 L a cada 100 km, 200 L correspondem a (200 ÷ 25) × 100 = 800 km. 1.200 km seria o percurso até esvaziar o tanque.",
    editorialDifficulty: "media",
  },
  {
    code: "cnt101-03",
    skillId: "bncc-em13cnt101",
    componentId: "comp-cnt-fisica",
    stem: "Uma bola de 0,5 kg é solta, a partir do repouso, de uma altura de 5 m. Desprezando a resistência do ar e adotando g = 10 m/s², qual é a energia cinética da bola imediatamente antes de tocar o chão?",
    options: opts("2,5 J", "25 J", "50 J", "250 J"),
    answerKey: "B",
    resolution: "Sem perdas, a energia potencial gravitacional vira energia cinética: E = m·g·h = 0,5 × 10 × 5 = 25 J.",
    editorialDifficulty: "facil",
  },
  {
    code: "cnt101-04",
    skillId: "bncc-em13cnt101",
    componentId: "comp-cnt-fisica",
    stem: "Em um recipiente fechado, 12 g de carbono reagem completamente com 32 g de oxigênio e formam gás carbônico, sem sobra de reagentes. Qual é a massa de gás carbônico formada?",
    options: opts("20 g", "32 g", "44 g", "12 g"),
    answerKey: "C",
    resolution: "Em sistema fechado a massa se conserva (Lei de Lavoisier): 12 g + 32 g = 44 g de gás carbônico.",
    editorialDifficulty: "facil",
  },
  {
    code: "chs101-03",
    skillId: "bncc-em13chs101",
    componentId: "comp-chs-historia",
    stem: "Um pesquisador encontra uma carta escrita em 1850 por um fazendeiro que descreve a vida nas plantações como \"harmoniosa\". Para usar essa carta como fonte histórica, a atitude mais adequada é",
    options: opts(
      "aceitá-la como retrato fiel, porque foi escrita na época.",
      "descartá-la, porque é parcial.",
      "considerar quem escreveu, para quem e com que interesse, e confrontá-la com outras fontes, como relatos de pessoas escravizadas e registros de fugas.",
      "usá-la apenas se tiver firma reconhecida.",
    ),
    answerKey: "C",
    resolution: "Ser da época não torna a fonte neutra: o autor tinha interesse em apresentar a escravidão como \"harmoniosa\". A carta é útil justamente para estudar esse ponto de vista, desde que comparada com outras fontes.",
    editorialDifficulty: "facil",
  },
  {
    code: "chs101-04",
    skillId: "bncc-em13chs101",
    componentId: "comp-chs-historia",
    stem: "Uma fotografia mostra trabalhadores reunidos em uma praça durante uma greve. Sobre o uso de fotografias como fonte histórica, é correto afirmar que",
    options: opts(
      "mostram os fatos exatamente como aconteceram, sem interpretação.",
      "são produzidas por alguém que escolhe enquadramento e momento, e precisam ser lidas com autoria, contexto e circulação.",
      "só têm valor quando acompanhadas de um documento oficial.",
      "não servem para estudar movimentos sociais.",
    ),
    answerKey: "B",
    resolution: "Fotografia também é narrativa: quem fotografou escolheu o que mostrar e o que deixar de fora. Por isso se pergunta quem fez, quando, para quem e onde a imagem circulou.",
    editorialDifficulty: "media",
  },
  {
    code: "lgg101-03",
    skillId: "bncc-em13lgg101",
    componentId: "comp-lgg-lingua-portuguesa",
    stem: "Um vídeo curto viraliza com a legenda \"cientistas comprovam que dormir 4 horas é suficiente\", sem citar estudo, instituição ou data. O vídeo foi publicado por um perfil que vende suplementos \"para render mais\". A análise mais adequada da produção e da circulação desse discurso é",
    options: opts(
      "se viralizou, a informação foi aceita por muitos e deve ser verdadeira.",
      "a falta de fonte e o interesse comercial do perfil exigem verificar em fontes científicas antes de aceitar ou compartilhar.",
      "por ser vídeo, é mais confiável do que um texto.",
      "basta ler os comentários para saber se é verdade.",
    ),
    answerKey: "B",
    resolution: "Quem produz (um vendedor de suplementos), com que interesse (vender) e com que base (nenhuma fonte citada) são perguntas centrais. Popularidade e formato não garantem veracidade.",
    editorialDifficulty: "facil",
  },
  {
    code: "lgg101-04",
    skillId: "bncc-em13lgg101",
    componentId: "comp-lgg-lingua-portuguesa",
    stem: "Uma prefeitura publica um cartaz: \"Vacinação contra a gripe de 1º a 30 de maio, nas unidades básicas de saúde, para pessoas acima de 60 anos\". Um perfil de humor posta uma montagem do cartaz trocando a data por \"só até amanhã\". O que distingue os dois discursos?",
    options: opts(
      "Nada: as imagens são iguais.",
      "O cartaz tem autoria institucional e finalidade informativa; a montagem altera o conteúdo com outra finalidade e pode desinformar se circular fora de contexto.",
      "A montagem é mais confiável por ser mais recente.",
      "O cartaz é opinião e a montagem é informação.",
    ),
    answerKey: "B",
    resolution: "Mesmo com aparência parecida, produção (autoria, finalidade) e circulação (onde e como chega) mudam o sentido. Fora do contexto do humor, a montagem vira desinformação.",
    editorialDifficulty: "media",
  },
];

/**
 * Carrega os itens demonstrativos do diagnóstico na escola, pela mesma
 * fonte sintética do recorte. Exige `loadProvisionalCut` antes.
 */
export async function loadDemonstrativeDiagnosticItems(
  admin: SupabaseClient,
  target: { institutionId: string; authorUserId: string; reviewerUserId: string },
): Promise<number> {
  if (target.authorUserId === target.reviewerUserId) throw new Error("Autor e revisor precisam ser contas diferentes.");
  const sourceId = `src:${target.institutionId}:sinteticos-recorte-provisorio`;
  return approveSyntheticItems(
    admin,
    target,
    sourceId,
    DEMONSTRATIVE_DIAGNOSTIC_ITEMS,
    "Equipe IAH — item sintético DEMONSTRATIVO do diagnóstico, pendente de revisão docente",
  );
}
