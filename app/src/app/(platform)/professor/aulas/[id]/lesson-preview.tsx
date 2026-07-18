import { BookOpen, Clock, FileText, ScrollText } from "lucide-react";

import type { Lesson } from "@/modules/lesson";
import type { Mission } from "@/modules/library";
import type { KnowledgeDocument } from "@/modules/knowledge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
// Reaproveita o parser do Mission Flow para extrair os Critérios de
// Auditoria da Mission selecionada — mesma fonte que o aluno vê na
// etapa "Critérios" (Sprint M12: "usar arquitetura já existente").
import { parseMissionContent } from "@/app/(platform)/missoes/[id]/mission-flow/parse-mission-content";
import { RubricCard } from "@/app/(platform)/missoes/[id]/mission-flow/rubric-card";

import { LessonSummary } from "../lesson-summary";

/**
 * Etapa 5 do LessonWizard — Preview: Plano da Aula, Mission, Materiais,
 * Critérios e Tempo previsto, tudo derivado do que já foi escolhido nas
 * etapas anteriores (nenhum dado novo criado aqui).
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
  const criteria = mission ? parseMissionContent(mission.didacticMaterials).auditCriteria : [];

  return (
    <div className="flex flex-col gap-4">
      <LessonSummary lesson={lesson} />

      <PreviewSection icon={BookOpen} label="Mission Flow">
        {mission ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{mission.title}</p>
            <p className="text-sm text-muted-foreground">{mission.guidingQuestion}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma Mission Flow selecionada.</p>
        )}
      </PreviewSection>

      <PreviewSection icon={FileText} label={`Materiais (${knowledgeDocuments.length})`}>
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

      <PreviewSection icon={ScrollText} label="Critérios">
        {criteria.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {criteria.map((entry, i) => (
              <RubricCard key={entry.label} entry={entry} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecione uma Mission Flow para herdar os critérios dela.
          </p>
        )}
      </PreviewSection>

      <PreviewSection icon={Clock} label="Tempo previsto">
        <p className="text-sm text-foreground/90">
          {lesson.estimatedMinutes ? `${lesson.estimatedMinutes} minutos` : "Não definido"}
        </p>
      </PreviewSection>

      {lesson.bnccCompetencies.length > 0 || lesson.bnccComputacaoCompetencies.length > 0 ? (
        <PreviewSection icon={FileText} label="Competências">
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
