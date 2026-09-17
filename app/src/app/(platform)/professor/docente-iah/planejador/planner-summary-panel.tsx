"use client";

import { ClipboardList } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EDUCATION_LEVEL_LABEL } from "@/modules/conexoes-iah";
import type { LessonPlanningBrief } from "@/modules/docentiah";

const MATERIAL_LABEL: Record<string, string> = {
  lesson_plan: "Plano da aula",
  slides: "Apresentação de slides",
  infographic: "Infográfico",
  mind_map: "Mapa mental",
};

function SummaryLines({ brief }: { brief: LessonPlanningBrief }) {
  const rows: Array<[string, string]> = [
    ["Disciplina", brief.subject ?? "—"],
    ["Turma", brief.educationLevel && brief.grade ? `${brief.grade} · ${EDUCATION_LEVEL_LABEL[brief.educationLevel]}` : "—"],
    ["Conteúdo", brief.topic ?? "—"],
    ["Objetivo", brief.teacherGoal ?? brief.specificConcept ?? "—"],
    ["Perfil da turma", brief.classProfile.length > 0 ? brief.classProfile.join(", ") : "—"],
    ["Habilidades", brief.selectedCurriculumSkills.length > 0 ? `${brief.selectedCurriculumSkills.length} selecionada(s)` : "—"],
    ["Conexão IAH", brief.iahConnection?.title ?? "—"],
    ["Material", brief.supportMaterialType ? MATERIAL_LABEL[brief.supportMaterialType] : "—"],
  ];
  return (
    <dl className="flex flex-col gap-2 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PlannerSummaryPanel({ brief, variant }: { brief: LessonPlanningBrief; variant: "desktop" | "mobile" }) {
  if (variant === "desktop") {
    return (
      <Card className="sticky top-4">
        <CardContent className="flex flex-col gap-3 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Resumo da aula</p>
          <SummaryLines brief={brief} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Sheet>
      <SheetTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        <ClipboardList className="size-3.5" aria-hidden />
        Resumo da aula
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Resumo da aula</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <SummaryLines brief={brief} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
