import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  FlaskConical,
  ListChecks,
  Sparkles,
  Target,
} from "lucide-react";

import { localMissionRepository } from "@/modules/library";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ProductionPanel } from "./production-panel";

/**
 * Tela de uma Missão — usada pelo professor para apresentar e pelo aluno
 * para investigar. Renderiza os 11 blocos do padrão (docs/MISSION.md) a
 * partir do conteúdo local. A produção e a reflexão do aluno entram nas
 * próximas entregas.
 */
export default async function MissaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mission = await localMissionRepository.getById(id);

  if (!mission) notFound();

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <Link
        href="/missoes"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Todas as missões
      </Link>

      {/* Cabeçalho — pergunta norteadora em destaque */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/15 text-primary">
            Missão {String(mission.number).padStart(2, "0")}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {mission.module}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {mission.title}
        </h1>
        <p className="text-lg italic text-chart-2 md:text-xl">
          &ldquo;{mission.guidingQuestion}&rdquo;
        </p>
      </header>

      {/* Objetivo */}
      <Section icon={Target} title="Objetivo">
        <p>{mission.objective}</p>
      </Section>

      {/* Contexto */}
      <Section icon={BookOpen} title="Contexto">
        <p>{mission.context}</p>
      </Section>

      {/* Material didático */}
      <Section icon={ListChecks} title="Material Didático">
        <BlockList items={mission.didacticMaterials} />
      </Section>

      {/* Ferramentas de IA */}
      <Section icon={FlaskConical} title="Ferramentas de IA">
        <BlockList items={mission.aiTools} />
      </Section>

      {/* Desafio — destaque */}
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            O Desafio
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-foreground/90">
          {mission.challenge}
        </CardContent>
      </Card>

      {/* O que você vai entregar */}
      <Section icon={ListChecks} title="O que você vai produzir">
        <p>{mission.studentProduction}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">Entrega:</strong>{" "}
          {mission.delivery}
        </p>
      </Section>

      {/* Produção do Aluno — o aluno escreve e entrega aqui */}
      <ProductionPanel missionId={mission.id} />

      {/* Competências */}
      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-sm font-medium text-muted-foreground">
          Competências desenvolvidas
        </h2>
        <div className="flex flex-wrap gap-2">
          {mission.competencies.map((competency) => (
            <Badge key={competency} variant="outline" className="font-normal">
              {competency}
            </Badge>
          ))}
        </div>
      </section>
    </article>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Target;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {title}
      </h2>
      <div className="text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function BlockList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
