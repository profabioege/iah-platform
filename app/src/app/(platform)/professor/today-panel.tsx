import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { ASSESSMENT_LIFECYCLE_STATUS_LABEL } from "@/modules/assessment";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { isSameDay, type AssignmentView } from "./assignment-view";

/**
 * "Hoje no IAH" — o que precisa da atenção do professor hoje, a partir
 * de dados reais das Sondagens (`modules/assessment`). Aulas e Missões
 * ainda não têm agenda/data própria no domínio (D-016: nenhum campo
 * fake criado só para preencher este bloco).
 */
export function TodayPanel({ assignmentViews }: { assignmentViews: AssignmentView[] }) {
  const now = new Date();
  const today = assignmentViews.filter(
    (view) => isSameDay(view.startsAt, now) || isSameDay(view.endsAt, now),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4" aria-hidden />
          Hoje no IAH
        </CardTitle>
        <CardDescription>Prazos e sondagens do dia.</CardDescription>
      </CardHeader>
      <CardContent>
        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada previsto para hoje.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {today.map((view) => (
              <li key={view.id}>
                <Link
                  href="/professor/avaliacoes"
                  className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-border"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{view.assessmentTitle}</span>
                    <span className="text-xs text-muted-foreground">
                      {view.classroomName} ·{" "}
                      {isSameDay(view.endsAt, now) ? "encerra hoje" : "começa hoje"}
                    </span>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-muted-foreground">
                    {ASSESSMENT_LIFECYCLE_STATUS_LABEL[view.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
