import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Placeholder honesto (D-016) para telas institucionais ainda não
 * construídas (Mantenedor/Direção/Coordenação Pedagógica — D-046):
 * reconhece a seção, explica o que ainda falta e, quando existe um
 * lugar real com parte do dado, aponta pra lá em vez de fingir uma
 * tela que não existe. Mesma forma de `professor/devolutivas` e
 * `professor/docente-iah/tarefa/[slug]`, num componente novo e
 * compartilhado (sem editar nada em `professor/`).
 */
export function InstitutionalPlaceholder({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  bridgeHref,
  bridgeLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  bridgeHref?: string;
  bridgeLabel?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href={backHref}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {backLabel}
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Em construção</CardTitle>
          <CardDescription>Esta tela ainda não tem dado real para mostrar.</CardDescription>
        </CardHeader>
        {bridgeHref ? (
          <CardContent>
            <Link href={bridgeHref} className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
              {bridgeLabel}
            </Link>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
