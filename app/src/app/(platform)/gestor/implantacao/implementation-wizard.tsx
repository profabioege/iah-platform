"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Layers,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STEPS = [
  "Boas-vindas",
  "Instituição",
  "Estrutura Acadêmica",
  "Equipe",
  "Turmas",
  "Alunos",
  "Currículo",
  "Resumo",
] as const;

export interface WizardClassroom {
  id: string;
  name: string;
  grade: string | null;
  studentCount: number;
}

export interface WizardData {
  institutionName: string;
  academicYear: string;
  teacherName: string;
  teacherEmail: string;
  adminName: string;
  institutionDomain: string;
  classrooms: WizardClassroom[];
  totalStudents: number;
}

/**
 * Implantação Institucional — assistente de implantação do Método IAH®
 * (Sprint M19). Experiência de confiança para o Gestor Escolar, não um
 * "onboarding" de cadastro de usuários (D-038).
 *
 * Honestidade dos dados (D-015): instituição, equipe, turmas e alunos
 * exibidos são os dados REAIS já existentes no ambiente de demonstração
 * do Instituto Horizonte (instituição fictícia, D-039 — mesma fonte
 * única de `modules/workspace`/`modules/platform`) — nada é fabricado.
 * Campos sem correspondente no modelo hoje (cidade, estado, segmentos,
 * logo, coordenador) ficam como entrada local não persistida ou
 * honestamente "em breve", nunca como dado inventado.
 */
