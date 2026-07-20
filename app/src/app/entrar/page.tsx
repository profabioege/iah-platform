import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";

import { auth, signIn } from "@/auth";
import { isAuthConfigured } from "@/lib/auth-flags";
import {
  getWorkspaceAuthProvider,
  getWorkspaceUser,
  roleHome,
  WORKSPACE_DEMO_PASSWORD,
  WORKSPACE_INSTITUTION,
  WORKSPACE_SESSION_COOKIE,
  WORKSPACE_TEACHER,
} from "@/modules/workspace";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse a plataforma IAH Educacional.",
};

/**
 * Entrada da Plataforma — login institucional (Institutional Workspace,
 * M15): e-mail + senha, papel identificado automaticamente pelo sistema
 * (nunca escolhido na tela). Com a autenticação real configurada
 * (docs/AUTHENTICATION.md), vale o login com Google de sempre.
 */
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const authEnabled = isAuthConfigured();
  if (authEnabled) {
    const session = await auth();
    if (session?.user) redirect("/dashboard");
  } else {
    const user = await getWorkspaceUser();
    if (user) redirect(roleHome(user.role));
  }
  const { erro } = await searchParams;

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
          <form className="flex w-full flex-col gap-3" action={loginAction}>
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-xs font-medium text-muted-foreground">
                E-mail
              </span>
              <Input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder={`voce@${WORKSPACE_INSTITUTION.domain}`}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-xs font-medium text-muted-foreground">
                Senha
              </span>
              <Input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>
            {erro ? (
              <p role="alert" className="text-sm text-destructive">
                E-mail ou senha inválidos.
              </p>
            ) : null}
            <Button type="submit" size="lg" className="mt-1 w-full">
              Entrar
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ambiente de demonstração — contas simuladas do{" "}
              {WORKSPACE_INSTITUTION.name} (ex.: {WORKSPACE_TEACHER.email}),
              senha {WORKSPACE_DEMO_PASSWORD}.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const user = await getWorkspaceAuthProvider().authenticate(email, password);
  if (!user) redirect("/entrar?erro=credenciais");

  const store = await cookies();
  store.set(WORKSPACE_SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect(roleHome(user.role));
}
