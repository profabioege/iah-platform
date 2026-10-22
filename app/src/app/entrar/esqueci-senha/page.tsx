import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { getAuthMode } from "@/lib/auth-flags";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Esqueci minha senha | IAH Educacional",
  description: "Como recuperar o acesso à plataforma.",
};

/**
 * Orientação de recuperação de acesso — sem autoatendimento.
 *
 * O piloto não tem recuperação automática por e-mail (contas de estudante
 * podem nem ter caixa postal). A senha é redefinida pela rotina
 * administrativa oficial (`scripts/pilot-credential-reset.mjs`, chamada
 * por `piloto-recuperar-acesso.cmd`): senha temporária individual, troca
 * obrigatória no próximo acesso e sessões anteriores invalidadas. Esta
 * tela só explica a quem pedir; não recebe nem promete nada.
 *
 * Existe só no modo real: no modo demonstração as contas são fictícias.
 */
export default function EsqueciSenhaPage() {
  if (getAuthMode() !== "supabase") redirect("/entrar");

  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10 text-foreground">
      <main className="flex w-full max-w-sm flex-col items-center text-center">
        <Logo variant="dark" wordmark className="h-16 w-auto" />

        <div className="mt-8 flex flex-col gap-2">
          <h1 className="text-balance text-2xl font-semibold tracking-tight">
            Esqueci minha senha
          </h1>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            A recuperação é feita pela escola, a seu pedido. Não há envio de
            e-mail de recuperação.
          </p>
        </div>

        <section
          aria-labelledby="quem-procurar"
          className="mt-7 flex w-full flex-col gap-4 rounded-[20px] border border-border bg-card/60 p-6 text-left text-sm leading-relaxed"
        >
          <h2 id="quem-procurar" className="font-semibold">
            Quem procurar
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              <span className="font-medium">Alunos:</span> procurem o professor
              da turma, que encaminha o pedido ao responsável pela operação do
              piloto.
            </li>
            <li>
              <span className="font-medium">Professores e gestores:</span>{" "}
              acionem o responsável pela operação do piloto.
            </li>
          </ul>
          <p className="text-muted-foreground">
            Você recebe uma senha temporária individual e precisa trocá-la no
            primeiro acesso. As sessões abertas com a senha anterior deixam de
            valer.
          </p>
          <p className="border-t border-border pt-4 text-muted-foreground">
            Ninguém da escola ou da plataforma pede a sua senha. Não a envie
            por mensagem, e-mail ou conversa.
          </p>
        </section>

        <Link
          href="/entrar"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-5 h-11 w-full rounded-xl")}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para o login
        </Link>
      </main>
    </div>
  );
}
