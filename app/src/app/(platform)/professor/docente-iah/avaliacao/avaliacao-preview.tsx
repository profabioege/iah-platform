import {
  Accessibility,
  BookOpen,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Layers,
  Printer,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { AvaliacaoDraft } from "./types";

/**
 * Pré-visualização estrutural do wizard de Avaliação (D-045) — mostra o
 * que foi especificado e o que a geração vai preparar, sem gerar nada:
 * nenhuma chamada de IA nesta etapa.
 */
export function AvaliacaoPreview({ draft }: { draft: AvaliacaoDraft }) {
  return (
    <div className="flex flex-col gap-4">
      <PreviewSection icon={Layers} label="Sobre a avaliação">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <PreviewField label="Disciplina" value={draft.disciplina || "Não definida"} />
          <PreviewField label="Ano/série" value={draft.anoSerie || "Não definido"} />
          <PreviewField label="Tema" value={draft.tema || "Não definido"} />
          <PreviewField
            label="Questões"
            value={draft.quantidadeQuestoes ? String(draft.quantidadeQuestoes) : "Não definido"}
          />
        </dl>
      </PreviewSection>

      <PreviewSection icon={ClipboardCheck} label="Formato e critérios">
        <div className="flex flex-col gap-2">
          {draft.tiposQuestao.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {draft.tiposQuestao.map((tipo) => (
                <Badge key={tipo} variant="outline" className="font-normal">
                  {tipo}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum tipo de questão selecionado.</p>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <PreviewField label="Dificuldade" value={draft.dificuldade ?? "Não definida"} />
            <PreviewField
              label="Valor total"
              value={draft.valorTotal ? `${draft.valorTotal} pontos` : "Não definido"}
            />
          </dl>
        </div>
      </PreviewSection>

      {hasOptionalDetails(draft) ? (
        <PreviewSection icon={FileText} label="Detalhes opcionais">
          <div className="flex flex-col gap-2 text-sm text-foreground/90">
            {draft.objetivosAprendizagem.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Objetivos: </span>
                {draft.objetivosAprendizagem.join(" · ")}
              </p>
            ) : null}
            {draft.duracaoPrevistaMinutos ? (
              <p>
                <span className="text-muted-foreground">Duração prevista: </span>
                {draft.duracaoPrevistaMinutos} minutos
              </p>
            ) : null}
            {draft.contextoTurma ? (
              <p>
                <span className="text-muted-foreground">Contexto da turma: </span>
                {draft.contextoTurma}
              </p>
            ) : null}
            {draft.instrucoesAdicionais ? (
              <p>
                <span className="text-muted-foreground">Instruções adicionais: </span>
                {draft.instrucoesAdicionais}
              </p>
            ) : null}
            {draft.competenciasHabilidades.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Competências/habilidades: </span>
                {draft.competenciasHabilidades.join(" · ")}
              </p>
            ) : null}
            {draft.materiaisReferencia.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Materiais de referência: </span>
                {draft.materiaisReferencia.join(" · ")}
              </p>
            ) : null}
          </div>
        </PreviewSection>
      ) : null}

      {draft.adaptacaoNeurodivergente ? (
        <PreviewSection icon={Accessibility} label="Adaptação pedagógica">
          <div className="flex flex-col gap-2">
            {draft.adaptacoesSelecionadas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {draft.adaptacoesSelecionadas.map((item) => (
                  <Badge key={item} variant="outline" className="font-normal">
                    {item}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma opção específica marcada.</p>
            )}
            {draft.necessidadesEspecificas ? (
              <p className="text-sm text-foreground/90">{draft.necessidadesEspecificas}</p>
            ) : null}
          </div>
        </PreviewSection>
      ) : null}

      <PreviewSection icon={Sparkles} label="Saída prevista">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Geração automática ainda não conectada nesta etapa — quando estiver, a partir
            destes parâmetros o DocentIAH vai preparar:
          </p>
          <ul className="flex flex-col gap-1.5 text-sm text-foreground/90">
            <li className="flex items-center gap-2">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              Avaliação original
            </li>
            <li className="flex items-center gap-2">
              <FileCheck2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              Gabarito
            </li>
            <li className="flex items-center gap-2">
              <ClipboardCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              Critérios de correção
            </li>
            {draft.adaptacaoNeurodivergente ? (
              <li className="flex items-center gap-2">
                <Accessibility className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Versão adaptada, com as adaptações aplicadas identificadas
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <Printer className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              Versão pronta para impressão
            </li>
          </ul>
        </div>
      </PreviewSection>

      <Button size="lg" disabled className="w-fit">
        <BookOpen className="size-4" />
        Gerar avaliação — em breve
      </Button>
    </div>
  );
}

function hasOptionalDetails(draft: AvaliacaoDraft): boolean {
  return (
    draft.objetivosAprendizagem.length > 0 ||
    !!draft.duracaoPrevistaMinutos ||
    draft.contextoTurma !== "" ||
    draft.instrucoesAdicionais !== "" ||
    draft.competenciasHabilidades.length > 0 ||
    draft.materiaisReferencia.length > 0
  );
}

function PreviewSection({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof BookOpen;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground/90">{value}</dd>
    </div>
  );
}
