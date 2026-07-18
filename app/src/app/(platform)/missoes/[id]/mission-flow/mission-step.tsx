import { cn } from "@/lib/utils";

/**
 * Moldura de uma etapa do Mission Flow: 1 rótulo (objetivo cognitivo da
 * tela), 1 título, espaço generoso, e o conteúdo — nunca mais de uma
 * etapa visível por vez (Progressive Disclosure).
 */
export function MissionStep({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6 py-2", className)}>
      <header className="flex flex-col gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
