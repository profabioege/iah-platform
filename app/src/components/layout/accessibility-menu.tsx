"use client";

import * as React from "react";
import {
  AArrowDown,
  AArrowUp,
  Accessibility,
  Contrast,
  Crosshair,
  Monitor,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Opções de aparência disponíveis. */
export type ThemePreference = "dark" | "light" | "system";

/** Preferências de acessibilidade do usuário (ainda sem persistência). */
export interface AccessibilityPreferences {
  theme: ThemePreference;
  highContrast: boolean;
  reducedMotion: boolean;
  focusMode: boolean;
}

const defaultPreferences: AccessibilityPreferences = {
  theme: "dark",
  highContrast: false,
  reducedMotion: false,
  focusMode: false,
};

/**
 * Menu de Acessibilidade do Header (Sprint 1.1 — apenas interface).
 *
 * Ponto de conexão futuro: toda mudança de preferência passa por
 * `updatePreference` e todo ajuste de fonte por `adjustFontSize`.
 * A implementação real (aplicar tema/contraste/animações/fonte e
 * persistir a escolha) deverá ser conectada nesses dois pontos,
 * sem alterar a interface do menu.
 */
export function AccessibilityMenu() {
  const [preferences, setPreferences] =
    React.useState<AccessibilityPreferences>(defaultPreferences);

  function updatePreference<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
    // Futuro: aplicar o efeito na interface e persistir a preferência.
  }

  function adjustFontSize(direction: "increase" | "decrease") {
    // Futuro: ajustar o tamanho-base da fonte e persistir a preferência.
    void direction;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Acessibilidade"
            title="Acessibilidade"
          />
        }
      >
        <Accessibility className="size-5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuRadioGroup
          value={preferences.theme}
          onValueChange={(value) =>
            updatePreference("theme", value as ThemePreference)
          }
        >
          <DropdownMenuLabel>Aparência</DropdownMenuLabel>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" />
            Modo Escuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" />
            Modo Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4" />
            Seguir sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Leitura</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => adjustFontSize("increase")}>
            <AArrowUp className="size-4" />
            Aumentar fonte
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => adjustFontSize("decrease")}>
            <AArrowDown className="size-4" />
            Diminuir fonte
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Acessibilidade</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={preferences.highContrast}
            onCheckedChange={(checked) =>
              updatePreference("highContrast", checked === true)
            }
          >
            <Contrast className="size-4" />
            Alto contraste
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={preferences.reducedMotion}
            onCheckedChange={(checked) =>
              updatePreference("reducedMotion", checked === true)
            }
          >
            <Sparkles className="size-4" />
            Reduzir animações
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={preferences.focusMode}
            onCheckedChange={(checked) =>
              updatePreference("focusMode", checked === true)
            }
          >
            <Crosshair className="size-4" />
            Modo Foco
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
