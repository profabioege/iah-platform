import type { KnowledgeReference, KnowledgeSourceType, ValidationStatus } from "@/modules/conexoes-iah";
import { Badge } from "@/components/ui/badge";

/**
 * Rótulo e estilo por tipo de fonte — nunca visualmente igual a uma
 * referência oficial. Currículo oficial/institucional em destaque
 * neutro; conexão curada pelo IAH marcada como autoral, não oficial.
 */
const SOURCE_TYPE_LABEL: Record<KnowledgeSourceType, string> = {
  official_curriculum: "Currículo oficial",
  institutional_curriculum: "Currículo institucional",
  conceptual_reference: "Referência conceitual",
  iah_curated_connection: "Conexão autoral do IAH",
  teacher_material: "Material do professor",
  uploaded_document: "Documento anexado",
  web_source: "Fonte da web",
};

const SOURCE_TYPE_CLASSNAME: Record<KnowledgeSourceType, string> = {
  official_curriculum: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  institutional_curriculum: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  conceptual_reference: "border-border text-muted-foreground",
  iah_curated_connection: "border-primary/40 bg-primary/10 text-primary",
  teacher_material: "border-border text-muted-foreground",
  uploaded_document: "border-border text-muted-foreground",
  web_source: "border-border text-muted-foreground",
};

const VALIDATION_STATUS_LABEL: Record<ValidationStatus, string> = {
  validated: "Validada",
  in_review: "Em revisão",
  draft: "Rascunho",
};

/** Lista de referências completa (Etapa 4): título, organização, tipo da fonte, versão, seção, trecho e situação de validação. */
export function ReferenceList({ references }: { references: KnowledgeReference[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-3">
      {references.map((reference) => (
        <li key={reference.id} className="flex flex-col gap-1 border-t border-border pt-2 text-xs first:border-t-0 first:pt-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-foreground/90">{reference.title}</span>
            <Badge variant="outline" className={`font-normal ${SOURCE_TYPE_CLASSNAME[reference.sourceType]}`}>
              {SOURCE_TYPE_LABEL[reference.sourceType]}
            </Badge>
          </div>
          <span className="text-muted-foreground">
            {reference.organization} · v. {reference.version} · {reference.section} · {VALIDATION_STATUS_LABEL[reference.validationStatus]}
          </span>
          {reference.excerpt ? (
            <p className="text-muted-foreground/90 italic">&ldquo;{reference.excerpt}&rdquo;</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
