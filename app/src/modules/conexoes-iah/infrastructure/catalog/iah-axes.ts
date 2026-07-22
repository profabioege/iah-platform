import type { IahAxis } from "../../domain/entities";

/** Eixos temáticos do Método IAH — catálogo fechado, curado editorialmente. */
export const IAH_AXES: IahAxis[] = [
  {
    id: "axis-dados-algoritmos",
    slug: "dados-e-algoritmos",
    name: "Dados e algoritmos",
    description: "Como dados são coletados, tratados e transformados em decisões automatizadas.",
  },
  {
    id: "axis-trabalho-sociedade",
    slug: "trabalho-e-sociedade",
    name: "Trabalho e sociedade",
    description: "Como a automação e a IA reconfiguram o trabalho, a produtividade e as relações de produção.",
  },
  {
    id: "axis-etica-responsabilidade",
    slug: "etica-e-responsabilidade",
    name: "Ética e responsabilidade",
    description: "Os dilemas morais e as responsabilidades envolvidas em criar e usar sistemas inteligentes.",
  },
  {
    id: "axis-autoria-producao",
    slug: "autoria-e-producao",
    name: "Autoria e produção",
    description: "O que muda na autoria, na produção cultural e intelectual quando sistemas de IA participam do processo.",
  },
  {
    id: "axis-poder-desigualdade",
    slug: "poder-e-desigualdade",
    name: "Poder e desigualdade",
    description: "Quem controla, quem se beneficia e quem é afetado pela concentração de dados, tecnologia e poder.",
  },
  {
    id: "axis-sustentabilidade",
    slug: "sustentabilidade",
    name: "Sustentabilidade",
    description: "O custo ambiental e social do desenvolvimento e uso de tecnologias de IA em larga escala.",
  },
  {
    id: "axis-cidadania-digital",
    slug: "cidadania-digital",
    name: "Cidadania digital",
    description: "Direitos, deveres e participação em um mundo mediado por plataformas e sistemas automatizados.",
  },
  {
    id: "axis-pensamento-critico",
    slug: "pensamento-critico-e-verificacao",
    name: "Pensamento crítico e verificação",
    description: "Como avaliar, checar e questionar informações e resultados produzidos por sistemas de IA.",
  },
];

export function getIahAxisById(id: string): IahAxis | null {
  return IAH_AXES.find((axis) => axis.id === id) ?? null;
}
