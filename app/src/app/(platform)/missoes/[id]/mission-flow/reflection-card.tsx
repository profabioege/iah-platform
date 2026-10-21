import type * as React from "react";
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

import { canReopenReflection } from "./flow-state";
import type { WorkSaveStatus } from "./use-student-work";

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
  saveStatus,
  saveStatusLabel,
  recording,
  reopening,
  transitionError,
  recorded,
  delivered,
  reviewed = false,
  recordedAt,
  onRecord,
  onReopen,
}: {
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Estado do salvamento automático do texto (só confirmado pelo servidor). */
  saveStatus: WorkSaveStatus;
  saveStatusLabel: string;
  /** Registro/reabertura enviados e ainda sem confirmação do servidor. */
  recording: boolean;
  reopening: boolean;
  /** Mensagem de falha do registro/reabertura (nada mudou no servidor). */
  transitionError: React.ReactNode;
  recorded: boolean;
  delivered: boolean;
  /**
   * Avaliação registrada: o servidor recusa reabrir a reflexão
   * (`setReflectionRecorded`, "Entrega já avaliada"), então o botão some.
   */
  reviewed?: boolean;
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
          readOnly={recorded || recording}
          rows={5}
          placeholder="Registre aqui a sua reflexão pessoal sobre esta investigação…"
          className="w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:opacity-80"
          aria-label="Texto da reflexão no Diário do Auditor"
        />
        <div className="flex flex-wrap items-center gap-3">
          {recorded ? (
            // Avaliada: o servidor recusa reabrir — a interface não oferece.
            canReopenReflection({ recorded, reviewed }) ? (
              <Button variant="outline" size="sm" onClick={onReopen} disabled={reopening}>
                <Undo2 className="size-4" />
                {reopening ? "Reabrindo…" : "Reabrir para editar"}
              </Button>
            ) : null
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRecord}
              disabled={!delivered || value.trim().length === 0 || recording}
            >
              <CheckCircle2 className="size-4" />
              {recording ? "Registrando…" : "Registrar reflexão"}
            </Button>
          )}
          <span
            role="status"
            aria-live="polite"
            className={`text-xs ${!recorded && delivered && saveStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {recorded && reviewed
              ? "Avaliação concluída — reflexão preservada; não pode mais ser reaberta."
              : recorded
              ? "Sua reflexão fica guardada no Diário do Auditor."
              : delivered
                ? saveStatusLabel
                : "Entregue sua produção antes de registrar a reflexão."}
          </span>
        </div>
        {transitionError}
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}
