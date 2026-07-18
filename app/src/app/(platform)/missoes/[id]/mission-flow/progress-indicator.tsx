import { cn } from "@/lib/utils";

/**
 * Progresso visual do Mission Flow — "Etapa X de Y" + barra segmentada.
 * Não interativo de propósito (baixa carga cognitiva: a navegação vive
 * só em MissionNavigation, um único caminho por vez).
 */
export function ProgressIndicator({
  current,
  total,
  minutesRemaining,
}: {
  current: number;
  total: number;
  minutesRemaining?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < current ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Etapa {current} de {total}
        </span>
        {minutesRemaining ? (
          <span className="text-xs font-medium text-muted-foreground">
            ~{minutesRemaining} min restantes
          </span>
        ) : null}
      </div>
    </div>
  );
}
