import Link from "next/link";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  Library,
  Rocket,
  UsersRound,
  Wand2,
} from "lucide-react";

import type { Classroom } from "@/modules/workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Workspace do Professor (M15) — o hub que o professor vê ao entrar:
 * Disciplina, Turmas e as portas de todos os motores já construídos
 * (Curriculum Engine, Lesson Composer, Estúdio/Mission Flow), mais os
 * placeholders honestos (D-016) do que ainda não tem tela (Biblioteca
 * Oficial/Knowledge Engine, Avaliação Assistida, Analytics da Turma).
 */
export function TeacherWorkspace({
  subjectName,
  classrooms,
}: {
  subjectName: string | null;
  classrooms: Classroom[];
}) {
  return (
    <section aria-label="Meu Workspace" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {subjectName ? (
        <InfoCard icon={BookMarked} title="Minha Disciplina">
          <p className="text-sm text-foreground/90">{subjectName}</p>
        </InfoCard>
      ) : null}

      {classrooms.length > 0 ? (
        <Link href="/professor/turmas">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="flex flex-col gap-2 py-2">
              <CardLabel icon={UsersRound} title="Minhas Turmas" />
              <div className="flex flex-wrap gap-1.5">
                {classrooms.map((classroom) => (
                  <Badge key={classroom.id} variant="outline" className="font-normal">
                    {classroom.name}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Lessons, Mission publicada e acompanhamento por turma.
              </p>
            </CardContent>
          </Card>
        </Link>
      ) : null}

      <LinkCard
        icon={CalendarRange}
        title="Planejamento Anual"
        description="Curriculum Engine — o Currículo Vivo, navegável."
        href="/professor/curriculo"
      />
      <LinkCard
        icon={Wand2}
        title="Lesson Composer"
        description="Monte o Pacote Pedagógico de uma aula em 7 etapas."
        href="/professor/aulas"
      />
      <LinkCard
        icon={BookOpen}
        title="Estúdio de Missões"
        description="Crie, versione e publique Missões investigativas."
        href="/professor/estudio"
      />
      <LinkCard
        icon={Rocket}
        title="Mission Flow"
        description="A experiência de investigação que o aluno percorre."
        href="/missoes"
      />

      <SoonCard
        icon={Library}
        title="Biblioteca Oficial"
        description="Knowledge Engine — acervo curado com metadados BNCC."
      />
      <LinkCard
        icon={ClipboardCheck}
        title="Sondagem Diagnóstica"
        description="Crie atividades, acompanhe respostas e valide correções."
        href="/professor/avaliacoes"
      />
      <SoonCard
        icon={BarChart3}
        title="Analytics da Turma"
        description="Indicadores pedagógicos por competência."
      />
    </section>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-2">
        <CardLabel icon={Icon} title={title} />
        {children}
      </CardContent>
    </Card>
  );
}

function LinkCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof BookOpen;
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

function SoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <Card className="opacity-60">
      <CardContent className="flex flex-col gap-2 py-2">
        <CardLabel icon={Icon} title={title} soon />
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function CardLabel({
  icon: Icon,
  title,
  soon = false,
}: {
  icon: typeof BookOpen;
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
