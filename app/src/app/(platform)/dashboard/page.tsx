import {
  ArrowRight,
  FileSearch,
  NotebookPen,
  Radar,
  Sparkles,
} from "lucide-react";

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
 * Dados estáticos — apenas para visualização da experiência.
 * Nenhum dado real; nenhuma funcionalidade implementada.
 */
const radarSignals = [
  "Uma IA venceu um concurso de fotografia — e ninguém percebeu a tempo.",
  "Escolas dos EUA discutem proibir detectores de texto gerado por IA.",
  "Chatbot inventou jurisprudência e advogado foi punido por citá-la.",
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Continue sua Missão */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-32 size-64 rounded-full bg-chart-2/10 blur-3xl" />

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/15 text-primary">
            Missão 04 · investigação em andamento
          </Badge>
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
          A Fábrica de Notícias
        </h1>
        <p className="mt-2 max-w-2xl text-base italic text-chart-2 md:text-lg">
          &ldquo;Se uma máquina escreve a notícia, quem responde pela
          verdade?&rdquo;
        </p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Você deixou esta investigação na etapa de auditoria das manchetes.
          Três fontes ainda não foram verificadas.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button>
            Retomar investigação
            <ArrowRight className="size-4" />
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary to-chart-2" />
            </div>
            <span>Etapa 2 de 5</span>
          </div>
        </div>
      </section>

      {/* Mesa de investigação */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Radar IA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="relative flex size-7 items-center justify-center rounded-md bg-chart-2/15 text-chart-2">
                <Radar className="size-4" />
              </span>
              Radar IA
            </CardTitle>
            <CardDescription>
              Sinais captados no mundo real. Algum merece uma auditoria?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {radarSignals.map((signal) => (
                <li key={signal} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 animate-pulse rounded-full bg-chart-2" />
                  <span className="text-muted-foreground">{signal}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Caso da Semana */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
                <FileSearch className="size-4" />
              </span>
              Caso da Semana
            </CardTitle>
            <CardDescription>Caso aberto · aguardando auditores</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm font-medium">
              O trabalho premiado da feira de ciências foi escrito por IA?
            </p>
            <p className="text-sm text-muted-foreground">
              Há evidências nos dois sentidos. Examine os indícios e chegue ao
              seu veredito.
            </p>
            <div>
              <Button variant="outline" size="sm">
                <Sparkles className="size-4" />
                Abrir o caso
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Diário do Auditor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-md bg-chart-3/15 text-chart-3">
                <NotebookPen className="size-4" />
              </span>
              Diário do Auditor
            </CardTitle>
            <CardDescription>Sua última anotação de campo</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm italic text-muted-foreground">
              &ldquo;Percebi que a IA também erra — e que meu papel é
              justamente perceber quando isso acontece.&rdquo;
            </p>
            <div>
              <Button variant="ghost" size="sm" className="text-chart-3">
                Registrar nova reflexão
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
