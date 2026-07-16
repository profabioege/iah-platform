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
 * para esta Missão; nenhum se refere a fato, veículo, instituição ou
 * pessoa real.
 *
 *   Manchete 1 (merenda com IA)      → tratar como REAL na dinâmica.
 *     Tells de autenticidade: órgão público nomeável, escopo modesto
 *     e verificável (6 escolas, piloto de 60 dias), fonte atribuída
 *     a um cargo, ausência de urgência ou apelo emocional.
 *   Manchete 2 (estudo do IBEE)       → tratar como REAL na dinâmica.
 *     Tells: metodologia declarada (amostra, margem de erro, período),
 *     instituição nomeada, conclusão qualificada ("uso crescente"),
 *     não uma afirmação absoluta.
 *   Manchete 3 (97% dos professores substituídos) → FABRICADA.
 *     Tells: estatística extrema e redonda sem metodologia, fonte
 *     vaga ("especialistas apontam"), apelo de urgência/compartilhamento,
 *     escopo nacional sem nenhuma atribuição checável.
 *   Manchete 4 (robô que aprova o ENEM sozinho) → FABRICADA.
 *     Tells: fonte vaga ("página de tecnologia"), afirmação
 *     desproporcional (100% sozinho), inconsistência clássica de
 *     imagem gerada por IA (mão/garra com dedos a mais, sombra
 *     incoerente com a luz da cena) descrita no próprio texto.
 *
 * Use esta chave para mediar o debate após a entrega — nunca para
 * "corrigir" o aluno antes da investigação.
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
    "textos convincentes e, ainda assim, falsos — e desenvolver os primeiros " +
    "critérios objetivos para verificar a confiabilidade de uma informação, " +
    "antes de formar opinião sobre ela. Ao final, o estudante assume, pela " +
    "primeira vez, a postura de Auditor da Realidade: alguém que não aceita um " +
    "conteúdo por parecer verdadeiro, e sabe nomear, com evidência, por que " +
    "confia ou desconfia dele.",

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
    "que algo é verdadeiro. Você vai receber um Dossiê de Auditoria com quatro " +
    "manchetes reais de investigação — parte delas seria publicável por " +
    "qualquer redação séria, parte foi construída para enganar. Antes de saber " +
    "qual é qual, você vai fazer o que todo auditor faz: registrar uma hipótese " +
    "inicial, aplicar um método e só então assinar um veredito.",

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

    "GUIA DE INVESTIGAÇÃO · Fonte — Quem assina esta informação? É uma pessoa, " +
      "veículo ou instituição que existe e pode ser encontrada fora deste " +
      'texto? "Especialistas dizem" e "estudo aponta" sem nome não são fonte.',

    "GUIA DE INVESTIGAÇÃO · Data e escopo — Quando isso teria acontecido, e " +
      "onde? Datas ausentes e escopos genéricos demais (\"no país\", \"todo " +
      'mundo") são sinal de alerta; datas e recortes específicos (uma cidade, ' +
      "um número de escolas, um período) são mais fáceis de checar — e é isso " +
      "que os torna prováveis.",

    "GUIA DE INVESTIGAÇÃO · Evidência — Que dado sustenta a afirmação? Um " +
      "número existe porque alguém mediu algo (amostra, método, margem de " +
      "erro) ou porque soa impressionante? Estatísticas redondas demais (97%, " +
      "100%) sem metodologia são mais fabricadas do que exatas.",

    "GUIA DE INVESTIGAÇÃO · Linguagem — O texto pede para você sentir algo " +
      "com urgência (indignação, medo, orgulho) antes de pensar? Pedidos " +
      'como "compartilhe antes que apaguem" existem para que você propague ' +
      "antes de verificar — é o oposto do que um auditor faz.",

    "GUIA DE INVESTIGAÇÃO · Coerência interna — Se há uma imagem descrita, " +
      "ela é fisicamente possível? Mãos, sombras, reflexos e textos dentro de " +
      "imagens são onde geradores de IA mais erram; qualquer detalhe " +
      "impossível derruba a manchete sozinho.",

    "CRITÉRIOS DE AUDITORIA · Conta como evidência válida: fonte identificável " +
      "e localizável fora do texto, dado com metodologia declarada (amostra, " +
      "data, margem de erro), escopo específico e verificável.",

    "CRITÉRIOS DE AUDITORIA · Não conta como evidência: \"especialistas " +
      'dizem" sem nome, estatística extrema sem metodologia, apelo para ' +
      "compartilhar com urgência, imagem com detalhe fisicamente inconsistente.",

    "CRITÉRIOS DE AUDITORIA · Regra de ouro: um veredito de \"real\" exige " +
      "pelo menos dois critérios de evidência válida presentes; a ausência " +
      "de fonte identificável, sozinha, já é suficiente para um veredito de " +
      '"fabricada".',
  ],

  // 6. Ferramentas de IA
  aiTools: [
    "Assistente de IA de texto — usado depois da auditoria, para você mesmo " +
      "gerar uma manchete falsa e observar, na prática, como ela soa " +
      "convincente. Aqui a IA é objeto de estudo, não fonte de resposta: " +
      "você não pergunta a ela se uma manchete é real.",
    "Ferramenta de busca/verificação — para confrontar cada item do Dossiê " +
      "com outras fontes e checar se a instituição ou o veículo citado existe.",
  ],

  // 7. Desafio
  challenge:
    "Audite o Dossiê em duas passadas. Primeiro, para cada um dos 4 itens, " +
    "registre sua hipótese inicial — o que seu instinto diz antes de investigar, " +
    "em uma frase. Depois, aplique o Guia de Investigação e os Critérios de " +
    'Auditoria item por item e dê o seu veredito final ("real" ou "fabricada"), ' +
    "justificado com pelo menos um critério de evidência do material didático — " +
    'nunca com "achismo". Por fim, use o assistente de IA para criar você mesmo ' +
    "uma manchete falsa sobre a sua cidade ou escola e explique, em duas frases, " +
    "o que a torna crível — e qual critério de auditoria a denunciaria.",

  // 8. Produção do Aluno
  studentProduction:
    "Um Relatório de Auditoria contendo, para cada um dos 4 itens do Dossiê: " +
    "(a) sua hipótese inicial; (b) o veredito final, com o(s) critério(s) de " +
    "evidência que sustentam essa decisão. Ao final do relatório: (c) a " +
    "manchete falsa que você mesmo gerou com IA; (d) a análise de por que ela " +
    "engana e qual critério de auditoria a denunciaria. Texto objetivo, em " +
    "primeira pessoa de auditor.",

  // 9. Reflexão no Diário do Auditor
  reflection:
    "Sua hipótese inicial bateu com o seu veredito final em todos os itens? " +
    "Nos casos em que não bateu, o que mudou sua opinião — e o que isso revela " +
    "sobre a diferença entre a primeira impressão e uma investigação de " +
    "verdade? O que muda na forma como você vai ler a próxima notícia que " +
    "aparecer no seu celular?",

  // 10. Entrega
  delivery:
    "O Relatório de Auditoria é registrado na plataforma (nesta fase, salvo " +
    "localmente no seu dispositivo). Considera-se concluída quando as quatro " +
    "hipóteses e vereditos, a manchete gerada com sua análise, e a reflexão " +
    "estiverem preenchidos e entregues.",

  // 11. Competências Desenvolvidas
  competencies: [
    "Pensamento crítico e ceticismo saudável",
    "Formulação e teste de hipóteses",
    "Verificação de fontes e checagem de evidências",
    "Uso ético e crítico da Inteligência Artificial",
    "Argumentação baseada em evidências",
    "Letramento midiático e digital",
  ],

  createdAt: new Date("2026-07-14"),
  updatedAt: new Date("2026-07-16"),
};
