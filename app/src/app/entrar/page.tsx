import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse a plataforma IAH Educacional.",
};

/**
 * Entrada da Plataforma — abertura da experiência, com a marca IAH.
 *
 * Fase 1 do MVP: sem autenticação (o acesso é direto). Quando a autenticação
 * entrar, o formulário nasce aqui, preservando esta identidade visual.
 */
export default function EntrarPage() {
  return (
    <div className="dark relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      {/* brilhos decorativos da marca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-1/4 size-[32rem] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-0 size-[32rem] rounded-full bg-chart-2/10 blur-3xl"
      />

      <main className="relative flex w-full max-w-sm flex-col items-center gap-9 text-center">
        <Logo variant="dark" wordmark className="h-28 w-auto" />

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Laboratório do Auditor
          </h1>
          <p className="text-sm text-muted-foreground">
            Investigar, produzir e auditar a realidade — com método e uso
            crítico da Inteligência Artificial.
          </p>
        </div>

        <Link
          href="/dashboard"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          Entrar na plataforma
          <ArrowRight className="size-4" />
        </Link>
      </main>
    </div>
  );
}
