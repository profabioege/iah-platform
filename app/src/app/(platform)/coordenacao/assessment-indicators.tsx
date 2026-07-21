import { BarChart3, CheckCircle2, ClipboardCheck, Clock3, Send, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface DiagnosticIndicators {
  publishedActivities: number;
  participants: number;
  received: number;
  awaitingValidation: number;
  releasedResults: number;
  averageScore: number | null;
  questionPerformance: Array<{ label: string; percentage: number; responses: number }>;
}

export function AssessmentIndicators({ indicators }: { indicators: DiagnosticIndicators }) {
  const metrics = [
    ["Atividades publicadas", indicators.publishedActivities, ClipboardCheck],
    ["Alunos participantes", indicators.participants, Users],
    ["Entregas recebidas", indicators.received, Send],
    ["Aguardando validação", indicators.awaitingValidation, Clock3],
    ["Resultados liberados", indicators.releasedResults, CheckCircle2],
  ] as const;
  return <section className="mx-auto mt-6 w-full max-w-6xl space-y-4" aria-labelledby="diagnostic-title"><Card><CardHeader><CardTitle id="diagnostic-title" className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /> Indicadores da sondagem diagnóstica</CardTitle><CardDescription>Dados reais das atividades, entregas e correções da instituição.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label, value, Icon]) => <div key={label} className="rounded-lg border border-border p-3"><Icon className="mb-2 size-4 text-primary" /><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div><div className="rounded-lg border border-border p-4"><p className="text-sm font-medium">Média diagnóstica</p><p className="mt-1 text-3xl font-semibold">{indicators.averageScore === null ? "—" : indicators.averageScore.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p><p className="text-xs text-muted-foreground">Somente resultados validados; nenhum valor é estimado.</p></div><div><p className="mb-3 text-sm font-medium">Desempenho por questão</p><div className="space-y-3">{indicators.questionPerformance.map((item) => <div key={item.label}><div className="mb-1 flex justify-between gap-3 text-xs"><span>{item.label}</span><span>{item.percentage}% · {item.responses} resposta(s)</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${item.percentage}%` }} /></div></div>)}{indicators.questionPerformance.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há resultados validados para calcular desempenho.</p> : null}</div></div></CardContent></Card></section>;
}
