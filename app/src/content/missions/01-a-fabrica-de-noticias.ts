import type { Mission } from "@/modules/library";

/**
 * Missão 01 — A Fábrica de Notícias.
 *
 * Implementação oficial de referência do padrão de Missão do IAH.
 * Ao criar novas Missões, siga docs/MISSION_TEMPLATE.md e use este
 * arquivo como modelo. Cada bloco abaixo corresponde a um dos 11
 * blocos da estrutura padrão (docs/MISSION.md).
 *
 * ------------------------------------------------------------------
 * CHAVE DO PROFESSOR (não exibida ao aluno — uso exclusivo de quem
 * conduz a aula). Os quatro itens do Dossiê são fictícios, escritos
 * para esta Missão (SIMULAÇÃO DIDÁTICA); nenhum se refere a fato,
 * veículo, instituição ou pessoa real. Por isso nenhum deles pode ser
 * declarado verdadeiro ou falso: a chave orienta a ANÁLISE — o que o
 * texto mostra, o que ele não permite saber e o que precisaria ser
 * checado fora dele se fosse uma notícia real. Não exija pesquisar as
 * instituições: elas não existem.
 *
 *   Item 1 (merenda com IA em Vale Novo) — reúne mais indícios.
 *     Indícios: órgão público nomeado (Secretaria de Educação), escopo
 *     modesto e checável (6 escolas, piloto de 60 dias), avaliação
 *     anunciada antes de expandir, tom informativo, sem urgência.
 *     Limites: não traz data, nome de quem falou nem documento oficial.
 *     Checagem numa notícia real: publicação oficial da prefeitura
 *     (site, diário oficial) e outro veículo local.
 *   Item 2 (estudo do IBEE) — reúne mais indícios.
 *     Indícios: metodologia declarada (amostra, faixa etária, período,
 *     margem de erro), instituição nomeada, conclusão qualificada
 *     ("uso crescente"), não absoluta.
 *     Limites: não informa o percentual nem como a amostra foi escolhida;
 *     a nota técnica não é apresentada.
 *     Checagem numa notícia real: a nota técnica original no site do
 *     instituto e a existência e o histórico do instituto.
 *   Item 3 (97% dos professores substituídos) — reúne mais alertas.
 *     Alertas: estatística extrema sem metodologia, fonte vaga
 *     ("especialistas"), apelo de urgência ("compartilhe antes que
 *     apaguem"), escopo nacional sem atribuição, sem veículo.
 *     Limites: nada no texto permite localizar a pesquisa.
 *     Checagem numa notícia real: a pesquisa original e agências de
 *     checagem; o próprio texto não oferece por onde começar.
 *   Item 4 (robô que aprova o ENEM sozinho) — reúne mais alertas.
 *     Alertas: afirmação desproporcional (100%, sozinho), página sem
 *     editor, escola e aluno não identificados, imagem com
 *     inconsistência física (garra de seis dedos, sombra contra a luz).
 *     Limites: o texto não diz quem fez a foto nem a prova aplicada.
 *     Checagem numa notícia real: busca reversa da imagem e fontes
 *     oficiais sobre o resultado do exame.
 *
 * Aceite qualquer conclusão SUSTENTADA por indícios ou alertas do texto
 * e que nomeie um limite e uma checagem. "Reúne mais indícios" não é
 * "é verdadeiro"; "reúne mais alertas" não é "é falso". Use esta chave
 * para mediar o debate após a entrega — nunca para "corrigir" o aluno
 * antes da investigação.
 * ------------------------------------------------------------------
 */
