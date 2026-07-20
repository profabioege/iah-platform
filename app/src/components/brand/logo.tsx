import { cn } from "@/lib/utils";

/**
 * "primary" (= "light") — letras navy, fundos claros; "reverse"
 * (= "dark") — letras brancas, fundos escuros; "auto" herda currentColor.
 * Os nomes oficiais da M18.3 são primary/reverse; light/dark permanecem
 * como sinônimos retrocompatíveis.
 */
type LogoVariant = "auto" | "light" | "dark" | "primary" | "reverse";

interface LogoProps {
  /**
   * Versão oficial: "primary"/"light" (navy, p/ fundo claro),
   * "reverse"/"dark" (branca, p/ fundo escuro) ou "auto" (herda
   * `currentColor`). O Núcleo IAH (triângulo) e a palavra EDUCACIONAL
   * usam sempre o ciano da marca.
   */
  variant?: LogoVariant;
  /** Exibe "EDUCACIONAL" abaixo do símbolo. */
  wordmark?: boolean;
  className?: string;
  title?: string;
}

/**
 * Logo oficial do IAH Educacional — MASTER VETORIAL e fonte única do
 * desenho da marca (M18.3). Toda cópia estática (public/brand/*.svg,
 * src/app/icon.svg, opengraph-image, apple-icon) é derivada DESTE
 * arquivo — nunca o contrário.
 *
 * ATIVO INSTITUCIONAL PROTEGIDO: nenhum agente de IA ou desenvolvedor
 * pode redesenhar ou reinterpretar esta geometria. Qualquer alteração
 * exige aprovação explícita do fundador e atualização de TODAS as
 * cópias derivadas (checklist em BRAND_GUIDELINES.md, neste diretório).
 *
 * As letras usam `currentColor` para se adaptarem ao tema; o Núcleo IAH
 * e o wordmark usam o ciano da marca (design system, ADR-006).
 */
export function Logo({
  variant = "auto",
  wordmark = false,
  className,
  title = "IAH Educacional",
}: LogoProps) {
  const color =
    variant === "dark" || variant === "reverse"
      ? "#ffffff"
      : variant === "light" || variant === "primary"
        ? "var(--iah-ink)"
        : undefined;

  // Proporções reconstruídas a partir do arquivo oficial logoIAH1.png
  // fornecido pelo fundador em 19/07/2026. A versão anterior condensava
  // o conjunto e alterava de forma perceptível o A e o wordmark.
  const viewBox = wordmark ? "0 0 1100 700" : "0 0 1100 520";

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={viewBox}
      className={cn("h-7 w-auto", className)}
      style={color ? { color } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      {/* I — haste larga, com terminações arredondadas como no master oficial. */}
      <rect x="20" y="20" width="90" height="480" rx="25" fill="currentColor" />

      {/* A oficial: ápice, pés e junção arredondados; sem travessão. */}
      <path
        d="M435 22 L205 498 M435 22 L665 498"
        fill="none"
        stroke="currentColor"
        strokeWidth="86"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M435 315 L530 500 L340 500 Z"
        fill="#00a9c6"
      />

      {/* H */}
      <rect x="730" y="20" width="90" height="480" rx="25" fill="currentColor" />
      <rect x="990" y="20" width="90" height="480" rx="25" fill="currentColor" />
      <rect x="775" y="200" width="260" height="95" fill="currentColor" />

      {wordmark ? (
        <text
          x="550"
          y="665"
          textAnchor="middle"
          fontFamily="var(--iah-font-sans), system-ui, sans-serif"
          fontSize="68"
          fontWeight="300"
          letterSpacing="30"
          fill="#00a9c6"
        >
          EDUCACIONAL
        </text>
      ) : null}
    </svg>
  );
}
