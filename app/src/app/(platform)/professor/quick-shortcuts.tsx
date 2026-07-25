import Link from "next/link";
import { Rocket, Sparkles, UsersRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Atalhos rápidos do Painel do Professor — as três portas de entrada da
 * rotina docente (redesenho de redução de carga cognitiva, M18.4). Aulas,
 * Sondagens e Devolutivas saíram deste grid: suas funções passam a ser
 * acessadas a partir de Turmas (acompanhamento) e DocentIAH (criação).
 */
export function QuickShortcuts() {
  return (
    <section aria-label="Atalhos rápidos" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <LinkCard icon={UsersRound} title="Turmas" description="Monitore suas turmas, atividades e devolutivas." href="/professor/turmas" />
      <LinkCard icon={Rocket} title="Missões" description="Crie e acompanhe missões investigativas." href="/professor/estudio" />
      <LinkCard icon={Sparkles} title="DocentIAH" description="Crie suas aulas com apenas um prompt." href="/professor/docente-iah" />
    </section>
  );
}

export function LinkCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Rocket;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardContent className="flex flex-col gap-2 py-2">
          <CardLabel icon={Icon} title={title} />
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function CardLabel({
  icon: Icon,
  title,
  soon = false,
}: {
  icon: typeof Rocket;
  title: string;
  soon?: boolean;
}) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      <Icon className="size-3.5" />
      {title}
      {soon ? (
        <span className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal">
          Em breve
        </span>
      ) : null}
    </p>
  );
}
