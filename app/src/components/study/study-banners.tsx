import { AlertTriangle, Info } from "lucide-react";

/**
 * Avisos que acompanham TODA tela do diagnóstico e do plano (D-054): o
 * diagnóstico com questões demonstrativas não serve para decisões sobre
 * alunos reais, e o planejamento da escola ainda é provisório.
 */
export function DemonstrativeBanner({ demonstrative }: { demonstrative: boolean }) {
  if (!demonstrative) return null;
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-foreground"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
      <span>
        <strong>Diagnóstico demonstrativo.</strong> Usa questões sintéticas, pendentes de revisão docente. Serve para
        conhecer o fluxo — não use os resultados para decisões sobre alunos reais.
      </span>
    </p>
  );
}

export function ProvisionalPlanBanner({ provisional }: { provisional: boolean }) {
  if (!provisional) return null;
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
    >
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>
        O planejamento curricular usado aqui é <strong>provisório</strong> e será substituído pelo planejamento real
        da escola.
      </span>
    </p>
  );
}
