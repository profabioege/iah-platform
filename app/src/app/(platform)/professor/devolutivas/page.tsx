import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareHeart } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Devolutivas",
  description: "Onde as devolutivas do professor aos alunos vão se concentrar.",
};

/**
 * Placeholder honesto (D-016) — a tela dedicada de Devolutivas (histórico
 * unificado de retorno ao aluno em Missões, Sondagens e Aulas) ainda não
 * existe. Hoje a devolutiva acontece em dois lugares reais, para onde
 * esta página aponta em vez de fingir uma funcionalidade que não tem.
 */
export default function DevolutivasPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Devolutivas
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Em construção
        </h1>
        <p className="text-sm text-muted-foreground">
          Esta tela vai reunir, num só lugar, o retorno que você dá aos alunos em
          Missões, Sondagens e Aulas. Por enquanto, a devolutiva acontece em cada
          fluxo separadamente.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareHeart className="size-4" aria-hidden />
            Onde dar devolutiva hoje
          </CardTitle>
          <CardDescription>
            Os dois lugares reais onde você já revisa e devolve o trabalho do aluno.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/professor#acompanhamento"
            className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          >
            Acompanhamento da turma
          </Link>
          <Link
            href="/professor/avaliacoes"
            className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          >
            Correção de Sondagens
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
