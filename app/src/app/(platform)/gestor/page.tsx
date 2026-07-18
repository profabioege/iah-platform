import type { Metadata } from "next";
import {
  BarChart3,
  Building2,
  GraduationCap,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";

import {
  BERYON_ENROLLMENTS,
  BERYON_TEACHER,
  BERYON_USERS,
  getWorkspaceContext,
  ROLE_LABEL,
} from "@/modules/workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Painel do Gestor",
  description: "Visão institucional da Plataforma IAH.",
};

/**
 * Workspace do Administrador Institucional (M15): Instituição,
 * Professores, Turmas, Usuários — e os placeholders honestos (D-016)
 * de Configurações e Dashboard Gestor (indicadores agregados seguem
 * planejados no ROADMAP, "Painel do Gestor MVP Comercial").
 */
export default async function GestorPage() {
  const context = await getWorkspaceContext();
  if (!context) return null; // middleware garante sessão; guarda defensiva

  const usersByRole = {
    admin: BERYON_USERS.filter((u) => u.role === "admin").length,
    teacher: BERYON_USERS.filter((u) => u.role === "teacher").length,
    student: BERYON_USERS.filter((u) => u.role === "student").length,
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Painel do Gestor
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {context.institution.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ano Letivo {context.schoolYear.label} · Ambiente de demonstração —
          dados simulados.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WorkspaceCard icon={Building2} title="Instituição">
          <p className="text-sm text-foreground/90">{context.institution.name}</p>
          <p className="text-xs text-muted-foreground">
            {context.subjects.map((s) => s.name).join(", ")}
          </p>
        </WorkspaceCard>

        <WorkspaceCard icon={GraduationCap} title="Professores">
          <p className="text-sm text-foreground/90">{BERYON_TEACHER.name}</p>
          <p className="text-xs text-muted-foreground">{BERYON_TEACHER.email}</p>
        </WorkspaceCard>

        <WorkspaceCard icon={UsersRound} title="Turmas">
          <div className="flex flex-wrap gap-1.5">
            {context.classrooms.map((classroom) => (
              <Badge key={classroom.id} variant="outline" className="font-normal">
                {classroom.name} ·{" "}
                {BERYON_ENROLLMENTS.filter((e) => e.classroomId === classroom.id).length}{" "}
                alunos
              </Badge>
            ))}
          </div>
        </WorkspaceCard>

        <WorkspaceCard icon={Users} title="Usuários">
          <ul className="flex flex-col gap-1 text-sm text-foreground/90">
            <li>
              {usersByRole.admin} · {ROLE_LABEL.admin}
            </li>
            <li>
              {usersByRole.teacher} · {ROLE_LABEL.teacher}
            </li>
            <li>
              {usersByRole.student} · {ROLE_LABEL.student}s
            </li>
          </ul>
        </WorkspaceCard>

        <WorkspaceCard icon={Settings} title="Configurações" soon>
          <p className="text-sm text-muted-foreground">
            Preferências institucionais da plataforma.
          </p>
        </WorkspaceCard>

        <WorkspaceCard icon={BarChart3} title="Dashboard Gestor" soon>
          <p className="text-sm text-muted-foreground">
            Indicadores agregados de adoção e progresso pedagógico.
          </p>
        </WorkspaceCard>
      </div>
    </div>
  );
}

function WorkspaceCard({
  icon: Icon,
  title,
  soon = false,
  children,
}: {
  icon: typeof Building2;
  title: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={soon ? "opacity-60" : undefined}>
      <CardContent className="flex flex-col gap-2 py-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon className="size-3.5" />
          {title}
          {soon ? (
            <span className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal">
              Em breve
            </span>
          ) : null}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}
