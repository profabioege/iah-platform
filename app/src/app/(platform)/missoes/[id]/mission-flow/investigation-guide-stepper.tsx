"use client";

import * as React from "react";

import { AlertTriangle, ArrowRight, ChevronLeft, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ParsedGuideEntry } from "./parse-mission-content";

/**
 * Guia de Investigação como stepper — um filtro por vez (Progressive
 * Disclosure), em vez dos cinco cartões simultâneos que dividiam a
 * atenção do estudante e estouravam o viewport.
 *
 * Estado só no cliente (qual filtro está aberto): nada é persistido,
 * nenhuma resposta do estudante é tocada — recarregar volta ao filtro 1.
 * O botão final chama `onComplete`, que segue exatamente para a mesma
 * etapa de antes (o Dossiê), preservando o fluxo da Missão.
 */
export function InvestigationGuideStepper({
  entries,
  onBack,
  onComplete,
  completeLabel = "Aplicar os 5 filtros",
}: {
  entries: ParsedGuideEntry[];
  onBack: () => void;
  onComplete: () => void;
  completeLabel?: string;
}) {
  const [active, setActive] = React.useState(0);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  if (entries.length === 0) return null;

  const total = entries.length;
  const current = entries[Math.min(active, total - 1)];
  const isLast = active === total - 1;

  function focusTab(index: number) {
    const next = (index + total) % total;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  /** Setas/Home/End no stepper — padrão WAI-ARIA de tablist. */
  function onTabKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(total - 1);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
      {/* Stepper: rolável no mobile; quebra em linhas no desktop para
          nunca cortar o último filtro (viewport estreito + sidebar). */}
      <div
        role="tablist"
        aria-label="Filtros de investigação"
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
      >
        {entries.map((entry, index) => {
          const isActive = index === active;
          return (
            <button
              key={entry.label}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              type="button"
              id={`filtro-tab-${index}`}
              aria-selected={isActive}
              aria-current={isActive ? "step" : undefined}
              aria-controls={`filtro-painel-${index}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cn(
                "flex shrink-0 snap-start items-center gap-2 rounded-lg border px-3 py-2",
                "text-sm transition-colors focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "focus-visible:ring-offset-background",
                isActive
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md",
                  "text-xs font-semibold tabular-nums",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="whitespace-nowrap">{entry.label}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent
          role="tabpanel"
          id={`filtro-painel-${active}`}
          aria-labelledby={`filtro-tab-${active}`}
          tabIndex={0}
          className="flex flex-col gap-4 py-1 focus-visible:outline-none"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            <span className="tabular-nums">
              {String(active + 1).padStart(2, "0")}
            </span>{" "}
            · {current.label}
          </p>

          {/* Pergunta principal: maior peso visual da tela. */}
          <h2 className="text-xl font-semibold leading-snug tracking-tight md:text-2xl">
            {current.question ?? current.label}
          </h2>

          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>

          {current.warning ? (
            <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">Sinal de alerta: </span>
                <span className="text-muted-foreground">{current.warning}</span>
              </p>
            </div>
          ) : null}

          {current.example ? (
            <div className="flex gap-3 rounded-lg border border-dashed border-border p-3">
              <Lightbulb
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">Exemplo: </span>
                <span className="text-muted-foreground">{current.example}</span>
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (active === 0 ? onBack() : setActive(active - 1))}
        >
          <ChevronLeft className="size-4" />
          {active === 0 ? "Voltar" : "Anterior"}
        </Button>

        <p aria-live="polite" className="text-xs text-muted-foreground">
          Filtro <span className="tabular-nums">{active + 1}</span> de{" "}
          <span className="tabular-nums">{total}</span>
        </p>

        <Button
          size="lg"
          onClick={() => (isLast ? onComplete() : setActive(active + 1))}
        >
          {isLast ? completeLabel : "Próximo filtro"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
