import Link from "next/link";
import { UsersRound } from "lucide-react";

import type { Classroom } from "@/modules/workspace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Turmas do professor, como ponto de partida para uma tarefa do DocentIAH. */
export function RelatedClassrooms({ classrooms }: { classrooms: Classroom[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="size-4" aria-hidden />
          Suas turmas
        </CardTitle>
        <CardDescription>Ponto de partida para qualquer tarefa acima.</CardDescription>
      </CardHeader>
      <CardContent>
        {classrooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {classrooms.map((classroom) => (
              <li key={classroom.id}>
                <Link
                  href="/professor/turmas"
                  className="rounded-full border border-border px-3 py-1 text-sm text-foreground/90 transition-colors hover:border-primary/50"
                >
                  {classroom.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
