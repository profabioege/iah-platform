import Image from "next/image";

import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "default" | "dark" | "light";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  mark?: boolean;
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
  className,
  title = "IAH Educacional",
}: LogoProps) {
  const src = mark
    ? "/brand/mark.svg"
    : variant === "dark"
      ? "/brand/logo-dark.svg"
      : variant === "light"
        ? "/brand/logo-light.svg"
        : "/brand/logo.svg";

  return (
    <Image
      src={src}
      alt={title}
      width={mark ? 520 : 1100}
      height={mark ? 520 : 700}
      className={cn(sizeClasses[size], "w-auto", className)}
    />
  );
}
