import type { Mission } from "@/modules/library";

/**
 * Missão 02 — Quem Conferiu Este Dado? (Geografia · Trilha IA & Humanidades)
 *
 * Segunda Missão de dois eixos (D-053/D-054): análise crítica de dados e
 * representações geográficas com apoio de IA. Escrita pela equipe IAH em
 * 09/10/2026 — PENDENTE DE REVISÃO DOCENTE antes de uso com alunos reais.
 *
 * PROCEDÊNCIA DO MATERIAL
 *   Item 1 — dado REAL: IBGE, "Censo Demográfico 2022: População e
 *     domicílios — Primeiros resultados", Tabela 2 (População residente e
 *     participação relativa — Brasil e Grandes Regiões — 2022), p. 33.
 *     https://www.ibge.gov.br/biblioteca/visualizacao/livros/liv102011.pdf
 *     Valores conferidos pela equipe IAH em 09/10/2026. Atenção: o IBGE
 *     revisou depois o total do país (203.080.756); esta Missão usa a
 *     publicação citada e diz isso ao aluno.
 *   Itens 2, 3 e 4 — SINTÉTICOS, escritos pela equipe IAH para a
 *     atividade e identificados como tais no próprio texto.
 *
 * ------------------------------------------------------------------
 * CHAVE DO PROFESSOR (não exibida ao aluno)
 *   Item 2 (resposta "de IA", sintética) → PRECISA DE CORREÇÃO.
 *     Confirma: total de ~203 milhões; Sul ~30 milhões (29.933.315).
 *     Corrige: o Sudeste tem 41,8% — não "mais da metade"; a região menos
 *     populosa é o Centro-Oeste (16.287.809), não o Norte; o Norte tem
 *     17.349.619 — não "menos de 10 milhões".
 *   Item 3 (gráfico sintético) → SEM CONFIABILIDADE VISUAL.
 *     Eixo começa em 50 milhões: a barra do Nordeste (54,6 mi) fica
 *     minúscula diante da do Sudeste (84,8 mi), sugerindo "quase 10
 *     vezes" quando a razão é cerca de 1,6. Três regiões somem do
 *     gráfico; não há fonte nem data.
 *   Item 4 (mapa sintético) → SEM PROCEDÊNCIA.
 *     Legenda sem números, sem unidade (hab/km²), sem ano e sem fonte;
 *     a frase da legenda não pode ser aceita nem recusada só pelo mapa —
 *     o aluno deve dizer onde conferiria (IBGE, Censo 2022) e por que a
 *     população do Item 1 sozinha não basta (densidade depende da área).
 *   Uso da IA: o esperado é o aluno conferir a resposta do assistente na
 *   tabela do Item 1 ou no site do IBGE e registrar, afirmação por
 *   afirmação, o que confirmou e o que corrigiu. Pedir à própria IA que
 *   "confira" não vale como verificação.
 * ------------------------------------------------------------------
 */
