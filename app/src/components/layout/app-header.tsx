"use client";

import { usePathname } from "next/navigation";

import { AccessibilityMenu } from "@/components/layout/accessibility-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/** Título da seção atual, derivado da URL. */
function sectionTitle(pathname: string): string {
  if (pathname.startsWith("/missoes")) return "Missões";
  if (pathname.startsWith("/diario")) return "Diário do Auditor";
  if (pathname.startsWith("/professor")) return "Painel do Professor";
  if (pathname.startsWith("/gestor")) return "Painel do Gestor";
  return "Dashboard";
}

export function AppHeader({
  actions,
  badgeLabel,
}: {
  actions?: React.ReactNode;
  /** Rótulo institucional (ex.: "Colégio Beryon · 2026") — vem do Workspace (M15). */
  badgeLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="!h-5" />
      <span className="text-sm font-medium">{sectionTitle(pathname)}</span>
      <div className="ml-auto flex items-center gap-3">
        <Badge
          variant="outline"
          className="hidden border-primary/40 bg-primary/10 text-primary sm:inline-flex"
        >
          {badgeLabel ?? "Ensino Médio · 2026"}
        </Badge>
        {actions}
        <AccessibilityMenu />
      </div>
    </header>
  );
}
