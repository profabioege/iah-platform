import {
  PATH_LETTERS,
  PATH_TRIANGLE,
  PATH_WORDMARK,
  VIEWBOX_LETTERS,
  VIEWBOX_LOCKUP,
} from "@/components/brand/official-paths";
import { cn } from "@/lib/utils";

/**
 * "primary" (= "light") — letras navy, fundos claros; "reverse"
 * (= "dark") — letras brancas, fundos escuros; "auto" herda currentColor.
 * Os nomes oficiais são primary/reverse; light/dark permanecem como
 * sinônimos retrocompatíveis.
 */
type LogoVariant = "auto" | "light" | "dark" | "primary" | "reverse";

interface LogoProps {
  /**
   * Versão oficial: "primary"/"light" (navy, p/ fundo claro),
   * "reverse"/"dark" (branca, p/ fundo escuro) ou "auto" (herda
   * `currentColor`). O Núcleo IAH (triângulo) e a palavra EDUCACIONAL
   * usam sempre o acento oficial da marca.
   */
  variant?: LogoVariant;
  /** Exibe "EDUCACIONAL" abaixo das letras. */
  wordmark?: boolean;
  className?: string;
  title?: string;
}

/**
 * Logo oficial do IAH Educacional — MASTER da marca na aplicação. A
 * geometria vem do vetor entregue pelo fundador em 08/09/2026 e vive em
 * `official-paths.ts` (ao lado); toda cópia estática (public/brand/*.svg,
 * src/app/icon.svg, opengraph-image, apple-icon) é derivada dela.
 *
 * ATIVO INSTITUCIONAL PROTEGIDO: nenhum agente de IA ou desenvolvedor
 * pode redesenhar ou reinterpretar esta geometria. Substituição só por
 * novo arquivo oficial, seguindo o checklist de BRAND_GUIDELINES.md.
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
        ? "var(--iah-brand-navy)"
        : undefined;

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={wordmark ? VIEWBOX_LOCKUP : VIEWBOX_LETTERS}
      className={cn("h-7 w-auto", className)}
      style={color ? { color } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path fill="currentColor" fillRule="evenodd" d={PATH_LETTERS} />
      <path
        fill="var(--iah-brand-accent)"
        fillRule="evenodd"
        d={wordmark ? `${PATH_TRIANGLE} ${PATH_WORDMARK}` : PATH_TRIANGLE}
      />
    </svg>
  );
}
