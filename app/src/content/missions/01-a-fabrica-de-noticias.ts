import type { Mission } from "@/modules/library";

/**
 * Missão 01 — A Fábrica de Notícias.
 *
 * Implementação oficial de referência do padrão de Missão do IAH.
 * Ao criar novas Missões, siga docs/MISSION_TEMPLATE.md e use este
 * arquivo como modelo. Cada bloco abaixo corresponde a um dos 11
 * blocos da estrutura padrão (docs/MISSION.md).
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
    "critérios para verificar a confiabilidade de uma informação. Ao final, o " +
    "estudante assume, pela primeira vez, a postura de Auditor da Realidade: " +
    "alguém que não aceita um conteúdo por parecer verdadeiro, mas investiga " +
    "como saber se ele é.",

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
    "que algo é verdadeiro. Nesta missão, você vai olhar para um conjunto de " +
    "manchetes como um auditor olha para números: sem confiar na primeira " +
    "impressão, procurando evidência antes de dar um veredito.",

  // 5. Material Didático
  didacticMaterials: [
    "Texto-base \"Como uma IA escreve uma notícia\" (leitura curta, ~1 página).",
    "Dossiê de Auditoria: 4 manchetes com resumo — parte reais, parte " +
      "fabricadas por IA (você não sabe quais, de início).",
    "Guia rápido de verificação: 5 perguntas para checar uma fonte (quem " +
      "publicou, quando, qual a evidência, há outras fontes, o que o texto ou a " +
      "imagem omite).",
  ],

  // 6. Ferramentas de IA
  aiTools: [
    "Assistente de IA de texto — usado para gerar uma manchete falsa e " +
      "observar, na prática, como ela soa convincente. Aqui a IA é objeto de " +
      "estudo, não fonte de resposta.",
    "Ferramenta de busca/verificação — para confrontar cada manchete com " +
      "outras fontes.",
  ],

  // 7. Desafio
  challenge:
    "Audite o Dossiê: para cada uma das 4 manchetes, decida se é real ou " +
    "fabricada por IA e justifique o veredito com pelo menos uma evidência " +
    "(não com \"achismo\"). Depois, use o assistente de IA para criar você " +
    "mesmo uma manchete falsa sobre a sua cidade ou escola e explique, em duas " +
    "frases, o que a torna crível — e o que a denuncia.",

  // 8. Produção do Aluno
  studentProduction:
    "Um Relatório de Auditoria contendo: (a) os 4 vereditos, cada um com sua " +
    "justificativa/evidência; (b) a manchete falsa que você gerou; (c) a " +
    "análise de por que ela engana. Texto objetivo, em primeira pessoa de " +
    "auditor.",

  // 9. Reflexão no Diário do Auditor
  reflection:
    "Em que momento você quase se enganou? O que muda na forma como você vai " +
    "ler a próxima notícia que aparecer no seu celular?",

  // 10. Entrega
  delivery:
    "O Relatório de Auditoria é registrado na plataforma (nesta fase, salvo " +
    "localmente no seu dispositivo). Considera-se concluída quando os 4 " +
    "vereditos, a manchete gerada e a reflexão estiverem preenchidos.",

  // 11. Competências Desenvolvidas
  competencies: [
    "Pensamento crítico e ceticismo saudável",
    "Verificação de fontes e checagem de evidências",
    "Uso ético e crítico da Inteligência Artificial",
    "Argumentação baseada em evidências",
    "Letramento midiático e digital",
  ],

  createdAt: new Date("2026-07-14"),
  updatedAt: new Date("2026-07-14"),
};
