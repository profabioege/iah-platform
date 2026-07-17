import type { Metadata } from "next";

import { getClassroomService } from "@/modules/integrations/google-classroom";
import { getDefaultRepositories } from "@/modules/platform";

import { ImportWizard, type WizardCourse } from "./import-wizard";

export const metadata: Metadata = {
  title: "Importar turmas",
  description: "Importe turmas e alunos do Google Classroom para o IAH.",
};

/**
 * Importação de turmas do Google Classroom.
 *
 * O serviço vem de getClassroomService(): o real quando houver
 * credenciais OAuth, o simulado (rotulado) caso contrário. A página não
 * sabe qual dos dois recebeu — só repassa `isSimulated` para que a
 * interface seja honesta sobre a origem dos dados.
 */
export default async function ImportarPage() {
  const service = getClassroomService();
  const repositories = getDefaultRepositories();
  const institutions = await repositories.institutions.list();

  const courses: WizardCourse[] = await listCourses();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Importação
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Importar turmas do Google Classroom
        </h1>
        <p className="text-sm text-muted-foreground">
          Traga turmas e alunos que já existem no Google Classroom para o IAH,
          revisando tudo antes de confirmar.
        </p>
      </header>

      <ImportWizard
        institutions={institutions.map((i) => ({ id: i.id, name: i.name }))}
        courses={courses}
        googleConnected={!service.isSimulated && service.isConfigured}
        isSimulated={service.isSimulated}
      />
    </div>
  );

  async function listCourses(): Promise<WizardCourse[]> {
    // Falha de origem externa nunca quebra a página (degradação graciosa,
    // D-019): sem turmas, o wizard mostra a lista vazia.
    try {
      const googleCourses = await service.listCourses();
      return Promise.all(
        googleCourses
          .filter((course) => course.state === "ACTIVE")
          .map(async (course) => {
            const [students, assignments] = await Promise.all([
              service.listStudents(course.id),
              service.listAssignments(course.id),
            ]);
            return {
              externalId: course.id,
              name: course.section
                ? `${course.name} · ${course.section}`
                : course.name,
              students: students.map((s) => ({
                externalId: s.id,
                name: s.fullName,
                email: s.email,
              })),
              assignmentCount: assignments.length,
            };
          }),
      );
    } catch {
      return [];
    }
  }
}
