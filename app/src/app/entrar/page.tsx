import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { isAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth-flags";
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

const ERROR_MESSAGES: Record<string, string> = {
  credenciais: "E-mail ou senha inválidos.",
  sessao: "Sua sessão expirou — entre novamente.",
  indisponivel:
    "Não foi possível falar com o servidor de autenticação. Tente novamente em instantes.",
};

/**
 * Entrada da Plataforma — login institucional: e-mail + senha, papel
 * identificado automaticamente pelo vínculo persistido (nunca escolhido
 * na tela). No modo REAL (M22), as credenciais são verificadas contra o
 * banco via Auth.js (Credentials; Google opcional, D-025) e NENHUMA
 * senha aparece na tela. No modo demonstração local, vale o Workspace
 * simulado de sempre (M15), com as contas fictícias exibidas.
 */
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const realMode = isAuthConfigured();
  const user = await getWorkspaceUser();
  if (user) redirect(roleHome(user.role));

  const { erro } = await searchParams;
  const errorMessage = erro ? (ERROR_MESSAGES[erro] ?? ERROR_MESSAGES.credenciais) : null;

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

        <form
          className="flex w-full flex-col gap-3"
          action={realMode ? credentialsLoginAction : demoLoginAction}
        >
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-medium text-muted-foreground">
              E-mail
            </span>
            <Input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder={
                realMode
                  ? "voce@suaescola.edu.br"
                  : `voce@${WORKSPACE_INSTITUTION.domain}`
              }
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
          {errorMessage ? (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="mt-1 w-full">
            Entrar
            <ArrowRight className="size-4" />
          </Button>
          {realMode ? null : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ambiente de demonstração — contas simuladas do{" "}
              {WORKSPACE_INSTITUTION.name} (ex.: {WORKSPACE_TEACHER.email}),
              senha {WORKSPACE_DEMO_PASSWORD}.
            </p>
          )}
        </form>

        {realMode && isGoogleAuthConfigured() ? (
          <form
            className="w-full"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/entrar" });
            }}
          >
            <Button type="submit" variant="outline" size="lg" className="w-full">
              Entrar com Google
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Use sua conta Google institucional autorizada.
            </p>
          </form>
        ) : null}
      </main>
    </div>
  );
}

/**
 * Login do modo REAL — Auth.js Credentials. Após autenticar, volta a
 * /entrar, que redireciona para a rota inicial do papel persistido.
 */
async function credentialsLoginAction(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/entrar",
    });
  } catch (error) {
    // NEXT_REDIRECT (sucesso) não é AuthError — precisa ser relançado.
    if (error instanceof AuthError) {
      redirect(
        error.type === "CredentialsSignin"
          ? "/entrar?erro=credenciais"
          : "/entrar?erro=indisponivel",
      );
    }
    throw error;
  }
}

/** Login do modo demonstração (Workspace local, M15). */
async function demoLoginAction(formData: FormData) {
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
