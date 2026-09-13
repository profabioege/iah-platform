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
  credenciais:
    "E-mail ou senha incorretos. Verifique os dados e tente novamente.",
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
    <div className="dark relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground">
      {/* brilhos discretos da marca — só o ciano institucional */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-1/4 size-[32rem] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-0 size-[28rem] rounded-full bg-primary/5 blur-3xl"
      />

      <main className="relative flex w-full max-w-sm flex-col items-center text-center">
        <Logo variant="dark" wordmark className="h-16 w-auto sm:h-20" />

        <div className="mt-8 flex flex-col gap-2 sm:mt-9">
          <h1 className="text-balance text-2xl font-semibold tracking-tight">
            Acesse o IAH Educacional
          </h1>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            Entre com seu e-mail e senha para continuar.
          </p>
        </div>

        <form
          className="mt-7 flex w-full flex-col gap-4 rounded-[20px] border border-border bg-card/60 p-6 text-left sm:mt-8 sm:p-7"
          action={realMode ? credentialsLoginAction : demoLoginAction}
        >
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              E-mail
            </span>
            <Input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="h-11 rounded-xl px-3.5"
              placeholder={
                realMode
                  ? "voce@suaescola.edu.br"
                  : `voce@${WORKSPACE_INSTITUTION.domain}`
              }
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Senha
            </span>
            <Input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="h-11 rounded-xl px-3.5"
              placeholder="••••••••"
            />
          </label>
          {errorMessage ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm leading-relaxed text-destructive"
            >
              {errorMessage}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="mt-1 h-11 w-full rounded-xl font-semibold"
          >
            Entrar
            <ArrowRight className="size-4" />
          </Button>
          {realMode ? null : (
            <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              Ambiente de demonstração — contas simuladas do{" "}
              {WORKSPACE_INSTITUTION.name} (ex.: {WORKSPACE_TEACHER.email}),
              senha {WORKSPACE_DEMO_PASSWORD}.
            </p>
          )}
        </form>

        {realMode && isGoogleAuthConfigured() ? (
          <form
            className="mt-5 w-full"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/entrar" });
            }}
          >
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="h-11 w-full rounded-xl"
            >
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
