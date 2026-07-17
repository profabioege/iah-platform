import Link from "next/link";
import { Users } from "lucide-react";

import type { ClassroomSyncState } from "@/modules/platform";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ClassroomRow {
  id: string;
  name: string;
  /** Rótulo do Ano Letivo (ex.: "2026"). */
  academicYear: string;
  studentCount: number;
  sync: ClassroomSyncState | null;
}

const SYNC_LABEL: Record<ClassroomSyncState["status"], string> = {
  never_synced: "Nunca sincronizada",
  synced: "Sincronizada",
  out_of_date: "Desatualizada",
  failed: "Falha na sincronização",
};

/**
 * Seção "Turmas" do Painel do Professor.
 *
 * Turmas sem estado de sincronização são as de cadastro manual — o
 * rótulo diz exatamente isso, em vez de fingir uma sincronização que
 * nunca existiu.
 */
export function ClassroomsSection({
  classrooms,
}: {
  classrooms: ClassroomRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Turmas</CardTitle>
        <CardDescription>
          Turmas desta instituição no ano letivo corrente.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {classrooms.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma turma cadastrada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {classrooms.map((classroom) => (
              <li
                key={classroom.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6"
              >
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">{classroom.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {classroom.academicYear} ·{" "}
                    {classroom.studentCount === 1
                      ? "1 aluno"
                      : `${classroom.studentCount} alunos`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="size-3.5 text-muted-foreground" aria-hidden />
                  <Badge variant="outline" className="text-muted-foreground">
                    {classroom.sync
                      ? SYNC_LABEL[classroom.sync.status]
                      : "Cadastro manual"}
                  </Badge>
                </div>

                <span className="w-44 text-right text-xs text-muted-foreground">
                  {classroom.sync?.lastSyncAt
                    ? `Atualizada em ${formatDateTime(classroom.sync.lastSyncAt)}`
                    : "Sem sincronização externa"}
                </span>

                <Link
                  href="#acompanhamento"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "shrink-0",
                  )}
                >
                  Visualizar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