export const missionQuemConferiuEsteDado: Mission = {
  id: "02-quem-conferiu-este-dado",
  number: 2,
  module: "Módulo 1 — O Auditor da Realidade",
  order: 2,
  status: "published",

  title: "Quem Conferiu Este Dado?",

  objective:
    "Ler criticamente tabelas, gráficos e mapas sobre a distribuição da população brasileira e " +
    "conferir, numa fonte verificável, o que uma IA afirma sobre esses dados — sabendo dizer o que " +
    "foi confirmado e o que precisou ser corrigido.",

  guidingQuestion:
    "Quando uma IA responde com números sobre o Brasil, como saber se eles são verdadeiros — e de onde vieram?",

  context:
    "Mapas e gráficos parecem objetivos: têm cores, barras e números. Mas toda representação geográfica " +
    "é feita por alguém, com um recorte, uma escala e uma escolha do que mostrar. Assistentes de IA também " +
    "respondem perguntas sobre população e território com muita segurança — às vezes com números certos, " +
    "às vezes com números desatualizados ou inventados. Nesta missão você recebe um Dossiê com quatro peças: " +
    "uma tabela oficial do Censo 2022 e três peças criadas pela equipe IAH para treinar o seu olhar. Antes " +
    "de confiar, você vai perguntar: quem produziu, quando, com que recorte — e onde dá para conferir?",

  didacticMaterials: [
    'Texto-base "Todo dado geográfico tem procedência" — leitura curta sobre quem produz dados de população ' +
      "no Brasil (o IBGE, por meio do Censo Demográfico), o que é um recorte territorial (Grandes Regiões) e " +
      "por que escala de gráfico e legenda de mapa mudam o que a gente enxerga.",

    'DOSSIÊ · Item 1 — "População residente por Grande Região — Censo 2022" (IBGE, Censo Demográfico 2022: ' +
      "População e domicílios — Primeiros resultados, Tabela 2, p. 33). Dado REAL e oficial. Brasil: " +
      "203.062.512 habitantes. Norte: 17.349.619 (8,5%). Nordeste: 54.644.582 (26,9%). Sudeste: 84.847.187 " +
      "(41,8%). Sul: 29.933.315 (14,7%). Centro-Oeste: 16.287.809 (8,0%). Observação: o IBGE revisou depois " +
      "o total do país para 203.080.756; aqui vale a publicação citada.",

    'DOSSIÊ · Item 2 — "Resposta de um assistente de IA sobre as regiões do Brasil" (texto SINTÉTICO, escrito ' +
      "pela equipe IAH imitando uma resposta de IA). \"Segundo o Censo 2022, o Brasil tem cerca de 203 milhões " +
      "de habitantes. A Região Sudeste concentra mais da metade da população do país. A Região Norte é a menos " +
      "populosa, com menos de 10 milhões de habitantes, e a Região Sul tem cerca de 30 milhões.\"",

    'DOSSIÊ · Item 3 — "Gráfico: Sudeste tem quase 10 vezes mais gente que o Nordeste" (gráfico SINTÉTICO ' +
      "criado pela equipe IAH com os números do Item 1). Gráfico de barras com só duas regiões. O eixo vertical " +
      "começa em 50 milhões e vai até 90 milhões: a barra do Sudeste quase toca o topo e a do Nordeste é um " +
      "traço curto. Não há fonte, ano nem nota explicando o eixo; Norte, Sul e Centro-Oeste não aparecem.",

    'DOSSIÊ · Item 4 — "Mapa: Densidade demográfica do Brasil" (mapa SINTÉTICO descrito pela equipe IAH; não ' +
      "reproduz nenhum mapa real). As cinco Grandes Regiões aparecem pintadas em três tons, com a legenda " +
      '"baixa / média / alta", sem números, sem unidade, sem ano e sem fonte. A legenda traz a frase: "O ' +
      'Centro-Oeste é a região mais densamente povoada do país."',

    "GUIA DE INVESTIGAÇÃO · Procedência — Pergunta: Quem produziu este dado ou esta representação, e quando? " +
      "| Explicação: Dado de população tem autor (ex.: IBGE), pesquisa (ex.: Censo 2022) e data. Sem isso, " +
      "não dá para conferir. | Sinal de alerta: Número sem fonte, ou fonte genérica como \"pesquisas mostram\". " +
      "| Exemplo: Um gráfico com barras bonitas e nenhuma linha dizendo de onde vieram os números.",

    "GUIA DE INVESTIGAÇÃO · Recorte — Pergunta: De que território, unidade e ano o dado fala? " +
      "| Explicação: População de região, de estado e de município são coisas diferentes; ano e unidade " +
      "também. | Sinal de alerta: Comparar números de anos ou unidades diferentes como se fossem iguais. " +
      "| Exemplo: Dizer \"o Norte tem menos de 10 milhões\" sem dizer de que ano é esse número.",

    "GUIA DE INVESTIGAÇÃO · Escala do gráfico — Pergunta: Onde começa o eixo e o que ficou de fora? " +
      "| Explicação: Eixo que não começa no zero aumenta diferenças; deixar categorias de fora muda a " +
      "comparação. | Sinal de alerta: Barras que parecem muito diferentes para números parecidos. " +
      "| Exemplo: Uma barra \"10 vezes maior\" para um número só 1,5 vez maior.",

    "GUIA DE INVESTIGAÇÃO · Legenda do mapa — Pergunta: A legenda diz o que cada cor significa, em que " +
      "unidade e de que ano? | Explicação: Densidade demográfica é habitantes por km²; sem números e unidade, " +
      "a cor não informa. | Sinal de alerta: Legenda só com \"baixa / média / alta\". | Exemplo: Um mapa que " +
      "pinta uma região de \"alta\" sem dizer o valor nem a fonte.",

    "GUIA DE INVESTIGAÇÃO · Conferência cruzada — Pergunta: Onde eu confiro o que a IA respondeu? " +
      "| Explicação: Compare cada afirmação com a fonte oficial (Item 1 ou site do IBGE) e anote o que " +
      "confere e o que não confere. | Sinal de alerta: Usar a própria IA para \"conferir\" a IA. " +
      "| Exemplo: A IA diz um número; você encontra outro na tabela do IBGE e registra os dois.",

    "CRITÉRIOS DE AUDITORIA · Confirmado: a afirmação bate com uma fonte verificável e você diz qual fonte, " +
      "de que ano e onde a encontrou.",

    "CRITÉRIOS DE AUDITORIA · Corrigido: a afirmação não bate com a fonte; você escreve o dado certo, com a " +
      "fonte, e explica o tamanho do erro.",

    "CRITÉRIOS DE AUDITORIA · Sem procedência: não há como conferir (sem fonte, sem ano ou sem unidade); " +
      "você diz o que faltaria para conferir e onde procuraria.",
  ],

  aiTools: [
    "Assistente de IA de texto — você faz a ele uma pergunta sobre a população das regiões do Brasil e " +
      "trata a resposta como algo a conferir, não como fonte.",
    "Site do IBGE (ibge.gov.br) e a tabela do Item 1 — fontes verificáveis para conferir a resposta da IA.",
  ],

  challenge:
    "Audite o Dossiê em duas passadas. Primeiro, para cada um dos 4 itens, registre sua hipótese inicial em " +
    "uma frase. Depois, aplique o Guia de Investigação e classifique cada item como \"confirmado\", " +
    '"precisa de correção" ou "sem procedência", com o critério que sustenta a decisão. Por fim, faça a sua ' +
    "própria pergunta a um assistente de IA sobre a população das Grandes Regiões no Censo 2022, confira " +
    "cada número na fonte e registre o que confirmou e o que corrigiu.",

  studentProduction:
    "Um Relatório de Conferência com: (a) a classificação de cada um dos 4 itens do Dossiê, com o critério " +
    "usado; (b) uma tabela com três colunas — afirmação da IA, fonte conferida, confirmei ou corrigi (com o " +
    "dado certo); (c) uma versão corrigida do título do gráfico do Item 3 ou da legenda do mapa do Item 4.",

  reflection:
    "Qual afirmação da IA você teria aceitado sem conferir? O que o fez desconfiar — ou o que deveria ter " +
    "feito? Da próxima vez que vir um mapa ou gráfico nas redes, qual será a primeira coisa que você vai " +
    "procurar?",

  delivery:
    "O Relatório de Conferência e o registro de uso da IA são entregues na plataforma. A missão termina " +
    "quando a classificação dos 4 itens, a tabela de conferência, a versão corrigida e a reflexão estiverem " +
    "preenchidas e entregues.",

  competencies: [
    "Leitura crítica de tabelas, gráficos e mapas",
    "Procedência e recorte de dados geográficos",
    "Conferência de respostas de IA em fonte verificável",
    "Argumentação com dados",
  ],

  productionPlaceholder:
    "a) Item 1: … — critério…\n" +
    "b) Afirmação da IA | fonte conferida | confirmei ou corrigi…\n" +
    "c) Título (ou legenda) corrigido…",
  hypothesisPrompt:
    "Antes de aplicar o guia: este dado parece confiável, precisa de correção ou não tem procedência? Anote sua hipótese — você vai usá-la no Relatório.",
  criteriaTitle: "Confirmado, corrigido ou sem procedência",

  axes: {
    discipline: {
      area: "CHS",
      component: "Geografia",
      objective:
        "Ler e interpretar criticamente dados e representações geográficas (tabela, gráfico e mapa) sobre " +
        "a distribuição da população brasileira, identificando procedência, recorte, escala e legenda antes " +
        "de tirar conclusões.",
      skill: {
        framework: "bncc",
        code: "EM13CHS106",
        text:
          "Utilizar as linguagens cartográfica, gráfica e iconográfica, diferentes gêneros textuais e " +
          "tecnologias digitais de informação e comunicação de forma crítica, significativa, reflexiva e " +
          "ética nas diversas práticas sociais, incluindo as escolares, para se comunicar, acessar e difundir " +
          "informações, produzir conhecimentos, resolver problemas e exercer protagonismo e autoria na vida " +
          "pessoal e coletiva.",
        reference:
          "BNCC — Ensino Médio (MEC, 2018), Ciências Humanas e Sociais Aplicadas, competência específica 1. " +
          "Código e texto conferidos na versão HTML oficial do MEC (basenacionalcomum.mec.gov.br/abase/#medio) " +
          "em 05/10/2026, na produção do lote piloto IAH. A base de dados abertos usada pelo projeto " +
          "(db/reference, que remete ao PDF oficial, p. 574) traz a mesma habilidade com \"(incluindo as escolares)\".",
      },
      criteria: [
        "Identifica a procedência (quem produziu, quando, com que recorte) de cada dado ou representação.",
        "Compara as regiões pelos números da tabela do Censo 2022, não pela impressão visual.",
        "Aponta o problema de escala do gráfico e o que falta na legenda do mapa.",
      ],
    },
    ai: {
      objective:
        "Conferir em fonte verificável as informações geográficas produzidas por uma IA e explicar o que " +
        "foi confirmado e o que foi corrigido.",
      competencyIds: ["ia-usar-01", "ia-avaliar-01", "ia-avaliar-02"],
      practicalInstruction:
        "Pergunte a um assistente de IA: \"Qual é a população de cada Grande Região do Brasil segundo o " +
        "Censo 2022 e qual é a região menos populosa?\". Copie o pedido e a resposta. Confira cada número na " +
        "tabela do Item 1 ou no site do IBGE e registre, afirmação por afirmação, o que confirmou e o que " +
        "corrigiu. Não use a IA para conferir a própria IA.",
      criticalUseEvidence: [
        "O pedido feito à IA, com o recorte (fonte, ano, unidade).",
        "O trecho da resposta da IA com os números.",
        "A fonte verificável usada para conferir: nome, ano e onde encontrou.",
        "O que você confirmou e o que corrigiu — com o dado certo.",
      ],
      criteria: [
        "Formula o pedido com recorte claro (fonte, ano, unidade).",
        "Confere cada afirmação da IA numa fonte verificável e cita a fonte.",
        "Explica o que confirmou e o que corrigiu, com o dado correto.",
        "Identifica um erro possível da IA com dados (número desatualizado, inventado ou arredondado sem aviso).",
      ],
    },
    reflectionCriteria: [
      "Nomeia uma afirmação que teria aceitado sem conferir.",
      "Explica o que despertou (ou deveria despertar) a desconfiança.",
      "Indica o que vai procurar primeiro num próximo mapa ou gráfico.",
    ],
  },

  createdAt: new Date("2026-10-09"),
  updatedAt: new Date("2026-10-09"),
};
