"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface WizardCourse {
  externalId: string;
  name: string;
  students: Array<{ externalId: string; name: string; email: string | null }>;
  assignmentCount: number;
}

export interface WizardInstitution {
  id: string;
  name: string;
}

const STEPS = [
  "Instituição",
  "Conectar Google",
  "Turmas",
  "Alunos",
  "Confirmação",
  "Resumo",
] as const;

/**
 * Import Wizard — estrutura e interface do fluxo de importação de turmas
 * do Google Classroom (docs/GOOGLE_CLASSROOM_INTEGRATION.md).
 *
 * Esta fase NÃO importa de verdade: não há OAuth nem banco de dados. O
 * wizard percorre o fluxo completo sobre dados SIMULADOS, sempre
 * rotulados, e o Resumo declara explicitamente que nada foi gravado —
 * em vez de exibir um sucesso que não aconteceu (D-015).
 */
export function ImportWizard({
  institutions,
  courses,
  googleConnected,
  isSimulated,
}: {
  institutions: WizardInstitution[];
  courses: WizardCourse[];
  googleConnected: boolean;
  isSimulated: boolean;
}) {
  const [step, setStep] = React.useState(0);
  const [institutionId, setInstitutionId] = React.useState(
    institutions[0]?.id ?? "",
  );
  const [selectedCourses, setSelectedCourses] = React.useState<string[]>([]);

  const chosen = courses.filter((c) => selectedCourses.includes(c.externalId));
  const totalStudents = chosen.reduce((sum, c) => sum + c.students.length, 0);

  const canAdvance =
    (step === 0 && institutionId !== "") ||
    step === 1 ||
    (step === 2 && chosen.length > 0) ||
    step === 3 ||
    step === 4;

  return (
    <div className="flex flex-col gap-6">
      {isSimulated ? (
        <div className="flex items-start gap-3 rounded-xl border border-chart-4/40 bg-chart-4/10 px-4 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-chart-4" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Pré-visualização com dados simulados
            </p>
            <p className="text-muted-foreground">
              O Google Classroom ainda não está conectado. As turmas e alunos
              abaixo são fictícios, servem para percorrer o fluxo, e{" "}
              <strong className="font-medium text-foreground">
                nenhuma importação será gravada
              </strong>
              .
            </p>
          </div>
        </div>
      ) : null}

      <Stepper current={step} />

      <Card>
        <CardContent className="flex min-h-64 flex-col gap-4 py-2">
          {step === 0 ? (
            <Step title="Passo 1 · Selecionar instituição">
              <div className="flex flex-col gap-2">
                {institutions.map((institution) => (
                  <label
                    key={institution.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                      institutionId === institution.id
                        ? "border-primary/60 bg-primary/10"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="institution"
                      className="accent-primary"
                      checked={institutionId === institution.id}
                      onChange={() => setInstitutionId(institution.id)}
                    />
                    {institution.name}
                  </label>
                ))}
              </div>
            </Step>
          ) : null}

          {step === 1 ? (
            <Step title="Passo 2 · Conectar Google">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <span className="text-sm font-medium">Google Classroom</span>
                <Badge variant="outline" className="text-muted-foreground">
                  {googleConnected ? "Conectado" : "Não conectado"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {googleConnected
                  ? "Conta conectada — as turmas abaixo vêm da sua conta institucional."
                  : "A autenticação OAuth ainda não está disponível. O fluxo segue com dados simulados para você conferir a estrutura da importação; a conexão real é habilitada quando o projeto Google Cloud existir."}
              </p>
            </Step>
          ) : null}

          {step === 2 ? (
            <Step title="Passo 3 · Selecionar turmas">
              <div className="flex flex-col gap-2">
                {courses.map((course) => {
                  const checked = selectedCourses.includes(course.externalId);
                  return (
                    <label
                      key={course.externalId}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                        checked
                          ? "border-primary/60 bg-primary/10"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={checked}
                        onChange={() =>
                          setSelectedCourses((prev) =>
                            checked
                              ? prev.filter((id) => id !== course.externalId)
                              : [...prev, course.externalId],
                          )
                        }
                      />
                      <span className="flex-1">{course.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {course.students.length === 1
                          ? "1 aluno"
                          : `${course.students.length} alunos`}{" "}
                        ·{" "}
                        {course.assignmentCount === 1
                          ? "1 atividade"
                          : `${course.assignmentCount} atividades`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Step>
          ) : null}

          {step === 3 ? (
            <Step title="Passo 4 · Alunos encontrados">
              {chosen.map((course) => (
                <div key={course.externalId} className="flex flex-col gap-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-primary">
                    {course.name}
                  </p>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {course.students.map((student) => (
                      <li
                        key={student.externalId}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
                      >
                        <span>{student.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {student.email ?? "sem e-mail"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Alunos já cadastrados com o mesmo e-mail seriam reconciliados,
                nunca duplicados.
              </p>
            </Step>
          ) : null}

          {step === 4 ? (
            <Step title="Passo 5 · Confirmar importação">
              <ul className="flex flex-col gap-1 text-sm">
                <li>
                  <span className="text-muted-foreground">Instituição: </span>
                  {institutions.find((i) => i.id === institutionId)?.name}
                </li>
                <li>
                  <span className="text-muted-foreground">Turmas: </span>
                  {chosen.length}
                </li>
                <li>
                  <span className="text-muted-foreground">Alunos: </span>
                  {totalStudents}
                </li>
              </ul>
              {!googleConnected ? (
                <p className="rounded-lg border border-chart-4/40 bg-chart-4/10 px-4 py-3 text-sm text-muted-foreground">
                  Como o Google não está conectado e não há banco de dados
                  configurado, confirmar aqui{" "}
                  <strong className="font-medium text-foreground">
                    não grava nada
                  </strong>{" "}
                  — apenas mostra o resultado que a importação real produziria.
                </p>
              ) : null}
            </Step>
          ) : null}

          {step === 5 ? (
            <Step title="Passo 6 · Resumo">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-chart-2" />
                <div className="text-sm">
                  <p className="font-medium">
                    {chosen.length} turma(s) e {totalStudents} aluno(s)
                    percorreram o fluxo de importação.
                  </p>
                  <p className="text-muted-foreground">
                    {googleConnected
                      ? "Importação concluída."
                      : "Nada foi gravado: esta é a pré-visualização do que a importação real faria. Faltam a conexão OAuth com o Google Cloud e o banco de dados."}
                  </p>
                </div>
              </div>
              <Link
                href="/professor"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
              >
                Voltar ao Painel
              </Link>
            </Step>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="size-4" />
          Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            size="sm"
            disabled={!canAdvance}
            onClick={() => setStep((s) => s + 1)}
          >
            {step === 4 ? "Confirmar" : "Avançar"}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStep(0);
              setSelectedCourses([]);
            }}
          >
            Recomeçar
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Etapas da importação">
      {STEPS.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? "step" : undefined}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            index === current
              ? "border-primary/60 bg-primary/15 text-primary"
              : index < current
                ? "border-border text-muted-foreground"
                : "border-border/60 text-muted-foreground/60",
          )}
        >
          {index + 1}. {label}
        </li>
      ))}
    </ol>
  );
}