export const missionAFabricaDeNoticias: Mission = {
  id: "01-a-fabrica-de-noticias",
  number: 1,
  module: "Módulo 1 — O Auditor da Realidade",
  order: 1,
  status: "published",

  // 1. Título
  title: "A Fábrica de Notícias",

  // 2. Objetivo
  objective:
    "Compreender que a Inteligência Artificial generativa é capaz de produzir " +
    "textos convincentes sem nenhuma garantia de verdade — e desenvolver os " +
    "primeiros critérios objetivos para avaliar a confiabilidade de uma " +
    "informação antes de formar opinião sobre ela. Ao final, o estudante " +
    "assume, pela primeira vez, a postura de Auditor da Realidade: alguém que " +
    "não aceita um conteúdo por parecer verdadeiro, sabe nomear os indícios e " +
    "os sinais de alerta que encontrou e reconhece o que ainda precisaria ser " +
    "checado.",

  // 3. Pergunta Norteadora
  guidingQuestion:
    "Se uma máquina pode escrever qualquer notícia, quem — ou o quê — decide o " +
    "que é verdade?",

  // 4. Contexto
  context:
    "Hoje, uma Inteligência Artificial escreve uma reportagem inteira em " +
    "segundos, cria a foto de um acontecimento que nunca ocorreu e imita o tom " +
    "de qualquer jornal. Parte do que circula nas redes já não foi escrita por " +
    "pessoas — e nem sempre é possível notar. Isso não significa que toda " +
    "notícia é falsa; significa que parecer verdadeiro deixou de ser prova de " +
    "que algo é verdadeiro. Esta missão é uma SIMULAÇÃO DIDÁTICA: os quatro " +
    "textos do Dossiê de Auditoria foram criados para esta investigação, e as " +
    "cidades, instituições e pessoas citadas são fictícias — não adianta " +
    "procurá-las. Seu trabalho não é descobrir qual texto é verdadeiro, e sim " +
    "fazer o que todo auditor faz: registrar uma hipótese inicial, aplicar um " +
    "método e chegar a uma conclusão fundamentada — os indícios de " +
    "confiabilidade, os sinais de alerta e os limites do que o texto permite " +
    "saber.",

  // 5. Material Didático — o Dossiê de Auditoria completo
  didacticMaterials: [
    'Texto-base "Como uma IA escreve uma notícia" — leitura curta (~1 página) ' +
      "sobre como modelos de linguagem geram texto plausível sem verificar fatos.",

    "DOSSIÊ · Item 1 — \"Prefeitura de Vale Novo testa aplicativo de merenda " +
      'com IA em 6 escolas" (Jornal Vale Novo, seção Cidade). A Secretaria de ' +
      "Educação do município autorizou um piloto de 60 dias em seis unidades " +
      "da rede básica; segundo a Secretaria, o app sugere cardápios a partir do " +
      "estoque disponível e do histórico de desperdício de cada cozinha, e o " +
      "resultado será avaliado antes de qualquer decisão de expansão.",

    "DOSSIÊ · Item 2 — \"Estudo aponta uso crescente de IA generativa por " +
      'adolescentes brasileiros" (nota técnica do Instituto Brasileiro de ' +
      "Estudos em Educação — IBEE). Levantamento com 1.842 estudantes de 14 a " +
      "17 anos, de outubro a dezembro do ano passado, margem de erro de 3 " +
      "pontos percentuais: a proporção que declarou já ter usado alguma " +
      "ferramenta de IA generativa para tarefas escolares cresceu em relação " +
      "ao levantamento anterior do instituto.",

    "DOSSIÊ · Item 3 — \"Estudo aponta que 97% dos professores já foram " +
      'substituídos por IA nas escolas particulares do país" (compartilhado ' +
      "em grupos de mensagens, sem veículo assinado). O texto afirma que " +
      '"especialistas em educação" chegaram a esse número, pede para o leitor ' +
      '"compartilhar antes que apaguem a notícia" e não cita nome de instituição, ' +
      "metodologia, tamanho de amostra nem período da pesquisa.",

    "DOSSIÊ · Item 4 — \"Aluno de 14 anos cria robô que aprova sozinho 100% " +
      'das provas do ENEM, diz página de tecnologia" (publicado em uma página ' +
      "regional sem editor identificado). A foto que ilustra a matéria mostra " +
      "o robô segurando uma caneta com uma garra de seis dedos, e a sombra " +
      "projetada no chão aponta para um lado diferente da luz que ilumina a " +
      "cena. A matéria não identifica a escola nem o nome completo do aluno.",

    "GUIA DE INVESTIGAÇÃO · Fonte — Pergunta: Quem assina esta informação? " +
      "| Explicação: Veja se o texto identifica a pessoa, o cargo, o veículo ou " +
      "a instituição responsável. Numa notícia real, o passo seguinte seria " +
      "confirmar, fora do texto, que essa fonte existe e disse isso; nesta " +
      "simulação, anote o que o texto informa e o que precisaria ser conferido. " +
      '| Sinal de alerta: Expressões como "especialistas dizem" ou "estudo ' +
      'aponta" sem identificar a fonte. ' +
      '| Exemplo: Uma notícia cita "pesquisadores", mas não informa nomes, ' +
      "universidade ou link para o estudo.",

    "GUIA DE INVESTIGAÇÃO · Data e escopo — Pergunta: Quando e onde isso " +
      "aconteceu? " +
      "| Explicação: Procure datas, lugares e recortes específicos que " +
      "poderiam ser verificados. " +
      '| Sinal de alerta: Expressões vagas como "no país", "recentemente" ou ' +
      '"todo mundo". ' +
      '| Exemplo: O texto afirma que algo ocorreu "em várias escolas", mas ' +
      "não diz quais, onde ou quando.",

    "GUIA DE INVESTIGAÇÃO · Evidência — Pergunta: Que prova sustenta essa " +
      "afirmação? " +
      "| Explicação: Observe se o texto informa a origem dos números e o " +
      "método usado. Pergunte também o que precisaria ser confirmado em outras " +
      "fontes, se fosse uma notícia real. " +
      "| Sinal de alerta: Percentuais muito precisos sem metodologia, amostra " +
      "ou margem de erro. " +
      '| Exemplo: A manchete apresenta "97% das pessoas", mas não informa ' +
      "quem realizou a pesquisa.",

    "GUIA DE INVESTIGAÇÃO · Linguagem — Pergunta: O texto quer informar ou " +
      "provocar uma reação imediata? " +
      "| Explicação: Observe palavras que despertam medo, indignação ou " +
      "urgência antes de apresentar evidências. " +
      '| Sinal de alerta: Pedidos como "compartilhe antes que apaguem". ' +
      "| Exemplo: O texto tenta convencer o leitor pela emoção, sem oferecer " +
      "fontes verificáveis.",

    "GUIA DE INVESTIGAÇÃO · Coerência interna — Pergunta: Os detalhes " +
      "apresentados fazem sentido juntos? " +
      "| Explicação: Compare imagens, datas, sombras, textos, proporções e " +
      "contradições dentro do próprio material. " +
      "| Sinal de alerta: Elementos fisicamente impossíveis ou informações " +
      "que se contradizem. " +
      "| Exemplo: Uma imagem apresenta sombras em direções incompatíveis ou " +
      "textos deformados dentro da cena.",

    "CRITÉRIOS DE AUDITORIA · Indícios de confiabilidade: fonte identificada " +
      "(pessoa, cargo, veículo ou instituição), dado com metodologia declarada " +
      "(amostra, período, margem de erro), escopo específico, tom informativo.",

    "CRITÉRIOS DE AUDITORIA · Sinais de alerta: \"especialistas dizem\" sem " +
      "nome, estatística extrema sem metodologia, apelo para compartilhar com " +
      "urgência, imagem com detalhe fisicamente inconsistente.",

    "CRITÉRIOS DE AUDITORIA · Limites e checagem: o que o texto não permite " +
      "saber e o que precisaria ser conferido fora dele — documento original, " +
      "outra fonte independente, busca da imagem — se fosse uma notícia real.",

    "CRITÉRIOS DE AUDITORIA · Regra de ouro: nenhum texto se prova verdadeiro " +
      "ou falso só pela aparência. Uma conclusão válida nomeia pelo menos um " +
      "indício ou sinal de alerta presente no texto, um limite da informação " +
      "disponível e a checagem que uma notícia real exigiria. Nesta simulação, " +
      "não é preciso pesquisar as instituições citadas: elas são fictícias.",
  ],

  // 6. Ferramentas de IA
  aiTools: [
    "Assistente de IA de texto aprovado pela escola — usado depois da " +
      "auditoria, para gerar uma manchete de SIMULAÇÃO DIDÁTICA sobre a cidade " +
      "fictícia de Vale Novo e analisar por que ela soa convincente. Aqui a IA " +
      "é objeto de estudo, não fonte de resposta. Sem ferramenta disponível " +
      "para os alunos, o professor faz a geração na tela (Plano B) e cada " +
      "aluno analisa o texto projetado.",
  ],

  // 7. Desafio
  challenge:
    "Audite o Dossiê em duas passadas. Primeiro, para cada um dos 4 itens, " +
    "registre sua hipótese inicial — o que seu instinto diz antes de investigar, " +
    "em uma frase. Depois, aplique o Guia de Investigação e os Critérios de " +
    "Auditoria item por item e escreva uma conclusão fundamentada: os indícios " +
    "de confiabilidade e os sinais de alerta que o texto apresenta, o que ele " +
    "não permite saber e qual checagem uma notícia real exigiria — nunca " +
    'com "achismo". Por fim, gere com o assistente de IA (ou acompanhe a ' +
    "geração feita pelo professor) uma manchete de SIMULAÇÃO DIDÁTICA sobre a " +
    "cidade fictícia de Vale Novo, só com instituições e personagens " +
    "fictícios, e explique o que a torna crível e qual critério de auditoria " +
    "a denunciaria.",

  // 8. Produção do Aluno
  studentProduction:
    "Um Relatório de Auditoria curto. (a) Suas 4 hipóteses iniciais — você as " +
    "registra na Investigação e elas entram sozinhas no topo do relatório. " +
    "(b) Para cada item: um indício ou sinal de alerta, um limite com a " +
    "checagem necessária e a sua conclusão, uma frase cada. A análise da " +
    "manchete gerada com IA vai no registro da próxima etapa, Uso da IA.",

  // 9. Reflexão no Diário do Auditor
  reflection:
    "Sua hipótese inicial se manteve depois da análise em todos os itens? " +
    "Em que item a análise mudou ou matizou sua primeira impressão — e o que " +
    "isso revela sobre a diferença entre a primeira impressão e uma " +
    "investigação de verdade? Diante de uma notícia real no seu celular, que " +
    "checagem você faria antes de acreditar nela ou de compartilhá-la?",

  // 10. Entrega
  delivery:
    "O Relatório de Auditoria é registrado na plataforma e fica salvo na sua " +
    "conta (você pode sair e continuar depois). Considera-se concluída quando as quatro " +
    "hipóteses e conclusões, o registro de uso da IA e a reflexão estiverem " +
    "preenchidos e entregues.",

  // 11. Competências Desenvolvidas
  competencies: [
    "Pensamento crítico e ceticismo saudável",
    "Formulação e teste de hipóteses",
    "Análise de fontes e de evidências",
    "Uso ético e crítico da Inteligência Artificial",
    "Argumentação baseada em evidências",
    "Letramento midiático e digital",
  ],

  // Modelo do Relatório (D-057): as linhas de hipótese entram antes deste
  // texto, geradas pelo Mission Flow a partir dos campos da Investigação.
  productionTemplate:
    "ANÁLISE — uma frase por campo\n" +
    "Item 1 — indício ou sinal de alerta:\n" +
    "Item 1 — limite e checagem necessária:\n" +
    "Item 1 — conclusão:\n" +
    "Item 2 — indício ou sinal de alerta:\n" +
    "Item 2 — limite e checagem necessária:\n" +
    "Item 2 — conclusão:\n" +
    "Item 3 — indício ou sinal de alerta:\n" +
    "Item 3 — limite e checagem necessária:\n" +
    "Item 3 — conclusão:\n" +
    "Item 4 — indício ou sinal de alerta:\n" +
    "Item 4 — limite e checagem necessária:\n" +
    "Item 4 — conclusão:",
  hypothesisPrompt:
    "Antes de aplicar o guia: este texto parece confiável ou suspeito, e por quê? Registre sua hipótese em uma frase — ela entra no seu Relatório.",
  criteriaTitle: "O que torna uma conclusão válida",

  // Estimativa por etapa (piloto 1ª série A, docs/piloto/03-missao-e-roteiro.md):
  // ~36 min de atividade, dentro da faixa de 35–40 min. Estimativa, ainda não
  // validada com alunos.
  stepMinutes: [
    0.5, // 1. Capa
    1.5, // 2. Contexto (simulação didática)
    1, // 3. Objetivo e dois eixos
    8, // 4. Guia + 4 hipóteses registradas
    1, // 5. Comparação
    12, // 6. Relatório (análise dos 4 itens)
    6, // 7. Uso da IA (geração ou Plano B + registro)
    1, // 8. Critérios
    1, // 9. Entrega
    4, // 10. Reflexão
  ],

  // Dois eixos (D-053) — avaliados separadamente pelo professor.
  axes: {
    discipline: {
      area: "CHS",
      component: "História",
      objective:
        "Analisar quatro textos noticiosos simulados, identificando a autoria, a " +
        "origem, a intenção e as evidências de cada um, e explicitar os limites " +
        "do que eles permitem afirmar — distinguindo indícios de confiabilidade " +
        "de sinais de alerta.",
      skill: {
        framework: "bncc",
        code: "EM13CHS101",
        text:
          "Identificar, analisar e comparar diferentes fontes e narrativas expressas " +
          "em diversas linguagens, com vistas à compreensão de ideias filosóficas e de " +
          "processos e eventos históricos, geográficos, políticos, econômicos, sociais, " +
          "ambientais e culturais.",
        reference:
          "BNCC — Ensino Médio (MEC, 2018). Texto conferido no HTML oficial " +
          "(basenacionalcomum.mec.gov.br) em 05/10/2026.",
      },
      criteria: [
        "Identifica a autoria e a origem de cada item do Dossiê.",
        "Reconhece a intenção de cada texto (informar, alertar, provocar reação) a partir de marcas do próprio texto.",
        "Sustenta a conclusão de cada item com indícios ou sinais de alerta do material, não com opinião.",
        "Explicita os limites da informação disponível e a checagem que uma notícia real exigiria.",
      ],
    },
    ai: {
      objective:
        "Usar uma IA generativa como objeto de estudo — gerar, ou acompanhar a " +
        "geração feita pelo professor, de uma manchete de SIMULAÇÃO DIDÁTICA — e " +
        "analisar criticamente o texto gerado, sem tratá-lo como fonte de verdade.",
      // Só o que o aluno demonstra também no Plano B (geração pelo professor):
      // compreender e avaliar. Operar a ferramenta e criar com ela não são
      // creditados nesta Missão.
      competencyIds: ["ia-compreender-01", "ia-avaliar-01"],
      practicalInstruction:
        "Depois da auditoria, peça ao assistente de IA aprovado pela escola: " +
        '"Escreva uma manchete de notícia inventada sobre a cidade fictícia de ' +
        "Vale Novo, para uma SIMULAÇÃO DIDÁTICA de checagem de fatos. Use só " +
        'instituições e personagens fictícios." Não use nomes de pessoas reais, ' +
        "da sua escola ou da sua cidade. Plano B: se o professor fizer a geração " +
        'na tela, escreva "Demonstração do professor (Plano B)" no campo da ' +
        "ferramenta e copie o pedido e a resposta projetados. Em \"Como você " +
        'verificou", diga por que o texto parece verdadeiro e qual critério de ' +
        "auditoria o denuncia. Não pergunte à IA se os itens do Dossiê são " +
        "confiáveis.",
      criticalUseEvidence: [
        "O pedido feito à IA, copiado como foi enviado — por você ou pelo professor, no Plano B.",
        "O trecho da resposta da IA que você analisou.",
        "Os indícios e sinais de alerta que você encontrou no texto gerado.",
        "Como você trataria esse texto se ele chegasse ao seu celular — e por quê.",
      ],
      criteria: [
        "Registra o pedido e a resposta da IA sem omitir partes e declara quem operou a ferramenta (o próprio aluno ou o professor, no Plano B).",
        "Aplica ao texto gerado os critérios de auditoria, nomeando indícios e sinais de alerta.",
        "Explica por que o texto gerado parece verdadeiro e o que o denuncia.",
        "Reconhece que a IA produz texto plausível sem garantia de verdade e justifica como tratar o que ela gerou.",
      ],
    },
    reflectionCriteria: [
      "Compara a hipótese inicial com a conclusão da análise.",
      "Nomeia o que mudou ou confirmou a própria opinião.",
      "Indica uma checagem concreta que faria diante de uma notícia real.",
    ],
  },

  createdAt: new Date("2026-07-14"),
  updatedAt: new Date("2026-10-20"),
};
