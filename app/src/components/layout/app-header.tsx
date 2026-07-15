import { AccessibilityMenu } from "@/components/layout/accessibility-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="!h-5" />
      <span className="text-sm font-medium">Dashboard</span>
      <div className="ml-auto flex items-center gap-3">
        <Badge
          variant="outline"
          className="hidden border-primary/40 bg-primary/10 text-primary sm:inline-flex"
        >
          Ensino Médio &middot; 2026
        </Badge>
        <AccessibilityMenu />
      </div>
    </header>
  );
}
