import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthMode } from "@/lib/auth-flags";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trocar senha | IAH Educacional",
  description: "Defina sua senha pessoal antes de continuar.",
};

const ERROS: Record<string, string> = {
  credenciais: "A senha atual não confere. Tente novamente.",
  curta: "A nova senha precisa ter pelo menos 10 caracteres.",
  diferente: "A confirmação não é igual à nova senha.",
  repetida: "A nova senha precisa ser diferente da temporária.",
  indisponivel: "A plataforma está temporariamente indisponível. Tente novamente mais tarde.",
};

/**
 * Troca da credencial inicial.
 *
 * Toda conta do piloto nasce com senha temporária individual e marcada
 * para troca (migration 0011). Enquanto não trocar, o layout privado
 * devolve o usuário para cá — a tela não é opcional, e não é um "lembrete"
 * que se possa ignorar.
 *
 * Existe só no modo real: no modo demonstração as contas são fictícias e
 * não têm ciclo de credencial.
 */
export default async function NovaSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (getAuthMode() !== "supabase") redirect("/entrar");

  const { auth } = await import("@/auth");
  const session = await auth();
  const user = session?.user as { mustChangePassword?: boolean } | undefined;
  if (!session) redirect("/entrar");

  const { erro } = await searchParams;
  const mensagem = erro ? (ERROS[erro] ?? ERROS.credenciais) : null;

  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10 text-foreground">
      <main className="flex w-full max-w-sm flex-col items-center text-center">
        <Logo variant="dark" wordmark className="h-16 w-auto" />
        <div className="mt-8 flex flex-col gap-2">
          <h1 className="text-balance text-2xl font-semibold tracking-tight">
            Crie a sua senha
          </h1>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            {user?.mustChangePassword
              ? "Você entrou com uma senha temporária. Defina agora uma senha só sua para continuar."
              : "Defina uma nova senha para a sua conta."}
          </p>
        </div>

        <form
          className="mt-7 flex w-full flex-col gap-4 rounded-[20px] border border-border bg-card/60 p-6 text-left"
          action={trocarSenhaAction}
        >
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Senha atual</span>
            <Input
              type="password"
              name="atual"
              required
              autoComplete="current-password"
              className="h-11 rounded-xl px-3.5"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Nova senha</span>
            <Input
              type="password"
              name="nova"
              required
              minLength={10}
              autoComplete="new-password"
              className="h-11 rounded-xl px-3.5"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Repita a nova senha</span>
            <Input
              type="password"
              name="confirmacao"
              required
              minLength={10}
              autoComplete="new-password"
              className="h-11 rounded-xl px-3.5"
            />
          </label>
          {mensagem ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm leading-relaxed text-destructive"
            >
              {mensagem}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="mt-1 h-11 w-full rounded-xl font-semibold">
            Salvar e entrar de novo
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Por segurança, você entra de novo com a senha nova. Guarde-a: quem redefine
            acesso é a escola, a seu pedido.
          </p>
        </form>
      </main>
    </div>
  );
}

/**
 * Troca de senha do próprio usuário. Confere a senha atual pelo mesmo
 * caminho do login (inclusive limitador), grava a nova e encerra a
 * sessão: o próximo acesso já usa a credencial nova.
 */
async function trocarSenhaAction(formData: FormData) {
  "use server";

  if (getAuthMode() !== "supabase") redirect("/entrar");

  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (nova.length < 10 || nova.length > 512) redirect("/entrar/nova-senha?erro=curta");
  if (nova !== confirmacao) redirect("/entrar/nova-senha?erro=diferente");
  if (nova === atual) redirect("/entrar/nova-senha?erro=repetida");

  const { auth, signOut } = await import("@/auth");
  const session = await auth();
  const user = session?.user as
    | { platformUserId?: string; email?: string | null }
    | undefined;
  if (!user?.platformUserId || !user.email) redirect("/entrar");

  const { verifyCredentials } = await import(
    "@/modules/identity/authentication/verify-credentials"
  );
  const confere = await verifyCredentials(user.email, atual);
  if (!confere || confere.platformUserId !== user.platformUserId) {
    redirect("/entrar/nova-senha?erro=credenciais");
  }

  const { getSupabaseAdminClient } = await import(
    "@/modules/platform/infrastructure/database/admin-client"
  );
  const { changeOwnPassword } = await import(
    "@/modules/identity/provisioning/pilot-provisioning"
  );
  await changeOwnPassword(getSupabaseAdminClient(), user.platformUserId, nova);

  await signOut({ redirectTo: "/entrar?trocou=1" });
}
