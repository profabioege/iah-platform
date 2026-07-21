import Link from "next/link";
import {
  ClipboardCheck,
  MessageSquareHeart,
  Rocket,
  Sparkles,
  UsersRound,
  Wand2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Atalhos rápidos do Painel do Professor — as seis portas de entrada da
 * rotina docente (redesenho de redução de carga cognitiva). Currículo
 * Vivo, Biblioteca Oficial e Indicadores da Turma saíram deste grid:
 * o primeiro migrou para dentro do DocentIAH (DocentIAH → Planejar →
 * Planejamento anual), os dois últimos não têm função imediata aqui
 * (Indicadores avançados vivem só na Gestão).
 */
export function QuickShortcuts() {
  return (
    <section aria-label="Atalhos rápidos" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <LinkCard icon={UsersRound} title="Turmas" description="Suas turmas, matrículas e sincronização." href="/professor/turmas" />
      <LinkCard icon={Wand2} title="Aulas" description="Monte o Pacote Pedagógico de uma aula em 7 etapas." href="/professor/aulas" />
      <LinkCard icon={Rocket} title="Missões" description="Crie, versione e publique Missões investigativas." href="/professor/estudio" />
      <LinkCard icon={ClipboardCheck} title="Sondagens" description="Crie atividades, acompanhe respostas e valide correções." href="/professor/avaliacoes" />
      <LinkCard icon={MessageSquareHeart} title="Devolutivas" description="Onde suas devolutivas aos alunos se concentram." href="/professor/devolutivas" />
      <LinkCard icon={Sparkles} title="DocentIAH" description="Inteligência pedagógica para planejar, criar e acompanhar." href="/professor/docente-iah" />
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
