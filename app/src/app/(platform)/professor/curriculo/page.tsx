import type { Metadata } from "next";

import { getDefaultCurriculumRepositories, type CurriculumTheme } from "@/modules/curriculum";
import { getDefaultRepositories } from "@/modules/platform";
import { localMissionRepository } from "@/modules/library";
import { getDefaultKnowledgeRepositories } from "@/modules/knowledge";

import { CurriculumExplorer } from "./curriculum-explorer";

export const metadata: Metadata = {
  title: "Currículo",
  description: "Navegue pelo Planejamento Anual do IAH: unidades, temas, aulas e missões.",
};

/**
 * Curriculum Engine — navegação curricular (Sprint M14,
 * docs/CHANGELOG.md). Disciplina → Ano Letivo (`modules/platform`) →
 * Unidades → Temas → Lessons (`modules/lesson`) → Mission Flow
 * (`modules/library`). Estrutura vem pronta do servidor; a Timeline
 * (que depende de Lessons salvas no dispositivo) é montada no cliente.
 */
export default async function CurriculoPage() {
  const curriculumRepositories = getDefaultCurriculumRepositories();
  const disciplines = await curriculumRepositories.disciplines.list();
  const discipline = disciplines[0] ?? null;

  const units = discipline
    ? await curriculumRepositories.units.listByDiscipline(discipline.id)
    : [];

  const themesByUnit: Record<string, CurriculumTheme[]> = {};
  for (const unit of units) {
    themesByUnit[unit.id] = await curriculumRepositories.themes.listByUnit(unit.id);
  }

  // Instituição resolvida da fonte de dados, nunca fixa em código (M16).
  const platformRepositories = getDefaultRepositories();
  const institutionId = (await platformRepositories.institutions.list())[0]?.id;
  const academicYears = institutionId
    ? await platformRepositories.academicYears.listByInstitution(institutionId)
    : [];
  const missions = await localMissionRepository.list();
  const knowledgeDocuments = await getDefaultKnowledgeRepositories().documents.list();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Currículo Vivo
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Currículo
        </h1>
        <p className="text-sm text-muted-foreground">
          {discipline?.name ?? "Disciplina"} · Ano Letivo {academicYears[0]?.label ?? "—"}
        </p>
      </header>

      <CurriculumExplorer
        units={units}
        themesByUnit={themesByUnit}
        missions={missions}
        knowledgeDocuments={knowledgeDocuments}
      />
    </div>
  );
}
