import type { Metadata } from "next";

import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth-flags";
import { getWorkspaceUser } from "@/modules/workspace";

import { LessonList } from "./lesson-list";

export const metadata: Metadata = {
  title: "Minhas Aulas",
  description: "Monte aulas completas com o Montador Inteligente de Aula do IAH.",
};

/**
 * Intelligent Lesson Composer — listagem de Lessons (Sprint M13, evolução
 * do Lesson Builder MVP de M12; docs/CHANGELOG.md). O autor vem da sessão
 * real quando a autenticação está ativa; no modo demonstração, um rótulo
 * honesto de professor(a) (mesmo padrão do Estúdio de Missões).
 */
export default async function AulasPage() {
  const author = await resolveAuthor();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Montador Inteligente de Aula
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Minhas Aulas
        </h1>
        <p className="text-sm text-muted-foreground">
          O Método IAH monta o Pacote Pedagógico com você — Planejamento,
          Currículo, Metodologia, Recursos, Fluxo da Missão e Avaliação, com
          sugestões automáticas em cada etapa — salva neste dispositivo.
        </p>
      </header>

      <LessonList author={author} />
    </div>
  );
}

async function resolveAuthor(): Promise<string> {
  if (isAuthConfigured()) {
    const session = await auth();
    if (session?.user?.name) return session.user.name;
    if (session?.user?.email) return session.user.email;
  } else {
    const user = await getWorkspaceUser();
    if (user) return user.name;
  }
  return "Professor(a) de demonstração";
}
