import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { auth, signIn } from "@/auth";
import { isAuthConfigured } from "@/lib/auth-flags";
import { Logo } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse a plataforma IAH Educacional.",
};

/**
 * Entrada da Plataforma.
 *
 * Com autenticação configurada (docs/AUTHENTICATION.md): login com
 * Google, sessão existente redireciona direto ao Dashboard. Sem
 * configuração: acesso direto, como no modo demonstração de sempre.
 */
export default async function EntrarPage() {
  const authEnabled = isAuthConfigured();
  if (authEnabled) {
    const session = await auth();
    if (session?.user) redirect("/dashboard");
  }

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

        {authEnabled ? (
          <form
            className="w-full"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" size="lg" className="w-full">
              Entrar com Google
              <ArrowRight className="size-4" />
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Use sua conta Google institucional autorizada.
            </p>
          </form>
        ) : (
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Entrar na plataforma
            <ArrowRight className="size-4" />
          </Link>
        )}
      </main>
    </div>
  );
}
