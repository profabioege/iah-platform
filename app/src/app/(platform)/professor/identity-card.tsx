import { GraduationCap } from "lucide-react";

import { ROLE_LABEL, type Role } from "@/modules/workspace";
import { Card, CardContent } from "@/components/ui/card";

export interface IdentitySummary {
  name: string;
  role: Role;
  subjectName: string | null;
  institutionName: string;
  schoolYearLabel: string;
  classroomCount: number;
  studentCount: number;
}

/** Card de identidade do Painel do Professor — quem é, onde e com quem. */
export function IdentityCard({ identity }: { identity: IdentitySummary }) {
  const fields: Array<{ label: string; value: string }> = [
    { label: "Disciplina", value: identity.subjectName ?? "—" },
    { label: "Instituição", value: identity.institutionName },
    { label: "Ano letivo", value: identity.schoolYearLabel },
    {
      label: "Turmas",
      value:
        identity.classroomCount === 1 ? "1 turma" : `${identity.classroomCount} turmas`,
    },
    {
      label: "Alunos",
      value: identity.studentCount === 1 ? "1 aluno" : `${identity.studentCount} alunos`,
    },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col">
            <p className="text-base font-medium leading-tight">{identity.name}</p>
            <p className="text-sm text-muted-foreground">{ROLE_LABEL[identity.role]}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-x-8">
          {fields.map((field) => (
            <div key={field.label} className="flex flex-col">
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                {field.label}
              </dt>
              <dd className="text-sm font-medium">{field.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
