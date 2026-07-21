import Link from "next/link";
import { AlertCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { daysUntil, type AssignmentView } from "./assignment-view";

interface AttentionItem {
  key: string;
  label: string;
  detail: string;
}

/**
 * "Precisa da sua atenção" — pendências reais: entregas aguardando
 * devolutiva, sondagens sem publicação e prazos nos próximos 3 dias.
 * Mesma fonte de dados de `TodayPanel` (`modules/assessment`), sem
 * número inventado (D-016).
 */
export function AttentionPanel({ assignmentViews }: { assignmentViews: AssignmentView[] }) {
  const now = new Date();
  const items: AttentionItem[] = [];

  for (const view of assignmentViews) {
    if (view.pendingReviewCount > 0) {
      items.push({
        key: `${view.id}-review`,
        label: `${view.assessmentTitle} · ${view.classroomName}`,
        detail:
          view.pendingReviewCount === 1
            ? "1 entrega aguardando devolutiva"
            : `${view.pendingReviewCount} entregas aguardando devolutiva`,
      });
    }
    if (view.publicationStatus === "draft") {
      items.push({
        key: `${view.id}-draft`,
        label: `${view.assessmentTitle} · ${view.classroomName}`,
        detail: "Sem publicação",
      });
    }
    const remaining = daysUntil(view.endsAt, now);
    if (view.status === "open" && remaining >= 0 && remaining <= 3) {
      items.push({
        key: `${view.id}-deadline`,
        label: `${view.assessmentTitle} · ${view.classroomName}`,
        detail:
          remaining === 0
            ? "Prazo encerra hoje"
            : remaining === 1
              ? "Prazo encerra amanhã"
              : `Prazo encerra em ${remaining} dias`,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="size-4" aria-hidden />
          Precisa da sua atenção
        </CardTitle>
        <CardDescription>Entregas, validações e prazos próximos.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma pendência no momento.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href="/professor/avaliacoes"
                  className="flex flex-col rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-border"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
