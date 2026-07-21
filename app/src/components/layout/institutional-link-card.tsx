import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

/** Card de atalho reutilizável nas áreas institucionais (Mantenedor/Direção/Coordenação — D-046). */
export function InstitutionalLinkCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardContent className="flex flex-col gap-2 py-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Icon className="size-3.5" />
            {title}
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
