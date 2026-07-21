import { BookOpen, Clock, FileText, Layers, ScrollText, Sparkles } from "lucide-react";

import { LESSON_FORMAT_LABEL, type Lesson } from "@/modules/lesson";
import type { Mission } from "@/modules/library";
import type { KnowledgeDocument } from "@/modules/knowledge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
// Reaproveita o parser do Mission Flow para extrair Evidências e
// Critérios de Auditoria da Mission selecionada — mesma fonte que o
// aluno vê nas etapas "Investigação"/"Critérios" (Sprint M13: "usar
// exclusivamente componentes já implementados").
import { parseMissionContent } from "@/app/(platform)/missoes/[id]/mission-flow/parse-mission-content";
import { RubricCard } from "@/app/(platform)/missoes/[id]/mission-flow/rubric-card";

import { LessonSummary } from "../lesson-summary";

/**
 * Etapa 7 do Intelligent Lesson Composer — Preview do Pacote Pedagógico
 * completo: Objetivo, Competências, Tempo, Metodologia, Mission Flow,
 * Recursos, Avaliação, Critérios, Materiais, Portfólio. Tudo derivado
 * do que já foi escolhido/sugerido nas etapas anteriores — nenhum dado
 * novo criado aqui.
 */
export function LessonPreview({
  lesson,
  mission,
  knowledgeDocuments,
}: {
  lesson: Lesson;
  mission: Mission | null;
  knowledgeDocuments: KnowledgeDocument[];
}) {
  const parsed = mission ? parseMissionContent(mission.didacticMaterials) : null;
  const criteria = parsed?.auditCriteria ?? [];
  const evidenceCount = parsed?.evidences.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <LessonSummary lesson={lesson} />

      <PreviewSection icon={Layers} label="Objetivo">
        <p className="text-sm text-foreground/90">
          {lesson.objective || "Não definido"}
        </p>
      </PreviewSection>

      <PreviewSection icon={Sparkles} label="Metodologia">
        <p className="text-sm text-foreground/90">
          {lesson.format ? LESSON_FORMAT_LABEL[lesson.format] : "Não definida"}
        </p>
      </PreviewSection>

      <PreviewSection icon={BookOpen} label="Fluxo da Missão">
        {mission ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{mission.title}</p>
            <p className="text-sm text-muted-foreground">{mission.guidingQuestion}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum Fluxo da Missão selecionado.</p>
        )}
      </PreviewSection>

      <PreviewSection icon={FileText} label={`Recursos e Materiais (${knowledgeDocuments.length})`}>
        {knowledgeDocuments.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {knowledgeDocuments.map((doc) => (
              <li key={doc.id} className="text-sm text-foreground/90">
                {doc.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum material selecionado.</p>
        )}
      </PreviewSection>

      <PreviewSection icon={ScrollText} label="Avaliação — Critérios e Evidências">
        {criteria.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {evidenceCount} evidência{evidenceCount === 1 ? "" : "s"} no Dossiê da Missão selecionada.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {criteria.map((entry, i) => (
                <RubricCard key={entry.label} entry={entry} index={i} />
              ))}
            </div>
            {lesson.assessmentNotes ? (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground/90">
                {lesson.assessmentNotes}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecione um Fluxo da Missão para herdar a rubrica e os critérios dela.
          </p>
        )}
      </PreviewSection>

      <PreviewSection icon={Clock} label="Tempo previsto">
        <p className="text-sm text-foreground/90">
          {lesson.estimatedMinutes ? `${lesson.estimatedMinutes} minutos` : "Não definido"}
        </p>
      </PreviewSection>

      {lesson.bnccCompetencies.length > 0 || lesson.bnccComputacaoCompetencies.length > 0 ? (
        <PreviewSection icon={FileText} label="Competências avaliadas">
          <div className="flex flex-wrap gap-2">
            {lesson.bnccCompetencies.map((c) => (
              <Badge key={c} variant="outline">{c}</Badge>
            ))}
            {lesson.bnccComputacaoCompetencies.map((c) => (
              <Badge key={c} variant="outline">{c}</Badge>
            ))}
          </div>
        </PreviewSection>
      ) : null}

      <PreviewSection icon={FileText} label="Portfólio">
        <p className="text-sm text-muted-foreground">
          Ainda conceitual (D-028) — a produção desta Aula não é arquivada
          num Portfólio do aluno nesta Sprint.
        </p>
      </PreviewSection>
    </div>
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
