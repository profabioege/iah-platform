import { cn } from "@/lib/utils";

/**
 * Símbolo institucional da marca — o "Núcleo IAH" (IAH Core): o A com o
 * triângulo ciano interno, extraído do logotipo oficial (M18.3).
 *
 * GEOMETRIA PROTEGIDA: é a mesma do master `logo.tsx`, apenas
 * transladada para um viewBox quadrado próprio (offset x−60, y+3 —
 * nenhum ponto redesenhado). O logotipo oficial do IAH é um ativo
 * institucional protegido; nenhum agente de IA ou desenvolvedor pode
 * redesenhá-lo ou reinterpretá-lo (ver BRAND_GUIDELINES.md ao lado).
 *
 * Usos previstos: favicon, sidebar recolhida, loading, notificações,
 * Mentor IA, certificados, ícones de aplicativo.
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
        ? "var(--iah-ink)"
        : undefined;

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 520 520"
      className={cn("h-7 w-auto", className)}
      style={color ? { color } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path
        d="M260 22 L30 498 M260 22 L490 498"
        fill="none"
        stroke="currentColor"
        strokeWidth="86"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M260 315 L355 500 L165 500 Z" fill="#00a9c6" />
    </svg>
  );
}
