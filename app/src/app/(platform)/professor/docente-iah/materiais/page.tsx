import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

import { getDefaultDocentiahRepositories, type GeneratedMaterial } from "@/modules/docentiah";
import { getWorkspaceContext } from "@/modules/workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "DocentIAH · Meus materiais",
  description: "Materiais gerados e salvos pelo professor.",
};

const TYPE_LABEL: Record<GeneratedMaterial["type"], string> = {
  slides: "Apresentação de slides",
};

/** Lista os materiais salvos pelo professor — destino de "Salvar em Meus materiais" no resultado do wizard. */
export default async function MeusMateriaisPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace || !workspace.user.teacherId) return null;

  const repositories = getDefaultDocentiahRepositories();
  const materials = await repositories.materials.listByTeacher(workspace.institution.id, workspace.user.teacherId);
  const saved = materials.filter((material) => material.status === "saved");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/professor/docente-iah"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        DocentIAH
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">DocentIAH</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Meus materiais</h1>
        <p className="text-sm text-muted-foreground">Materiais gerados e salvos neste dispositivo institucional.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" aria-hidden />
            Materiais salvos
          </CardTitle>
          <CardDescription>{saved.length === 1 ? "1 material salvo" : `${saved.length} materiais salvos`}.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {saved.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum material salvo ainda. Gere uma apresentação em{" "}
              <Link href="/professor/docente-iah/apresentacao-slides" className="text-primary underline-offset-4 hover:underline">
                Apresentação de slides
              </Link>{" "}
              e salve em Meus materiais.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {saved.map((material) => (
                <li key={material.id}>
                  <Link
                    href={`/professor/docente-iah/materiais/${material.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:px-6"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{material.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(material.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-muted-foreground">
                      {TYPE_LABEL[material.type]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
