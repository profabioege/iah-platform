import { CheckCircle2, NotebookPen, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Cartão de reflexão do Diário do Auditor — mesma regra de sempre
 * (só habilita depois da produção entregue; registro é definitivo até
 * "Reabrir para editar"), agora isolado como componente reutilizável.
 */
export function ReflectionCard({
  prompt,
  value,
  onChange,
  onBlur,
  recorded,
  delivered,
  recordedAt,
  onRecord,
  onReopen,
}: {
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  recorded: boolean;
  delivered: boolean;
  recordedAt: string | null;
  onRecord: () => void;
  onReopen: () => void;
}) {
  return (
    <Card className={recorded ? "border-chart-3/50" : undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex size-7 items-center justify-center rounded-md bg-chart-3/15 text-chart-3">
              <NotebookPen className="size-4" />
            </span>
            Reflexão no Diário do Auditor
          </CardTitle>
          {recorded ? (
            <Badge className="bg-chart-3/15 text-chart-3">
              <CheckCircle2 className="size-3" />
              Registrada em {formatDate(recordedAt)}
            </Badge>
          ) : null}
        </div>
        <CardDescription>{prompt}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          readOnly={recorded}
          rows={5}
          placeholder="Registre aqui a sua reflexão pessoal sobre esta investigação…"
          className="w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:opacity-80"
          aria-label="Texto da reflexão no Diário do Auditor"
        />
        <div className="flex flex-wrap items-center gap-3">
          {recorded ? (
            <Button variant="outline" size="sm" onClick={onReopen}>
              <Undo2 className="size-4" />
              Reabrir para editar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRecord}
              disabled={!delivered || value.trim().length === 0}
            >
              <CheckCircle2 className="size-4" />
              Registrar reflexão
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {recorded
              ? "Sua reflexão fica guardada no Diário do Auditor."
              : delivered
                ? "O texto é salvo automaticamente enquanto você escreve."
                : "Entregue sua produção antes de registrar a reflexão."}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}
