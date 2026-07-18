"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Moldura de transição entre etapas do Mission Flow: rolagem ao topo
 * e um fade/slide curto a cada troca de `stepKey` — reforça a
 * sensação de "virar a página de uma investigação", não um corte
 * seco de formulário. `motion-reduce` desliga a animação (mantém só
 * a rolagem), respeitando prefers-reduced-motion.
 */
export function StepTransition({
  stepKey,
  children,
  className,
}: {
  stepKey: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [stepKey]);

  return (
    <div
      ref={ref}
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
