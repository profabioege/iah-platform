import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SessionControls } from "@/components/layout/session-controls";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { isAuthConfigured } from "@/lib/auth-flags";
import { emptyStudentWork, pickActiveMissionId } from "@/modules/classroom";
import { localMissionRepository } from "@/modules/library";
import {
  createLearningCycleService,
  getDefaultRepositories,
} from "@/modules/platform";
import {
  getWorkspaceContext,
  ROLE_LABEL,
  type WorkspaceContext,
} from "@/modules/workspace";

/**
 * Missão ativa do aluno para o CTA do Mentor IAH na sidebar (mesma regra
 * de `dashboard-home.tsx`, ver `pickActiveMissionId`). Só é resolvida no
 * modo REAL (M22) — no modo demonstração o progresso vive no
 * `localStorage` do dispositivo, inacessível a este Server Component; o
 * CTA fica indisponível nesse modo (limitação conhecida, não é regressão).
 */
async function resolveStudentActiveMissionId(
  context: WorkspaceContext | null,
): Promise<string | null> {
  if (!context || context.role !== "student" || !isAuthConfigured()) return null;

  const classroomId = context.classrooms[0]?.id;
  const studentId = context.user.studentId;
  if (!classroomId || !studentId) return null;

  const repos = getDefaultRepositories();
  const [missions, assignments] = await Promise.all([
    localMissionRepository.list(),
    repos.missionAssignments.listByClassroom(context.institution.id, classroomId),
  ]);

  const availableMissionIds = new Set(
    assignments
      .filter((assignment) => assignment.status !== "draft")
      .map((assignment) => assignment.missionId),
  );
  const availableMissions = missions.filter(
    (mission) => availableMissionIds.has(mission.id) && mission.status === "published",
  );
  if (availableMissions.length === 0) return null;

  const service = createLearningCycleService(repos);
  const works = await Promise.all(
    availableMissions.map((mission) =>
      service.getStudentWork({
        institutionId: context.institution.id,
        classroomId,
        studentId,
        missionId: mission.id,
      }),
    ),
  );
  const workById = new Map(works.map((work) => [work.missionId, work]));

  return pickActiveMissionId(
    availableMissions.map((mission) => mission.id),
    (id) => workById.get(id) ?? emptyStudentWork(id),
  );
}

/**
 * Layout do bloco PLATAFORMA IAH (sistema de ensino).
 *
 * Monta o App Shell (sidebar + header) e ativa o tema Premium Dark via
 * wrapper `.dark`. A barreira de autenticação vive no middleware
 * (src/middleware.ts). Desde a M15 (Institutional Workspace), o
 * contexto pedagógico do usuário autenticado (papel, nome, Instituição,
 * Ano Letivo) é carregado aqui e acompanha toda a navegação — sidebar
 * por papel, identidade real no rodapé, instituição no header.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getWorkspaceContext();
  const activeMissionId = await resolveStudentActiveMissionId(context);

  return (
    <div className="dark bg-background text-foreground font-sans">
      <SidebarProvider>
        <AppSidebar
          role={context?.role ?? null}
          userName={context?.user.name ?? null}
          roleLabel={context ? ROLE_LABEL[context.role] : null}
          activeMissionId={activeMissionId}
        />
        <SidebarInset>
          <AppHeader
            actions={<SessionControls />}
            badgeLabel={
              context
                ? `${context.institution.name} · ${context.schoolYear.label}`
                : undefined
            }
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
