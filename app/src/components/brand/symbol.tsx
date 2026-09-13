import {
  PATH_LETTER_A,
  PATH_TRIANGLE,
  VIEWBOX_SYMBOL,
} from "@/components/brand/official-paths";
import { cn } from "@/lib/utils";

/**
 * Símbolo institucional da marca — o "Núcleo IAH" (IAH Core): o A com o
 * triângulo de acento interno, recortado do logotipo oficial.
 *
 * GEOMETRIA PROTEGIDA: são os mesmos paths do master `logo.tsx`, na mesma
 * malha de coordenadas — muda só a moldura (viewBox), nenhum ponto é
 * transladado, escalado ou redesenhado. O logotipo oficial do IAH é um
 * ativo institucional protegido; nenhum agente de IA ou desenvolvedor
 * pode redesenhá-lo ou reinterpretá-lo (ver BRAND_GUIDELINES.md ao lado).
 *
 * Usos previstos: favicon, sidebar recolhida, loading, notificações,
 * Mentor IAH, certificados, ícones de aplicativo.
 */
export function BrandSymbol({
  variant = "auto",
  className,
  title = "IAH",
}: {
  /** "dark" = branco (fundos escuros), "light" = navy (fundos claros), "auto" = currentColor. */
  variant?: "auto" | "light" | "dark";
  className?: string;
  title?: string;
}) {
  const color =
    variant === "dark"
      ? "#ffffff"
      : variant === "light"
        ? "var(--iah-brand-navy)"
        : undefined;

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={VIEWBOX_SYMBOL}
      className={cn("h-7 w-auto", className)}
      style={color ? { color } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path fill="currentColor" fillRule="evenodd" d={PATH_LETTER_A} />
      <path
        fill="var(--iah-brand-accent)"
        fillRule="evenodd"
        d={PATH_TRIANGLE}
      />
    </svg>
  );
}
