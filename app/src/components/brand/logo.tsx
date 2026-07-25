import Image from "next/image";

import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "default" | "dark" | "light";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  mark?: boolean;
  /** Sigla IAH isolada (sem "Educacional") para uso inline junto a texto. */
  sigla?: boolean;
  className?: string;
  title?: string;
}

const sizeClasses: Record<LogoSize, string> = {
  sm: "h-7",
  md: "h-12",
  lg: "h-28",
};

/** Renderiza exclusivamente os ativos SVG oficiais da marca IAH Educacional. */
export function Logo({
  size = "md",
  variant = "default",
  mark = false,
  sigla = false,
  className,
  title = "IAH Educacional",
}: LogoProps) {
  const src = mark
    ? "/brand/mark.svg"
    : sigla
      ? "/brand/sigla-dark.svg"
      : variant === "dark"
        ? "/brand/logo-dark.svg"
        : variant === "light"
          ? "/brand/logo-light.svg"
          : "/brand/logo.svg";

  const [width, height] = mark ? [520, 520] : sigla ? [1100, 550] : [1100, 700];

  return (
    <Image
      src={src}
      alt={title}
      width={width}
      height={height}
      className={cn(sizeClasses[size], "w-auto", className)}
    />
  );
}
