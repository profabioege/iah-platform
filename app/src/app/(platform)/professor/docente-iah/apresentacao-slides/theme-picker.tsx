"use client";

import { Check } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { VISUAL_THEME_LIST } from "./themes";

/** Seleção do tema visual — muda só a aparência, nunca o rigor do conteúdo gerado. */
export function ThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (themeId: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Tema visual">
      {VISUAL_THEME_LIST.map((theme) => {
        const selected = value === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(theme.id)}
            className="text-left"
          >
            <Card className={cn("h-full transition-colors", selected && "border-primary bg-primary/5")}>
              <CardContent className="flex flex-col gap-2 py-2">
                <div
                  className={cn("h-16 w-full rounded-lg bg-gradient-to-br", theme.thumbnailGradient)}
                  aria-hidden
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{theme.name}</p>
                  {selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
                </div>
                <p className="text-xs text-muted-foreground">{theme.description}</p>
                <p className="text-[11px] text-muted-foreground">
                  {theme.contrast} · {theme.density}
                </p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
