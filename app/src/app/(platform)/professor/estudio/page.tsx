import type { Metadata } from "next";

import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth-flags";
import { getWorkspaceUser } from "@/modules/workspace";

import { MissionLibrary } from "./mission-library";

export const metadata: Metadata = {
  title: "Estúdio de Missões",
  description: "Crie, edite, versione e publique Missões do IAH.",
};

/**
 * Mission Studio — biblioteca de Missões (docs/MISSION_STUDIO.md).
 * O autor vem da sessão real quando a autenticação está ativa; no modo
 * demonstração, um rótulo honesto de professor(a).
 */
export default async function EstudioPage() {
  const author = await resolveAuthor();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Estúdio de Missões
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Biblioteca de Missões
        </h1>
        <p className="text-sm text-muted-foreground">
          Crie, edite, versione e publique as Missões da sua disciplina.
        </p>
      </header>

      <MissionLibrary author={author} />
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
