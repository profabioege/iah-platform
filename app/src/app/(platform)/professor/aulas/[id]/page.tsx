import type { Metadata } from "next";

import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth-flags";
import { localMissionRepository } from "@/modules/library";
import { getDefaultKnowledgeRepositories } from "@/modules/knowledge";

import { LessonWizard } from "./lesson-wizard";

export const metadata: Metadata = {
  title: "Intelligent Lesson Composer",
  description: "Monte uma aula completa em 7 etapas, com sugestões automáticas.",
};

/**
 * Editor do Intelligent Lesson Composer — a Lesson é carregada no
 * cliente (localStorage, `use-lesson-builder.ts`); Missions e materiais
 * do Knowledge Engine vêm prontos do servidor (mesmas fontes já usadas
 * em `/missoes` e no futuro consumidor do Knowledge Engine).
 */
export default async function LessonBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const author = await resolveAuthor();
  const missions = await localMissionRepository.list();
  const knowledgeDocuments = await getDefaultKnowledgeRepositories().documents.list();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <LessonWizard
        lessonId={id}
        author={author}
        missions={missions}
        knowledgeDocuments={knowledgeDocuments}
      />
    </div>
  );
}

async function resolveAuthor(): Promise<string> {
  if (isAuthConfigured()) {
    const session = await auth();
    if (session?.user?.name) return session.user.name;
    if (session?.user?.email) return session.user.email;
  }
  return "Professor(a) de demonstração";
}
