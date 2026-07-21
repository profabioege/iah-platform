import { VISUAL_THEMES } from "@/lib/ai/prompts/docentiah/slides";

/**
 * Temas visuais próprios do IAH — nenhum copiado de concorrente. A
 * escolha do tema muda só a apresentação visual (miniatura/densidade),
 * nunca o rigor do conteúdo gerado. Cores só via tokens semânticos
 * (`--primary`/`--chart-*`) — nunca hex novo (DESIGN_SYSTEM.md).
 */
export interface VisualTheme {
  id: (typeof VISUAL_THEMES)[number];
  name: string;
  description: string;
  contrast: "Alto contraste" | "Contraste médio";
  density: "Densidade compacta" | "Densidade confortável" | "Densidade ampla";
  /** Classes Tailwind do gradiente da miniatura — só tokens semânticos. */
  thumbnailGradient: string;
}

export const VISUAL_THEME_LIST: VisualTheme[] = [
  {
    id: "essencial",
    name: "Essencial",
    description: "Limpo e direto — só o que o slide precisa, sem ornamento.",
    contrast: "Alto contraste",
    density: "Densidade compacta",
    thumbnailGradient: "from-primary/35 to-primary/5",
  },
  {
    id: "investigativo",
    name: "Investigativo",
    description: "Tom de laboratório — para aulas que partem de uma pergunta.",
    contrast: "Alto contraste",
    density: "Densidade confortável",
    thumbnailGradient: "from-chart-3/45 to-chart-1/15",
  },
  {
    id: "visual",
    name: "Visual",
    description: "Mais espaço para imagem e esquema, texto reduzido ao essencial.",
    contrast: "Contraste médio",
    density: "Densidade ampla",
    thumbnailGradient: "from-chart-4/40 to-chart-2/15",
  },
  {
    id: "academico",
    name: "Acadêmico",
    description: "Sóbrio, para conteúdo denso e formal.",
    contrast: "Alto contraste",
    density: "Densidade compacta",
    thumbnailGradient: "from-chart-5/35 to-muted",
  },
  {
    id: "contemporaneo",
    name: "Contemporâneo",
    description: "Equilíbrio entre texto e destaque visual, tom atual.",
    contrast: "Contraste médio",
    density: "Densidade confortável",
    thumbnailGradient: "from-primary/40 to-chart-3/20",
  },
  {
    id: "humanidades_tecnologia",
    name: "Humanidades e Tecnologia",
    description: "A identidade do próprio IAH — pensar, investigar, produzir.",
    contrast: "Alto contraste",
    density: "Densidade confortável",
    thumbnailGradient: "from-chart-1/40 to-chart-4/15",
  },
];

export function findVisualTheme(id: string): VisualTheme | undefined {
  return VISUAL_THEME_LIST.find((theme) => theme.id === id);
}