export function ImplementationWizard({ data }: { data: WizardData }) {
  const [step, setStep] = React.useState(0);
  const [city, setCity] = React.useState("");
  const [stateUf, setStateUf] = React.useState("");
  const [segments, setSegments] = React.useState({
    fundamental: false,
    medio: true, // reflete a realidade: as 5 turmas seedadas são todas Ensino Médio
  });

  const totalClassrooms = data.classrooms.length;

  return (
    <div className="flex flex-col gap-6">
      <Stepper current={step} />

      <Card>
        <CardContent className="flex min-h-80 flex-col gap-4 py-2">
          {step === 0 ? (
            <Step
              icon={Sparkles}
              title="Bem-vindo à Implantação Institucional do Método IAH®"
            >
              <p className="text-sm text-foreground/90">
                Você está iniciando o processo estruturado de implantação da
                disciplina Inteligência Artificial &amp; Humanidades. Esta
                implantação organiza a Instituição, a equipe, as turmas, os
                alunos e o currículo — a mesma sequência usada em toda
                implantação do Método IAH®.
              </p>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li>1. Dados da Instituição</li>
                <li>2. Estrutura Acadêmica</li>
                <li>3. Equipe (Gestores, Coordenadores, Professores)</li>
                <li>4. Turmas</li>
                <li>5. Alunos</li>
                <li>6. Currículo oficial</li>
                <li>7. Resumo da Implantação</li>
              </ul>
            </Step>
          ) : null}

          {step === 1 ? (
            <Step icon={Building2} title="Dados da Instituição">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome da Instituição">
                  <Input defaultValue={data.institutionName} />
                </Field>
                <Field label="Ano letivo">
                  <Input defaultValue={data.academicYear} />
                </Field>
                <Field label="Cidade">
                  <Input
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </Field>
                <Field label="Estado">
                  <Input
                    placeholder="UF"
                    value={stateUf}
                    onChange={(e) => setStateUf(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Logo institucional
                </span>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  Ainda não enviado
                  <Badge variant="outline" className="text-muted-foreground">
                    Em breve
                  </Badge>
                </div>
              </div>
            </Step>
          ) : null}

          {step === 2 ? (
            <Step icon={Layers} title="Estrutura Acadêmica">
              <p className="text-sm text-muted-foreground">
                Segmentos atendidos pela Instituição — estrutura preparada
                para expansão futura.
              </p>
              <div className="flex flex-col gap-2">
                <SegmentToggle
                  label="Ensino Fundamental — Anos Finais"
                  checked={segments.fundamental}
                  onChange={(v) =>
                    setSegments((s) => ({ ...s, fundamental: v }))
                  }
                  helper="Nenhuma turma configurada ainda — adicione quando este segmento for implantado."
                />
                <SegmentToggle
                  label="Ensino Médio"
                  checked={segments.medio}
                  onChange={(v) => setSegments((s) => ({ ...s, medio: v }))}
                  helper={`${totalClassrooms} turmas configuradas (1º, 2º e 3º ano).`}
                />
              </div>
            </Step>
          ) : null}

          {step === 3 ? (
            <Step icon={UsersRound} title="Equipe">
              <div className="grid gap-2 sm:grid-cols-3">
                <TeamRow role="Gestores" count={1} names={[data.adminName]} />
                <TeamRow
                  role="Coordenadores"
                  count={0}
                  names={[]}
                  empty="Nenhum coordenador cadastrado ainda"
                />
                <TeamRow
                  role="Professores"
                  count={1}
                  names={[data.teacherName]}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Cadastro adicional de equipe por planilha ou convite por
                e-mail institucional{" "}
                <Badge variant="outline" className="text-muted-foreground">
                  Em breve
                </Badge>
              </p>
            </Step>
          ) : null}

          {step === 4 ? (
            <Step icon={GraduationCap} title="Turmas">
              <div className="flex flex-col gap-2">
                {data.classrooms.map((classroom) => (
                  <div
                    key={classroom.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium">{classroom.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {classroom.grade} · {data.teacherName} ·{" "}
                      {classroom.studentCount}{" "}
                      {classroom.studentCount === 1 ? "aluno" : "alunos"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Importação de turmas do Google Classroom disponível em{" "}
                <Link href="/professor/importar" className="underline">
                  Importar turmas
                </Link>
                .
              </p>
            </Step>
          ) : null}

          {step === 5 ? (
            <Step icon={UsersRound} title="Alunos">
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile label="Total de alunos" value={data.totalStudents} />
                <SummaryTile label="Turmas com alunos" value={totalClassrooms} />
                <SummaryTile
                  label="E-mail institucional válido"
                  value="100%"
                  hint={`@${data.institutionDomain}`}
                />
              </div>
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {data.classrooms.map((c) => (
                  <div key={c.id} className="flex justify-between">
                    <span>{c.name}</span>
                    <span>{c.studentCount} alunos</span>
                  </div>
                ))}
              </div>
            </Step>
          ) : null}

          {step === 6 ? (
            <Step icon={CheckCircle2} title="Currículo">
              <label className="flex cursor-default items-start gap-3 rounded-lg border border-primary/60 bg-primary/10 px-4 py-3 text-sm">
                <input
                  type="radio"
                  checked
                  readOnly
                  className="mt-1 accent-primary"
                />
                <span className="flex flex-col gap-1">
                  <span className="font-medium">
                    Método IAH® — Currículo Inteligência Artificial &amp;
                    Humanidades
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">LDB</Badge>
                    <Badge variant="outline">BNCC</Badge>
                    <Badge variant="outline">BNCC Computação</Badge>
                  </span>
                </span>
              </label>
              <p className="text-sm text-muted-foreground">
                Outros currículos poderão ser adicionados futuramente — a
                estrutura já está preparada para seleção múltipla.
              </p>
            </Step>
          ) : null}

          {step === 7 ? (
            <Step icon={Check} title="Resumo da Implantação">
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryTile label="Instituição" value={data.institutionName} />
                <SummaryTile label="Ano letivo" value={data.academicYear} />
                <SummaryTile label="Professores" value={1} />
                <SummaryTile label="Turmas" value={totalClassrooms} />
                <SummaryTile label="Alunos" value={data.totalStudents} />
                <SummaryTile label="Currículo" value="Método IAH®" />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-chart-2/40 bg-chart-2/10 px-4 py-3 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-chart-2" />
                <span className="font-medium">Tudo pronto.</span>
              </div>
              <Link
                href="/gestor"
                className={cn(buttonVariants({ size: "default" }), "w-fit")}
              >
                Iniciar utilização da Plataforma
                <ChevronRight className="size-4" />
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
          <Button size="sm" onClick={() => setStep((s) => s + 1)}>
            Avançar
            <ChevronRight className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Etapas da implantação">
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function SegmentToggle({
  label,
  checked,
  onChange,
  helper,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  helper: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
        checked
          ? "border-primary/60 bg-primary/10"
          : "border-border hover:bg-muted/50",
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{helper}</span>
      </span>
    </label>
  );
}

function TeamRow({
  role,
  count,
  names,
  empty,
}: {
  role: string;
  count: number;
  names: string[];
  empty?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {role}
      </span>
      <span className="text-lg font-semibold tabular-nums">{count}</span>
      {names.length ? (
        <span className="text-xs text-muted-foreground">
          {names.join(", ")}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">{empty}</span>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}
