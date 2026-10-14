import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { decodeEntities, type QueueRow, type QuestionVersionStatus } from "@/modules/question-bank";

export const STATUS_LABEL: Record<string, string> = {
  em_revisao: "Em revisão",
  devolvida: "Devolvidas",
  rascunho: "Rascunhos",
  aprovada: "Aprovadas",
};

/** Texto corrido para prévia: sem marcação, sem tabela, sem figura. */
export function plainPreview(stem: string, max = 180): string {
  const text = decodeEntities(
    stem
      .split("\n")
      .filter((l) => !/^\s*\|/.test(l))
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\{\{figura:\d+\}\}/g, "[figura]"),
  )
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function ClassificationBadge({ origin }: { origin: QueueRow["classification"] }) {
  if (origin !== "ia") return null;
  return (
    <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">
      habilidade proposta por IA
    </Badge>
  );
}

const SERIE_LABEL = { em1: "1ª série", em2: "2ª série", em3: "3ª série" } as const;

/** Monta o endereço da fila mantendo situação e filtros (D-055). */
function queueHref(
  base: string,
  p: { status: QuestionVersionStatus; serie: keyof typeof SERIE_LABEL | null; habilidade: string | null },
) {
  const q = new URLSearchParams({ status: p.status });
  if (p.serie) q.set("serie", p.serie);
  if (p.habilidade) q.set("habilidade", p.habilidade);
  return `${base}?${q.toString()}`;
}

export function ReviewQueue({
  rows,
  counts,
  status,
  base,
  serie = null,
  habilidade = null,
}: {
  rows: QueueRow[];
  counts: Record<string, number>;
  status: QuestionVersionStatus;
  base: string;
  serie?: keyof typeof SERIE_LABEL | null;
  habilidade?: string | null;
}) {
  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs",
      active ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-muted/60",
    );
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Série sugerida do item" className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Série sugerida:</span>
        <Link href={queueHref(base, { status, serie: null, habilidade })} className={chip(!serie)} aria-current={!serie ? "page" : undefined}>
          Todas
        </Link>
        {(Object.keys(SERIE_LABEL) as Array<keyof typeof SERIE_LABEL>).map((g) => (
          <Link
            key={g}
            href={queueHref(base, { status, serie: g, habilidade })}
            className={chip(serie === g)}
            aria-current={serie === g ? "page" : undefined}
          >
            {SERIE_LABEL[g]}
          </Link>
        ))}
        {habilidade ? (
          <Link href={queueHref(base, { status, serie, habilidade: null })} className={chip(true)}>
            Habilidade {habilidade} ✕
          </Link>
        ) : null}
      </nav>
      <nav aria-label="Situação" className="flex flex-wrap gap-2">
        {(["em_revisao", "devolvida", "rascunho", "aprovada"] as const).map((s) => (
          <Link
            key={s}
            href={queueHref(base, { status: s, serie, habilidade })}
            aria-current={s === status ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              s === status ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted/60",
            )}
          >
            {STATUS_LABEL[s]} · {counts[s] ?? 0}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada nesta situação.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.version.id}>
              <Link
                href={`${base}/${encodeURIComponent(row.version.id)}`}
                className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted/60"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">{row.code ?? row.version.id}</span>
                  <Badge variant="secondary" className="font-mono">{row.skill?.code ?? "sem habilidade"}</Badge>
                  {row.serie ? <Badge variant="outline">{SERIE_LABEL[row.serie]} (sugerida)</Badge> : null}
                  <ClassificationBadge origin={row.classification} />
                  {row.sourceRights !== "verificado" ? (
                    <Badge variant="outline">direitos {row.sourceRights ?? "?"}</Badge>
                  ) : null}
                  {row.mine ? <Badge variant="outline">você é o autor</Badge> : null}
                  <span className="text-xs text-muted-foreground">v{row.version.version}</span>
                </span>
                <span className="text-muted-foreground">{plainPreview(row.version.stem)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
