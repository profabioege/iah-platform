import { randomBytes, randomInt } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hashPassword } from "../../../lib/password.ts";

/**
 * Provisionamento do piloto — instituição, turma, professor, gestor e
 * estudantes, com credencial inicial individual.
 *
 * Decisões que a auditoria exigiu e que este módulo implementa:
 *
 *  - **simulação antes de escrever** (`dryRun`): o operador vê o plano
 *    completo — o que seria criado, o que já existe — sem tocar no banco;
 *  - **idempotência**: repetir não recria usuário nem duplica matrícula;
 *    a chave é o e-mail (usuário) e o par turma+aluno (matrícula);
 *  - **credencial individual**: cada conta recebe uma senha aleatória,
 *    diferente das demais, marcada para troca obrigatória no primeiro
 *    acesso. A senha coletiva do modo demonstração não entra aqui;
 *  - **falha parcial explícita**: cada linha é processada e reportada;
 *    o resumo diz o que entrou, o que já existia e o que falhou — nada
 *    de "sucesso" quando metade da turma ficou de fora;
 *  - **trilha administrativa**: quem executou, o que fez, quando. Nunca
 *    senha, hash ou token.
 *
 * Só o caminho administrativo usa este módulo (CLI e, no futuro, uma
 * tela de gestor), sempre com a `service_role` — nunca o papel `iah_app`
 * das telas pedagógicas.
 */

export interface PilotStudentInput {
  /** Identificador escolar do aluno (matrícula da escola), não o nome. */
  externalId: string;
  name: string;
  /** Opcional: a escola pode não ter e-mail individual de aluno. */
  email?: string | null;
}

export interface PilotRoster {
  institution: { id: string; name: string; slug: string; domain?: string | null };
  academicYear: { id: string; label: string; startsOn: string; endsOn: string };
  classroom: { id: string; name: string; grade: string };
  teacher: { id: string; name: string; email: string };
  managers: Array<{ id: string; name: string; email: string }>;
  students: PilotStudentInput[];
}

export type ProvisionOutcome = "criado" | "existente" | "falhou";

export interface ProvisionedAccount {
  kind: "professor" | "gestor" | "aluno";
  reference: string;
  email: string;
  outcome: ProvisionOutcome;
  /** Só existe quando a conta foi criada agora. Nunca é persistida. */
  temporaryPassword?: string;
  error?: string;
}

export interface ProvisionReport {
  dryRun: boolean;
  institutionId: string;
  classroomId: string;
  accounts: ProvisionedAccount[];
  enrollments: { created: number; existing: number; failed: number };
  summary: { created: number; existing: number; failed: number };
}

/**
 * Senha inicial legível e descartável: 4 grupos de 4 caracteres de um
 * alfabeto sem ambiguidade visual (sem O/0, I/l/1). Serve para ser
 * entregue em papel pela escola e trocada no primeiro acesso.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateTemporaryPassword(): string {
  const groups: string[] = [];
  for (let g = 0; g < 4; g += 1) {
    let group = "";
    for (let i = 0; i < 4; i += 1) {
      group += ALPHABET[randomInt(0, ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join("-");
}

function newId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString("hex")}`;
}

/**
 * E-mail de acesso do aluno. Se a escola não fornece e-mail individual,
 * o login usa um endereço institucional derivado do identificador
 * escolar — sem exigir e-mail pessoal de menor de idade, sem criar caixa
 * postal nenhuma. É apenas o nome de usuário do login.
 */
export function studentLoginEmail(
  student: PilotStudentInput,
  institutionDomain: string,
): string {
  const provided = (student.email ?? "").trim().toLowerCase();
  if (provided) return provided;
  const slug = student.externalId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `aluno.${slug}@${institutionDomain}`;
}

