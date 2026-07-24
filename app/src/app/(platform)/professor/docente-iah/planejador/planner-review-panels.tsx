"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CLASS_PROFILE_TAGS,
  type CurriculumSkillSuggestion,
  type IahConnectionSuggestion,
  type LessonPlanningBrief,
} from "@/modules/docentiah";

import { fetchCurriculumContextAction } from "./actions";

/**
 * Etapa "curriculum_review" — perfil da turma, depois habilidades
 * curriculares + Conexões IAH. Duas sub-etapas visíveis uma de cada
 * vez (carga cognitiva: uma ação principal por vez), nunca todos os
 * seletores simultâneos.
 */
export function CurriculumReviewStep({
  brief,
  onBriefChange,
  onContinue,
}: {
  brief: LessonPlanningBrief;
  onBriefChange: (brief: LessonPlanningBrief) => void;
  onContinue: () => void;
}) {
  const [subStep, setSubStep] = React.useState<"profile" | "curriculum">("profile");

  return (
    <div className="flex flex-col gap-4">
      {subStep === "profile" ? (
        <ClassProfileStep
          brief={brief}
          onBriefChange={onBriefChange}
          onContinue={() => setSubStep("curriculum")}
        />
      ) : (
        <CurriculumSuggestionsStep brief={brief} onBriefChange={onBriefChange} onContinue={onContinue} />
      )}
    </div>
  );
}

function ClassProfileStep({
  brief,
  onBriefChange,
  onContinue,
}: {
  brief: LessonPlanningBrief;
  onBriefChange: (brief: LessonPlanningBrief) => void;
  onContinue: () => void;
}) {
  const [customText, setCustomText] = React.useState("");

  function toggleTag(tagId: string) {
    const current = brief.classProfile;
    const next = current.includes(tagId) ? current.filter((t) => t !== tagId) : [...current, tagId];
    onBriefChange({ ...brief, classProfile: next });
  }

  function addCustom() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onBriefChange({ ...brief, classProfile: [...brief.classProfile, trimmed] });
    setCustomText("");
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <p className="text-sm font-medium text-foreground">Como é essa turma?</p>
        <p className="text-xs text-muted-foreground">Opcional — usamos só para ajustar linguagem, exemplos e duração. Nunca pedimos diagnóstico ou laudo.</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Perfil da turma">
          {CLASS_PROFILE_TAGS.map((tag) => {
            const selected = brief.classProfile.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTag(tag.id)}
                className={
                  selected
                    ? "rounded-full border border-primary bg-primary/15 px-3 py-1 text-xs text-primary"
                    : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                }
              >
                {tag.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
            placeholder="Outro — descreva em texto livre"
            className="flex-1 rounded-lg border border-input bg-background p-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            aria-label="Outro perfil de turma, em texto livre"
          />
          <Button type="button" size="sm" variant="outline" onClick={addCustom} disabled={!customText.trim()}>
            Adicionar
          </Button>
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={onContinue}>
            Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CurriculumSuggestionsStep({
  brief,
  onBriefChange,
  onContinue,
}: {
  brief: LessonPlanningBrief;
  onBriefChange: (brief: LessonPlanningBrief) => void;
  onContinue: () => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [skills, setSkills] = React.useState<CurriculumSkillSuggestion[]>([]);
  const [honestMessage, setHonestMessage] = React.useState<string | null>(null);
  const [connections, setConnections] = React.useState<IahConnectionSuggestion[]>([]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCurriculumContextAction(brief).then((result) => {
      if (!active) return;
      setLoading(false);
      if ("error" in result) {
        setHonestMessage(result.error);
        return;
      }
      setSkills(result.skills);
      setHonestMessage(result.skillsHonestMessage);
      setConnections(result.connections);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só busca uma vez ao entrar nesta etapa, com o brief já confirmado
  }, []);

  function toggleSkill(skill: CurriculumSkillSuggestion) {
    const isSelected = brief.selectedCurriculumSkills.some((s) => s.id === skill.id);
    const next = isSelected
      ? brief.selectedCurriculumSkills.filter((s) => s.id !== skill.id)
      : [...brief.selectedCurriculumSkills, skill];
    onBriefChange({ ...brief, selectedCurriculumSkills: next });
  }

  function chooseConnection(connection: IahConnectionSuggestion | undefined) {
    onBriefChange({ ...brief, iahConnection: connection });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">Buscando habilidades curriculares e conexões IAH…</CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-2 py-4">
          <p className="text-sm font-medium text-foreground">Habilidades curriculares sugeridas</p>
          {skills.length === 0 ? (
            <p className="text-xs text-muted-foreground">{honestMessage}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {skills.map((skill) => {
                const selected = brief.selectedCurriculumSkills.some((s) => s.id === skill.id);
                return (
                  <li key={skill.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleSkill(skill)}
                      className={
                        (selected ? "border-primary bg-primary/10 " : "border-border ") +
                        "w-full rounded-lg border p-2 text-left text-xs"
                      }
                    >
                      <p className="text-foreground">{skill.description}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {skill.document}
                        {skill.version ? ` · v${skill.version}` : ""} · {skill.matchReason}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {connections.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-sm font-medium text-foreground">Conexões IAH</p>
            <ul className="flex flex-col gap-2">
              {connections.map((connection) => {
                const selected = brief.iahConnection?.id === connection.id;
                return (
                  <li key={connection.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => chooseConnection(selected ? undefined : connection)}
                      className={
                        (selected ? "border-primary bg-primary/10 " : "border-border ") +
                        "w-full rounded-lg border p-2 text-left text-xs"
                      }
                    >
                      <p className="text-foreground">{connection.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{connection.rationale}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onContinue}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
