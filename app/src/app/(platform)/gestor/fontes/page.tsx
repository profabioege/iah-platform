import type { Metadata } from "next";

import { verifySourceAction } from "@/components/question-bank/editorial/actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import { SOURCE_KIND_LABEL } from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

export const metadata: Metadata = {
  title: "Fontes e direitos",
  description: "Verificação dos direitos de uso das fontes do banco de questões.",
};

/**
 * Fontes do banco de questões da instituição (D-049/D-052). Só a gestão
 * verifica direitos (policy da 0017); sem fonte verificada, nenhuma
 * questão dela é aprovada. Para `licenciado`, o banco exige evidência.
 */
export default async function SourcesPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  if (requirePlatformDataMode() !== "supabase") {
    return <p className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">Disponível apenas na instalação com banco real.</p>;
  }
  const { actor, editorial } = await getQuestionBankContext();
  if (actor.role !== "administrador") return null;
  const { aviso } = await searchParams;
  const sources = await editorial.sources();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Banco de questões</p>
        <h1 className="text-2xl font-semibold">Fontes e direitos de uso</h1>
        <p className="text-sm text-muted-foreground">
          Verifique cada fonte uma vez. Questões de fonte sem direitos verificados não podem ser aprovadas.
        </p>
      </header>
      {aviso ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{aviso}</p>
      ) : null}
      {sources.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma fonte cadastrada.</p> : null}
      {sources.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{s.title}</CardTitle>
              <Badge variant="outline">{SOURCE_KIND_LABEL[s.kind]}</Badge>
              <Badge variant={s.rightsStatus === "verificado" ? "default" : "secondary"}>{s.rightsStatus}</Badge>
            </div>
            <CardDescription>
              Titular: {s.rightsHolder} · Licença/uso: {s.license}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p><span className="text-muted-foreground">Evidência registrada:</span> {s.evidence ?? "nenhuma"}</p>
            {s.rightsStatus !== "verificado" ? (
              <form action={verifySourceAction} className="flex flex-col gap-2">
                <input type="hidden" name="sourceId" value={s.id} />
                <label className="flex flex-col gap-1">
                  Evidência (contrato, termo de cessão, declaração de autoria — onde está o documento)
                  <textarea name="evidence" rows={2} defaultValue={s.evidence ?? ""} className="rounded-md border border-input bg-background px-3 py-2" />
                </label>
                <div>
                  <button type="submit" className={cn(buttonVariants())}>Verificar direitos desta fonte</button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
