import { cn } from "@/lib/utils";

type LogoVariant = "auto" | "light" | "dark";

interface LogoProps {
  /**
   * Cor das letras: "dark" (brancas, p/ fundo escuro), "light" (navy, p/
   * fundo claro) ou "auto" (herda `currentColor`). O acento (triângulo) e a
   * palavra EDUCACIONAL usam sempre o ciano da marca.
   */
  variant?: LogoVariant;
  /** Exibe "EDUCACIONAL" abaixo do símbolo. */
  wordmark?: boolean;
  className?: string;
  title?: string;
}

/**
 * Logo oficial do IAH Educacional — fonte única do desenho da marca.
 *
 * As letras usam `currentColor` para se adaptarem ao tema; o acento e o
 * wordmark usam o ciano da marca (design system, ADR-006).
 *
 * Para adotar o vetor oficial no futuro, basta substituir o conteúdo <svg>
 * deste arquivo: a API (variant/wordmark) e todos os pontos de uso
 * (header, sidebar, login, OG, etc.) permanecem inalterados.
 */
export function Logo({
  variant = "auto",
  wordmark = false,
  className,
  title = "IAH Educacional",
}: LogoProps) {
  const color =
    variant === "dark"
      ? "#ffffff"
      : variant === "light"
        ? "var(--iah-ink)"
        : undefined;

  const viewBox = wordmark ? "0 0 340 168" : "0 0 340 120";

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

      {/* I */}
      <rect x="8" y="8" width="34" height="104" rx="9" fill="currentColor" />

      {/* A — montanha (Λ) com triângulo ciano interno */}
      <path
        d="M70 112 L120 14 L170 112"
        fill="none"
        stroke="currentColor"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M120 66 L142 108 L98 108 Z" fill="var(--iah-cyan-400, #42e8f1)" />

      {/* H */}
      <rect x="206" y="8" width="34" height="104" rx="9" fill="currentColor" />
      <rect x="298" y="8" width="34" height="104" rx="9" fill="currentColor" />
      <rect x="206" y="45" width="126" height="30" rx="9" fill="currentColor" />

      {wordmark ? (
        <text
          x="170"
          y="152"
          textAnchor="middle"
          fontFamily="var(--iah-font-sans), system-ui, sans-serif"
          fontSize="26"
          fontWeight="700"
          letterSpacing="7"
          fill="var(--iah-cyan-400, #42e8f1)"
        >
          EDUCACIONAL
        </text>
      ) : null}
    </svg>
  );
}
