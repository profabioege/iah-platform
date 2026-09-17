import type { Mission } from "../../library/domain/mission.ts";
import type { StudioMission } from "../domain/studio-mission.ts";

/**
 * Missão do Estúdio semeada no modo demonstração.
 *
 * Não é um conteúdo novo: é a mesma Missão 01 que o aluno percorre
 * (`content/missions/01-a-fabrica-de-noticias.ts`), projetada para o modelo
 * do Estúdio. Id e datas são fixos, então a semente é determinística e
 * idempotente — o Estúdio abre com a Missão 01 publicada sem que ninguém a
 * crie ao vivo. Só a tela do Estúdio decide entregá-la, e apenas no modo
 * `demo` (ver `professor/estudio/page.tsx`).
 */
export const DEMO_STUDIO_MISSION_ID = "studio-01-a-fabrica-de-noticias";

export function buildDemoStudioMission(
  mission: Mission,
  context: { author: string; schoolYear: string },
): StudioMission {
  return {
    id: DEMO_STUDIO_MISSION_ID,
    lineageId: `lineage-${mission.id}`,
    version: 1,
    status: "published",
    title: mission.title,
    description: mission.context,
    schoolYear: context.schoolYear,
    subject: "Inteligência Artificial & Humanidades",
    workloadHours: null,
    difficulty: "introdutorio",
    estimatedMinutes: null,
    guidingQuestion: mission.guidingQuestion,
    objectives: [mission.objective],
    competencies: [...mission.competencies],
    caseStudies: [],
    challenge: mission.challenge,
    expectedProduction: mission.studentProduction,
    reflectionPrompt: mission.reflection,
    rubric: "",
    evaluationCriteria: [],
    supportMaterials: [],
    links: [],
    files: [],
    bibliography: [],
    author: context.author,
    createdAt: mission.createdAt.toISOString(),
    updatedAt: mission.updatedAt.toISOString(),
  };
}
