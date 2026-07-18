import { ArrowRight, ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Navegação do Mission Flow — 1 ação principal (Continuar) por tela,
 * ação secundária (Voltar) sempre disponível exceto na Capa.
 */
export function MissionNavigation({
  onBack,
  onNext,
  nextLabel = "Continuar",
  nextDisabled = false,
  hideBack = false,
  hideNext = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
  hideNext?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
      {!hideBack ? (
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Voltar
        </Button>
      ) : (
        <span />
      )}
      {!hideNext ? (
        <Button size="lg" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
          <ArrowRight className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
