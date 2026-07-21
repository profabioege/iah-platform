"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Reaproveita a navegação, o progresso e a moldura de etapa já
// construídos para o Montador de Aula/Mission Flow — mesmo padrão de
// wizard do produto, sem duplicar componente (mesmo espírito de D-013).
import { MissionNavigation } from "@/app/(platform)/missoes/[id]/mission-flow/mission-navigation";
import { ProgressIndicator } from "@/app/(platform)/missoes/[id]/mission-flow/progress-indicator";
import { LessonStep } from "../../aulas/[id]/lesson-step";

import { AvaliacaoPreview } from "./avaliacao-preview";
import {
  ADAPTATION_NOTICE,
  ADAPTATION_OPTIONS,
  ADAPTATION_RULES,
  createEmptyAvaliacaoDraft,
  DIFFICULTY_OPTIONS,
  GRADE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  type AvaliacaoDraft,
} from "./types";

const TOTAL_STEPS = 5;

/**
 * Wizard de Avaliação do DocentIAH (D-045) — especifica os parâmetros
 * de uma avaliação, incluindo adaptação pedagógica para alunos
 * neurodivergentes, sem gerar nada ainda: interface, estados,
 * navegação e pré-visualização estrutural, nenhuma IA conectada.
 */
export function AvaliacaoWizard({ defaultSubjectName }: { defaultSubjectName: string | null }) {
  const [draft, setDraft] = React.useState<AvaliacaoDraft>(() =>
    createEmptyAvaliacaoDraft(defaultSubjectName ?? ""),
  );
  const [step, setStep] = React.useState(1);
  const goTo = (next: number) => setStep(Math.min(TOTAL_STEPS, Math.max(1, next)));

  function update(partial: Partial<AvaliacaoDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  const step1Complete =
    draft.disciplina.trim() !== "" &&
    draft.anoSerie !== "" &&
    draft.tema.trim() !== "" &&
    !!draft.quantidadeQuestoes &&
    draft.quantidadeQuestoes > 0;

  const step2Complete =
    draft.tiposQuestao.length > 0 && !!draft.dificuldade && !!draft.valorTotal && draft.valorTotal > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <AvaliacaoHeader step={step} />

      {step === 1 && (
        <LessonStep
          eyebrow="Avaliação"
          title="Sobre a avaliação"
          description="A base para gerar a avaliação — disciplina, série, tema e quantidade de questões."
        >
          <div className="flex flex-col gap-4">
            <Field label="Disciplina">
              <Input
                value={draft.disciplina}
                onChange={(e) => update({ disciplina: e.target.value })}
                placeholder="ex.: Inteligência Artificial & Humanidades"
              />
            </Field>
            <Field label="Ano/série">
              <select
                value={draft.anoSerie}
                onChange={(e) => update({ anoSerie: e.target.value })}
                className={selectClassName}
              >
                <option value="">Selecione a série</option>
                {GRADE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Conteúdo ou tema">
              <Input
                value={draft.tema}
                onChange={(e) => update({ tema: e.target.value })}
                placeholder="ex.: Desinformação e verificação de fontes"
              />
            </Field>
            <Field label="Quantidade de questões">
              <Input
                type="number"
                min={1}
                value={draft.quantidadeQuestoes ?? ""}
                onChange={(e) =>
                  update({ quantidadeQuestoes: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="ex.: 10"
              />
            </Field>
          </div>
          <MissionNavigation onNext={() => goTo(2)} nextDisabled={!step1Complete} hideBack />
        </LessonStep>
      )}

      {step === 2 && (
        <LessonStep
          eyebrow="Avaliação"
          title="Formato e critérios"
          description="Como as questões serão formuladas e como a avaliação será pontuada."
        >
          <div className="flex flex-col gap-5">
            <MultiToggleField
              label="Tipos de questão"
              options={QUESTION_TYPE_OPTIONS}
              values={draft.tiposQuestao}
              onChange={(values) => update({ tiposQuestao: values })}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Nível de dificuldade</span>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map((option) => {
                  const isSelected = draft.dificuldade === option;
                  return (
                    <button key={option} type="button" onClick={() => update({ dificuldade: option })}>
                      <Badge
                        variant={isSelected ? undefined : "outline"}
                        className={
                          isSelected
                            ? "cursor-pointer bg-primary py-1.5 text-sm font-normal text-primary-foreground"
                            : "cursor-pointer py-1.5 text-sm font-normal"
                        }
                      >
                        {option}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Valor total (pontos)">
              <Input
                type="number"
                min={0}
                value={draft.valorTotal ?? ""}
                onChange={(e) => update({ valorTotal: e.target.value ? Number(e.target.value) : null })}
                placeholder="ex.: 10"
              />
            </Field>
          </div>
          <MissionNavigation onBack={() => goTo(1)} onNext={() => goTo(3)} nextDisabled={!step2Complete} />
        </LessonStep>
      )}

      {step === 3 && (
        <LessonStep
          eyebrow="Avaliação"
          title="Detalhes opcionais"
          description="Preencha o que for relevante — nenhum destes campos é obrigatório."
        >
          <div className="flex flex-col gap-4">
            <TagListField
              label="Objetivos de aprendizagem"
              values={draft.objetivosAprendizagem}
              onChange={(values) => update({ objetivosAprendizagem: values })}
              placeholder="ex.: Reconhecer critérios de verificação de fontes"
            />
            <Field label="Duração prevista (minutos)">
              <Input
                type="number"
                min={0}
                value={draft.duracaoPrevistaMinutos ?? ""}
                onChange={(e) =>
                  update({ duracaoPrevistaMinutos: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="ex.: 50"
              />
            </Field>
            <Field label="Contexto da turma">
              <textarea
                value={draft.contextoTurma}
                onChange={(e) => update({ contextoTurma: e.target.value })}
                rows={3}
                placeholder="ex.: Turma heterogênea, primeiro contato com o tema"
                className={textareaClassName}
              />
            </Field>
            <Field label="Instruções adicionais">
              <textarea
                value={draft.instrucoesAdicionais}
                onChange={(e) => update({ instrucoesAdicionais: e.target.value })}
                rows={3}
                placeholder="ex.: Priorizar a justificativa da resposta, não só o resultado"
                className={textareaClassName}
              />
            </Field>
            <TagListField
              label="Competências ou habilidades"
              values={draft.competenciasHabilidades}
              onChange={(values) => update({ competenciasHabilidades: values })}
              placeholder="ex.: Pensamento científico, crítico e criativo"
            />
            <TagListField
              label="Materiais de referência"
              values={draft.materiaisReferencia}
              onChange={(values) => update({ materiaisReferencia: values })}
              placeholder="ex.: Texto de apoio da Missão 01"
            />
          </div>
          <MissionNavigation onBack={() => goTo(2)} onNext={() => goTo(4)} />
        </LessonStep>
      )}

      {step === 4 && (
        <LessonStep
          eyebrow="Avaliação"
          title="Adaptações pedagógicas"
          description="Opcional — crie, junto da avaliação original, uma versão adaptada."
        >
          <div className="flex flex-col gap-4">
            <label
              className={
                draft.adaptacaoNeurodivergente
                  ? "flex cursor-pointer items-start gap-3 rounded-lg border border-primary/60 bg-primary/10 px-4 py-3 text-sm transition-colors"
                  : "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              }
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-primary"
                checked={draft.adaptacaoNeurodivergente}
                onChange={(e) =>
                  update({
                    adaptacaoNeurodivergente: e.target.checked,
                    adaptacoesSelecionadas: e.target.checked ? draft.adaptacoesSelecionadas : [],
                  })
                }
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">
                  Criar versão adaptada para alunos neurodivergentes
                </span>
                <span className="text-xs text-muted-foreground">
                  A avaliação original continua existindo — a versão adaptada é gerada em paralelo.
                </span>
              </span>
            </label>

            {draft.adaptacaoNeurodivergente ? (
              <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                <MultiToggleField
                  label="Opções de adaptação"
                  options={ADAPTATION_OPTIONS}
                  values={draft.adaptacoesSelecionadas}
                  onChange={(values) => update({ adaptacoesSelecionadas: values })}
                />
                <Field label="Necessidades específicas (opcional)">
                  <textarea
                    value={draft.necessidadesEspecificas}
                    onChange={(e) => update({ necessidadesEspecificas: e.target.value })}
                    rows={3}
                    placeholder="Descreva uma necessidade específica não coberta acima"
                    className={textareaClassName}
                  />
                </Field>

                <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Regras desta adaptação
                  </p>
                  <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {ADAPTATION_RULES.map((rule) => (
                      <li key={rule}>• {rule}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-chart-4/40 bg-chart-4/10 p-3 text-sm text-foreground/90">
                  {ADAPTATION_NOTICE}
                </div>
              </div>
            ) : null}
          </div>
          <MissionNavigation onBack={() => goTo(3)} onNext={() => goTo(5)} />
        </LessonStep>
      )}

      {step === 5 && (
        <LessonStep
          eyebrow="Avaliação"
          title="Pré-visualização"
          description="Revise os parâmetros antes de qualquer geração."
        >
          <AvaliacaoPreview draft={draft} />
          <MissionNavigation onBack={() => goTo(4)} hideNext />
        </LessonStep>
      )}
    </div>
  );
}

function AvaliacaoHeader({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/professor/docente-iah"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          DocentIAH
        </Link>
        <Badge className="bg-primary/15 text-primary">Avaliação</Badge>
      </div>
      <ProgressIndicator current={step} total={TOTAL_STEPS} />
    </div>
  );
}

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const textareaClassName =
  "w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Lista de strings livres (competências, materiais...) — Input + Enter, badges removíveis. */
function TagListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draftValue, setDraftValue] = React.useState("");

  function add() {
    const trimmed = draftValue.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraftValue("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <Input
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
        </Button>
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map((value) => (
            <Badge key={value} variant="outline" className="gap-1 pr-1 font-normal">
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`Remover ${value}`}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Seleção múltipla via tiles com checkbox — mesmo padrão de `SegmentToggle` (Implantação Institucional). */
function MultiToggleField({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = values.includes(option);
          return (
            <label
              key={option}
              className={
                checked
                  ? "flex cursor-pointer items-center gap-2 rounded-lg border border-primary/60 bg-primary/10 px-3 py-2 text-sm transition-colors"
                  : "flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              }
            >
              <input
                type="checkbox"
                className="accent-primary"
                checked={checked}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...values, option]
                      : values.filter((value) => value !== option),
                  )
                }
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}
