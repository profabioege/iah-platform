import type { IahConnectionEntry } from "../../domain/entities";

/**
 * Conexões autorais curadas do IAH — o coração do catálogo mínimo.
 * Cada registro liga um conjunto de palavras-chave conceituais a um
 * eixo IAH e a um problema contemporâneo. "Mais-valia" tem o conjunto
 * mais completo (caso de validação obrigatório); outros conceitos têm
 * cobertura parcial de propósito, para exercitar honestamente o
 * caminho de "baixa confiança / sem correspondência" quando o professor
 * digitar um termo ainda não curado.
 */
export const IAH_CONNECTIONS: IahConnectionEntry[] = [
  // Mais-valia — História / Revolução Industrial (caso de validação obrigatório)
  {
    id: "conn-mais-valia-automacao",
    conceptKeywords: ["mais-valia", "mais valia", "revolucao industrial", "capitalismo industrial"],
    iahAxisId: "axis-trabalho-sociedade",
    title: "Automação e transformação do trabalho",
    contemporaryProblem: "Automação e transformação do trabalho pela Inteligência Artificial",
    rationale:
      "Assim como a maquinaria fabril alterou a relação entre trabalho e valor na Revolução Industrial, a automação por IA redefine hoje quem produz valor e como ele é medido.",
    investigativeQuestion: "O que muda na relação entre trabalho humano e valor produzido quando tarefas são automatizadas por IA?",
    suggestedActivity: "Comparar, em grupos, um processo de trabalho industrial do século XIX com um processo automatizado por IA atual, identificando o que se manteve e o que mudou na relação trabalho-valor.",
    learningEvidence: "Registro escrito comparando as duas situações, usando o conceito de mais-valia em ambos os contextos.",
    referenceIds: ["ref-metodo-iah", "ref-bncc-em"],
    confidence: 0.92,
    validationStatus: "validated",
  },
  {
    id: "conn-mais-valia-produtividade",
    conceptKeywords: ["mais-valia", "mais valia", "produtividade", "capitalismo industrial"],
    iahAxisId: "axis-trabalho-sociedade",
    title: "Inteligência Artificial e produtividade",
    contemporaryProblem: "Ganhos de produtividade gerados por sistemas de Inteligência Artificial",
    rationale:
      "A mais-valia depende do aumento da produtividade sem aumento proporcional do salário — sistemas de IA hoje multiplicam a produtividade de formas que ecoam esse mecanismo histórico.",
    investigativeQuestion: "Quando a IA aumenta a produtividade de um trabalhador, quem se apropria desse ganho?",
    suggestedActivity: "Levantar exemplos reais de ferramentas de IA usadas no trabalho e discutir, com dados, se e como o ganho de produtividade se reflete na remuneração.",
    learningEvidence: "Lista de exemplos com uma análise escrita de quem se beneficia do ganho de produtividade em cada caso.",
    referenceIds: ["ref-metodo-iah"],
    confidence: 0.88,
    validationStatus: "validated",
  },
  {
    id: "conn-mais-valia-plataformas",
    conceptKeywords: ["mais-valia", "mais valia", "trabalho assalariado", "globalizacao"],
    iahAxisId: "axis-trabalho-sociedade",
    title: "Trabalho em plataformas digitais",
    contemporaryProblem: "Economia de plataformas e trabalho intermediado por aplicativos",
    rationale:
      "Trabalhadores de plataformas digitais produzem valor mediado por algoritmos de gestão — um caso contemporâneo direto da relação entre trabalho, valor e apropriação discutida por Marx.",
    investigativeQuestion: "Como a intermediação algorítmica de plataformas digitais reconfigura a apropriação do valor produzido pelo trabalho?",
    suggestedActivity: "Analisar, a partir de relatos ou reportagens, como plataformas de entrega ou transporte distribuem o valor gerado entre empresa, algoritmo e trabalhador.",
    learningEvidence: "Esquema visual (mapa conceitual) representando o fluxo de valor entre trabalhador, plataforma e consumidor.",
    referenceIds: ["ref-metodo-iah"],
    confidence: 0.9,
    validationStatus: "validated",
  },
  {
    id: "conn-mais-valia-gestao-algoritmica",
    conceptKeywords: ["mais-valia", "mais valia", "trabalho assalariado", "dados e algoritmos"],
    iahAxisId: "axis-dados-algoritmos",
    title: "Gestão algorítmica do trabalho",
    contemporaryProblem: "Sistemas algorítmicos supervisionando e avaliando o trabalho humano",
    rationale:
      "Quando algoritmos definem ritmo, avaliação e remuneração do trabalho, a extração de mais-valia passa a ser mediada por decisões automatizadas, não só por gestores humanos.",
    investigativeQuestion: "O que muda quando quem define o ritmo e a avaliação do trabalho é um sistema algorítmico?",
    suggestedActivity: "Debate estruturado sobre vantagens e riscos da gestão algorítmica do trabalho, com base em casos reais levantados pela turma.",
    learningEvidence: "Argumentos escritos de defesa e contraponto, com pelo menos uma evidência concreta cada.",
    referenceIds: ["ref-metodo-iah", "ref-bncc-computacao"],
    confidence: 0.85,
    validationStatus: "validated",
  },
  {
    id: "conn-mais-valia-distribuicao-valor",
    conceptKeywords: ["mais-valia", "mais valia", "capitalismo industrial"],
    iahAxisId: "axis-poder-desigualdade",
    title: "Distribuição do valor produzido",
    contemporaryProblem: "Distribuição desigual do valor gerado por sistemas automatizados",
    rationale:
      "A pergunta histórica sobre quem fica com o excedente do trabalho se atualiza quando parte da produção de valor passa a ser feita por sistemas automatizados, não só por pessoas.",
    investigativeQuestion: "Quando um sistema de IA participa da produção de valor, como esse valor deveria ser distribuído entre empresa, trabalhador e sociedade?",
    suggestedActivity: "Simulação de negociação coletiva envolvendo empresa, trabalhadores e um sistema automatizado fictício, decidindo a divisão dos ganhos de produtividade.",
    learningEvidence: "Registro da proposta de distribuição elaborada por cada grupo, com justificativa.",
    referenceIds: ["ref-metodo-iah"],
    confidence: 0.83,
    validationStatus: "validated",
  },
  {
    id: "conn-mais-valia-concentracao-renda",
    conceptKeywords: ["mais-valia", "mais valia", "globalizacao", "colonizacao da america"],
    iahAxisId: "axis-poder-desigualdade",
    title: "Concentração de renda e tecnologia",
    contemporaryProblem: "Concentração de renda associada ao controle de tecnologias de IA",
    rationale:
      "Assim como a industrialização concentrou riqueza em quem controlava os meios de produção, o controle de infraestrutura e dados de IA hoje tende a concentrar valor de forma semelhante.",
    investigativeQuestion: "Que paralelos existem entre a concentração de riqueza na industrialização e a concentração de poder em torno da IA hoje?",
    suggestedActivity: "Pesquisa dirigida sobre quem controla as principais infraestruturas de IA atualmente e discussão sobre paralelos históricos.",
    learningEvidence: "Síntese escrita relacionando concentração industrial histórica e concentração tecnológica contemporânea.",
    referenceIds: ["ref-metodo-iah", "ref-bncc-em"],
    confidence: 0.8,
    validationStatus: "validated",
  },
  {
    id: "conn-mais-valia-transformacao-trabalho-ia",
    conceptKeywords: ["mais-valia", "mais valia", "revolucao industrial", "trabalho assalariado"],
    iahAxisId: "axis-trabalho-sociedade",
    title: "Transformação do trabalho pela Inteligência Artificial",
    contemporaryProblem: "Reconfiguração de profissões e postos de trabalho por sistemas de IA",
    rationale:
      "Toda revolução tecnológica redefine que trabalho existe e quem o realiza — entender a Revolução Industrial ajuda a interpretar com mais critério a transformação atual do trabalho pela IA.",
    investigativeQuestion: "Quem se apropria do valor produzido quando trabalhadores utilizam sistemas de Inteligência Artificial?",
    suggestedActivity: "Linha do tempo comparando transformações do trabalho na Revolução Industrial e transformações do trabalho pela IA na atualidade.",
    learningEvidence: "Linha do tempo produzida em grupo, com pelo menos três pontos de comparação justificados.",
    referenceIds: ["ref-metodo-iah", "ref-bncc-em"],
    confidence: 0.93,
    validationStatus: "validated",
  },

  // Fake news — Linguagens
  {
    id: "conn-fake-news-verificacao",
    conceptKeywords: ["fake news", "desinformacao", "verificacao de fontes"],
    iahAxisId: "axis-pensamento-critico",
    title: "Verificação de fontes na era da IA generativa",
    contemporaryProblem: "Desinformação amplificada por sistemas de recomendação e geração automática de conteúdo",
    rationale:
      "Sistemas de IA hoje tanto disseminam quanto ajudam a checar desinformação — entender esse duplo papel é central para o letramento midiático contemporâneo.",
    investigativeQuestion: "Como distinguir informação verificável de desinformação quando o conteúdo pode ter sido gerado ou amplificado por IA?",
    suggestedActivity: "Checar, em grupos, a origem e veracidade de notícias reais usando critérios de verificação de fontes.",
    learningEvidence: "Relatório de verificação com os critérios usados e a conclusão sobre cada notícia analisada.",
    referenceIds: ["ref-metodo-iah", "ref-curriculo-paulista"],
    confidence: 0.87,
    validationStatus: "validated",
  },
  {
    id: "conn-fake-news-algoritmos-recomendacao",
    conceptKeywords: ["fake news", "desinformacao", "generos textuais"],
    iahAxisId: "axis-dados-algoritmos",
    title: "Algoritmos de recomendação e bolhas informacionais",
    contemporaryProblem: "Personalização algorítmica de conteúdo e formação de bolhas informacionais",
    rationale:
      "Algoritmos de recomendação priorizam conteúdo por engajamento, não por veracidade — compreender esse mecanismo é parte de entender como fake news circulam.",
    investigativeQuestion: "Por que um algoritmo de recomendação pode amplificar desinformação mesmo sem essa intenção?",
    suggestedActivity: "Mapear coletivamente como diferentes tipos de conteúdo (verdadeiro, falso, sensacionalista) tendem a se espalhar em redes sociais.",
    learningEvidence: "Mapa produzido pela turma relacionando tipo de conteúdo e potencial de disseminação.",
    referenceIds: ["ref-metodo-iah", "ref-bncc-computacao"],
    confidence: 0.78,
    validationStatus: "validated",
  },

  // Seleção natural — Ciências da Natureza
  {
    id: "conn-selecao-natural-algoritmos-geneticos",
    conceptKeywords: ["selecao natural", "evolucao das especies", "adaptacao"],
    iahAxisId: "axis-dados-algoritmos",
    title: "Algoritmos evolutivos inspirados na seleção natural",
    contemporaryProblem: "Sistemas de IA que usam princípios evolutivos para otimizar soluções",
    rationale:
      "Algoritmos evolutivos aplicam artificialmente a lógica de variação e seleção da evolução biológica para encontrar soluções otimizadas em problemas complexos.",
    investigativeQuestion: "Em que sentido um algoritmo evolutivo 'seleciona' soluções da mesma forma que a natureza seleciona características?",
    suggestedActivity: "Simular manualmente, em pequenos grupos, um processo simplificado de seleção de soluções ao longo de gerações, comparando com a seleção natural biológica.",
    learningEvidence: "Registro da simulação com a identificação explícita das semelhanças e diferenças com a seleção natural.",
    referenceIds: ["ref-metodo-iah", "ref-bncc-em"],
    confidence: 0.75,
    validationStatus: "in_review",
  },
  {
    id: "conn-selecao-natural-vies-treinamento",
    conceptKeywords: ["selecao natural", "variabilidade genetica", "etica em ia"],
    iahAxisId: "axis-etica-responsabilidade",
    title: "Viés em dados de treinamento e seleção de características",
    contemporaryProblem: "Viés algorítmico originado na seleção de dados usados para treinar sistemas de IA",
    rationale:
      "Assim como a variabilidade genética é matéria-prima da seleção natural, a variabilidade (ou falta dela) nos dados de treinamento molda o que um sistema de IA aprende a reconhecer.",
    investigativeQuestion: "O que acontece quando os dados usados para 'selecionar' um comportamento de IA não representam toda a variabilidade real de uma população?",
    suggestedActivity: "Analisar um caso real relatado de viés algorítmico e relacioná-lo à ideia de amostra não representativa.",
    learningEvidence: "Análise escrita conectando o caso de viés a um conceito biológico de variabilidade e representatividade.",
    referenceIds: ["ref-metodo-iah"],
    confidence: 0.72,
    validationStatus: "in_review",
  },
];