async function findUserByEmail(db: SupabaseClient, email: string) {
  const { data, error } = await db
    .from("users")
    .select("id, institution_id, status")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function auditLog(
  db: SupabaseClient,
  entry: {
    actor: string;
    action: string;
    institutionId: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  await db.from("admin_audit_log").insert({
    actor: entry.actor,
    action: entry.action,
    institution_id: entry.institutionId,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    details: entry.details ?? {},
  });
}

interface AccountPlan {
  kind: ProvisionedAccount["kind"];
  reference: string;
  name: string;
  email: string;
  role: "professor" | "administrador" | "aluno";
  userId: string;
}

async function ensureAccount(
  db: SupabaseClient,
  institutionId: string,
  plan: AccountPlan,
  dryRun: boolean,
): Promise<ProvisionedAccount> {
  try {
    const existing = await findUserByEmail(db, plan.email);
    if (existing) {
      // Reaproveitar uma conta existente só vale se ela for da MESMA
      // pessoa no mesmo papel. Um e-mail de aluno que já pertence ao
      // professor (erro de planilha comum) não pode virar "já existe":
      // o registro de aluno acabaria apontando para o usuário do
      // professor. Conflito de papel é falha, e é reportado.
      const { data: perfil } = await db
        .from("profiles")
        .select("role")
        .eq("user_id", existing.id)
        .eq("institution_id", institutionId)
        .eq("status", "active")
        .maybeSingle();
      if (perfil && perfil.role !== plan.role) {
        return {
          kind: plan.kind,
          reference: plan.reference,
          email: plan.email,
          outcome: "falhou",
          error:
            `O e-mail já pertence a uma conta de papel "${perfil.role}" nesta instituição.`,
        };
      }
      return {
        kind: plan.kind,
        reference: plan.reference,
        email: plan.email,
        outcome: "existente",
      };
    }
    if (dryRun) {
      return {
        kind: plan.kind,
        reference: plan.reference,
        email: plan.email,
        outcome: "criado",
      };
    }

    const temporaryPassword = generateTemporaryPassword();
    const { error: userError } = await db.from("users").insert({
      id: plan.userId,
      institution_id: institutionId,
      name: plan.name,
      email: plan.email,
      password_hash: hashPassword(temporaryPassword),
      status: "active",
      must_change_password: true,
      credentials_version: 1,
    });
    if (userError) throw new Error(userError.message);

    const { error: profileError } = await db.from("profiles").insert({
      id: newId("profile"),
      user_id: plan.userId,
      institution_id: institutionId,
      role: plan.role,
      status: "active",
    });
    if (profileError) throw new Error(profileError.message);

    return {
      kind: plan.kind,
      reference: plan.reference,
      email: plan.email,
      outcome: "criado",
      temporaryPassword,
    };
  } catch (error) {
    return {
      kind: plan.kind,
      reference: plan.reference,
      email: plan.email,
      outcome: "falhou",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function upsertRow(
  db: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
  onConflict = "id",
): Promise<void> {
  const { error } = await db.from(table).upsert(row, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

/**
 * Executa (ou simula) o provisionamento. Devolve o relatório completo,
 * com as senhas iniciais das contas criadas AGORA — o chamador decide
 * como entregá-las à escola; elas não são gravadas em lugar nenhum.
 */
export async function provisionPilotClass(
  db: SupabaseClient,
  roster: PilotRoster,
  options: { dryRun?: boolean; actor: string },
): Promise<ProvisionReport> {
  const dryRun = options.dryRun ?? true;
  const institutionDomain = roster.institution.domain ?? `${roster.institution.slug}.local`;
  const accounts: ProvisionedAccount[] = [];
  const enrollments = { created: 0, existing: 0, failed: 0 };

  if (!dryRun) {
    await upsertRow(db, "institutions", {
      id: roster.institution.id,
      name: roster.institution.name,
      slug: roster.institution.slug,
      domain: institutionDomain,
      status: "active",
    });
    await upsertRow(db, "academic_years", {
      id: roster.academicYear.id,
      institution_id: roster.institution.id,
      label: roster.academicYear.label,
      starts_on: roster.academicYear.startsOn,
      ends_on: roster.academicYear.endsOn,
      status: "active",
    });
    await upsertRow(db, "classrooms", {
      id: roster.classroom.id,
      institution_id: roster.institution.id,
      academic_year_id: roster.academicYear.id,
      name: roster.classroom.name,
      grade: roster.classroom.grade,
    });
  }

  // Professor
  const teacherUserId = newId("user");
  const teacherAccount = await ensureAccount(
    db,
    roster.institution.id,
    {
      kind: "professor",
      reference: roster.teacher.id,
      name: roster.teacher.name,
      email: roster.teacher.email.toLowerCase(),
      role: "professor",
      userId: teacherUserId,
    },
    dryRun,
  );
  accounts.push(teacherAccount);

  if (!dryRun && teacherAccount.outcome !== "falhou") {
    const existing = await findUserByEmail(db, roster.teacher.email.toLowerCase());
    await upsertRow(db, "teachers", {
      id: roster.teacher.id,
      institution_id: roster.institution.id,
      name: roster.teacher.name,
      email: roster.teacher.email.toLowerCase(),
      user_id: existing?.id ?? teacherUserId,
    });
    await upsertRow(
      db,
      "classroom_teachers",
      {
        institution_id: roster.institution.id,
        classroom_id: roster.classroom.id,
        teacher_id: roster.teacher.id,
      },
      "classroom_id,teacher_id",
    );
  }

  // Gestores
  for (const manager of roster.managers) {
    const account = await ensureAccount(
      db,
      roster.institution.id,
      {
        kind: "gestor",
        reference: manager.id,
        name: manager.name,
        email: manager.email.toLowerCase(),
        role: "administrador",
        userId: newId("user"),
      },
      dryRun,
    );
    accounts.push(account);
  }

  // Estudantes — duplicidade DENTRO do lote é recusada antes de escrever:
  // duas linhas com o mesmo identificador escolar (ou o mesmo e-mail de
  // acesso) quase sempre são erro de planilha, não dois alunos.
  const vistosPorId = new Set<string>();
  const vistosPorEmail = new Set<string>();

  for (const student of roster.students) {
    const email = studentLoginEmail(student, institutionDomain);
    if (vistosPorId.has(student.externalId) || vistosPorEmail.has(email)) {
      accounts.push({
        kind: "aluno",
        reference: student.externalId,
        email,
        outcome: "falhou",
        error:
          "Linha duplicada no lote (mesmo identificador escolar ou mesmo e-mail de acesso).",
      });
      continue;
    }
    vistosPorId.add(student.externalId);
    vistosPorEmail.add(email);
    const userId = newId("user");
    const account = await ensureAccount(
      db,
      roster.institution.id,
      {
        kind: "aluno",
        reference: student.externalId,
        name: student.name,
        email,
        role: "aluno",
        userId,
      },
      dryRun,
    );
    accounts.push(account);

    if (dryRun || account.outcome === "falhou") continue;

    try {
      const existing = await findUserByEmail(db, email);
      await upsertRow(db, "students", {
        id: student.externalId,
        institution_id: roster.institution.id,
        name: student.name,
        email,
        user_id: existing?.id ?? userId,
      });
      const { data: enrollment } = await db
        .from("enrollments")
        .select("id")
        .eq("institution_id", roster.institution.id)
        .eq("classroom_id", roster.classroom.id)
        .eq("student_id", student.externalId)
        .maybeSingle();
      if (enrollment) {
        enrollments.existing += 1;
      } else {
        await upsertRow(db, "enrollments", {
          id: newId("enroll"),
          institution_id: roster.institution.id,
          classroom_id: roster.classroom.id,
          student_id: student.externalId,
          status: "active",
          enrolled_at: new Date().toISOString(),
        });
        enrollments.created += 1;
      }
    } catch (error) {
      enrollments.failed += 1;
      account.outcome = "falhou";
      account.error = error instanceof Error ? error.message : String(error);
    }
  }

  const summary = {
    created: accounts.filter((a) => a.outcome === "criado").length,
    existing: accounts.filter((a) => a.outcome === "existente").length,
    failed: accounts.filter((a) => a.outcome === "falhou").length,
  };

  if (!dryRun) {
    await auditLog(db, {
      actor: options.actor,
      action: "provision.class",
      institutionId: roster.institution.id,
      targetType: "classroom",
      targetId: roster.classroom.id,
      details: { ...summary, enrollments },
    });
  }

  return {
    dryRun,
    institutionId: roster.institution.id,
    classroomId: roster.classroom.id,
    accounts,
    enrollments,
    summary,
  };
}

export interface CredentialResetResult {
  email: string;
  temporaryPassword: string;
  credentialsVersion: number;
}

/**
 * Recuperação assistida: a escola (responsável autorizado) pede, o
 * operador redefine. Gera credencial temporária individual, obriga a
 * troca no próximo acesso e SOBE `credentials_version` — o que invalida
 * as sessões abertas com a credencial antiga (`request-actor.ts`).
 */
export async function resetPilotCredential(
  db: SupabaseClient,
  email: string,
  options: { actor: string; reason?: string },
): Promise<CredentialResetResult> {
  const normalized = email.trim().toLowerCase();
  const { data: user, error } = await db
    .from("users")
    .select("id, institution_id, credentials_version, status")
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!user) throw new Error("Conta não encontrada para este e-mail.");

  const temporaryPassword = generateTemporaryPassword();
  const nextVersion = Number(user.credentials_version ?? 1) + 1;
  const { error: updateError } = await db
    .from("users")
    .update({
      password_hash: hashPassword(temporaryPassword),
      must_change_password: true,
      credentials_version: nextVersion,
      password_changed_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (updateError) throw new Error(updateError.message);

  await auditLog(db, {
    actor: options.actor,
    action: "credential.reset",
    institutionId: user.institution_id as string,
    targetType: "user",
    targetId: user.id as string,
    details: { reason: options.reason ?? "solicitação da escola", version: nextVersion },
  });

  return { email: normalized, temporaryPassword, credentialsVersion: nextVersion };
}

/**
 * Troca feita pelo próprio usuário depois de entrar com a credencial
 * temporária. Não sobe a versão: a sessão em uso continua válida, e o
 * sinal de "precisa trocar" é baixado.
 */
export async function changeOwnPassword(
  db: SupabaseClient,
  userId: string,
  newPassword: string,
): Promise<void> {
  const { error } = await db
    .from("users")
    .update({
      password_hash: hashPassword(newPassword),
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
