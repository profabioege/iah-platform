import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PilotStudentInput } from "./pilot-provisioning.ts";

/**
 * Importação da turma do piloto a partir de CSV (`nome,email_institucional,turma`).
 *
 * Duas fases, sempre nesta ordem:
 *  1. validação prévia (pura + leitura do banco, nada escrito) — mostra
 *     total, vínculo com a turma autorizada, e-mails ausentes, inválidos,
 *     repetidos ou fora do domínio da escola, contas já existentes e o que
 *     seria criado ou vinculado;
 *  2. importação — só com zero divergências bloqueantes, pelo mesmo
 *     `provisionPilotClass` (idempotente).
 *
 * Minimização: o CSV tem exatamente as três colunas; coluna extra é
 * recusada (dado que não precisamos não entra). Os relatórios citam o
 * NÚMERO DA LINHA e o e-mail mascarado — nunca o nome — para que possam
 * ser colados num chat ou registro de operação sem expor o aluno.
 */

export const CSV_COLUMNS = ["nome", "email_institucional", "turma"] as const;

export interface CsvStudentRow {
  /** Linha no arquivo (1 = cabeçalho). */
  line: number;
  nome: string;
  email: string;
  turma: string;
}

export interface ImportExpectations {
  /** Rótulo da única turma autorizada (ex.: "1ª série A"). */
  className: string;
  /** Total informado pela escola (lista institucional). */
  expectedTotal: number;
  /** Domínios aceitos para o e-mail institucional (ex.: ["escola.example"]). */
  emailDomains: string[];
}

export type IssueKind =
  | "cabecalho"
  | "coluna_extra"
  | "linha_malformada"
  | "nome_ausente"
  | "email_ausente"
  | "email_invalido"
  | "email_repetido"
  | "dominio_nao_autorizado"
  | "outra_turma"
  | "total_divergente"
  | "dominios_nao_configurados"
  | "nome_repetido"
  | "conta_outra_instituicao"
  | "conta_outro_papel"
  | "conta_inativa"
  | "conta_sem_perfil_ativo"
  | "email_repetido_entre_papeis";

export interface ImportIssue {
  kind: IssueKind;
  /** Bloqueia a importação? Avisos (ex.: homônimos) não bloqueiam. */
  blocking: boolean;
  lines: number[];
  /** Participantes fora do CSV ("professor", "gestor 1"…), quando houver. */
  refs?: string[];
  message: string;
}

export interface PrecheckReport {
  total: number;
  inAuthorizedClass: number;
  outOfClass: number;
  issues: ImportIssue[];
  blocking: boolean;
  /** Domínios encontrados no arquivo, com contagem (sem endereços). */
  domainsFound: Record<string, number>;
  rows: CsvStudentRow[];
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/**
 * Chave do rótulo da turma: "1ª série A", "1a Serie A", "1A", "1º A",
 * "1ª série A - Ensino Médio" → "1a". "1º ano A" vira "1anoa" (ano ≠
 * série) e qualquer formato não reconhecido fica com prefixo "?" — nunca
 * coincide com a turma autorizada, então bloqueia em vez de adivinhar.
 */
export function normalizeClassLabel(label: string): string {
  const s = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ªº°]/g, "o")
    .replace(/\s+/g, " ")
    .trim();
  const m = s.match(
    /^(\d+)\s*(?:[ao]\.?)?\s*(serie|ano)?\s*(?:turma\s*)?([a-z])\s*(?:[-(]?\s*(?:do\s+)?(?:em|e\.m\.|ensino medio)\s*\)?)?$/,
  );
  if (!m) return `?${s}`;
  return `${m[1]}${m[2] === "ano" ? "ano" : ""}${m[3]}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** "maria.souza@escola.example" → "ma***@escola.example" (para relatórios). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Identificador estável do aluno, derivado da instituição + e-mail. Não
 * carrega o nome nem o e-mail em claro, e é o mesmo a cada importação —
 * por isso repetir a importação não cria um segundo aluno.
 */
export function studentIdFor(institutionId: string, email: string): string {
  const digest = createHash("sha256")
    .update(`${institutionId}:${normalizeEmail(email)}`)
    .digest("hex")
    .slice(0, 16);
  return `aluno-${digest}`;
}

function splitCsvLine(line: string, delimiter: string): string[] | null {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (quoted) return null;
  out.push(cur);
  return out.map((v) => v.trim());
}

/** Lê o CSV (vírgula ou ponto e vírgula, com ou sem BOM). */
export function parseClassCsv(text: string): { rows: CsvStudentRow[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const headerLine = lines[0] ?? "";
  const delimiter = headerLine.includes(";") && !headerLine.includes(",") ? ";" : ",";
  const header = (splitCsvLine(headerLine, delimiter) ?? []).map((h) => h.toLowerCase());

  const missing = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    issues.push({
      kind: "cabecalho",
      blocking: true,
      lines: [1],
      message: `Cabeçalho deve ser exatamente: ${CSV_COLUMNS.join(",")} (faltando: ${missing.join(", ")}).`,
    });
    return { rows: [], issues };
  }
  const extras = header.filter((h) => h && !(CSV_COLUMNS as readonly string[]).includes(h));
  if (extras.length > 0) {
    issues.push({
      kind: "coluna_extra",
      blocking: true,
      lines: [1],
      message: `Remova as colunas extras (${extras.length}): só nome, email_institucional e turma são necessários.`,
    });
  }
  const idx = {
    nome: header.indexOf("nome"),
    email: header.indexOf("email_institucional"),
    turma: header.indexOf("turma"),
  };

  const rows: CsvStudentRow[] = [];
  const malformed: number[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim() === "" || raw.replace(/[;,"\s]/g, "") === "") continue;
    const cells = splitCsvLine(raw, delimiter);
    if (!cells || cells.length !== header.length) {
      malformed.push(i + 1);
      continue;
    }
    rows.push({
      line: i + 1,
      nome: cells[idx.nome].replace(/\s+/g, " "),
      email: normalizeEmail(cells[idx.email]),
      turma: cells[idx.turma],
    });
  }
  if (malformed.length > 0) {
    issues.push({
      kind: "linha_malformada",
      blocking: true,
      lines: malformed,
      message: "Linhas com número de colunas diferente do cabeçalho ou aspas sem fechar.",
    });
  }
  return { rows, issues };
}

/** Validação prévia sem banco: total, turma, e-mails, domínios, homônimos. */
export function precheckClassRows(
  parsed: { rows: CsvStudentRow[]; issues: ImportIssue[] },
  expected: ImportExpectations,
): PrecheckReport {
  const issues = [...parsed.issues];
  const rows = parsed.rows;
  const add = (kind: IssueKind, blocking: boolean, lines: number[], message: string) => {
    if (lines.length > 0) issues.push({ kind, blocking, lines, message });
  };

  const classKey = normalizeClassLabel(expected.className);
  const outOfClass = rows.filter((r) => normalizeClassLabel(r.turma) !== classKey);
  add(
    "outra_turma",
    true,
    outOfClass.map((r) => r.line),
    `Linhas que não são da ${expected.className} — retire-as do arquivo; outras turmas não são importadas.`,
  );

  add("nome_ausente", true, rows.filter((r) => !r.nome).map((r) => r.line), "Nome ausente.");
  add("email_ausente", true, rows.filter((r) => !r.email).map((r) => r.line), "E-mail institucional ausente.");
  const invalid = rows.filter((r) => r.email && !EMAIL_RE.test(r.email));
  add("email_invalido", true, invalid.map((r) => r.line), "E-mail institucional inválido.");

  const byEmail = new Map<string, number[]>();
  for (const r of rows.filter((x) => x.email)) {
    byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), r.line]);
  }
  add(
    "email_repetido",
    true,
    [...byEmail.values()].filter((l) => l.length > 1).flat(),
    "O mesmo e-mail aparece em mais de uma linha.",
  );

  const domainsFound: Record<string, number> = {};
  for (const r of rows) {
    const d = r.email.split("@")[1];
    if (d) domainsFound[d] = (domainsFound[d] ?? 0) + 1;
  }
  const allowed = expected.emailDomains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) {
    issues.push({
      kind: "dominios_nao_configurados",
      blocking: true,
      lines: [],
      message: "Configure o(s) domínio(s) de e-mail institucional da escola antes de importar.",
    });
  } else {
    add(
      "dominio_nao_autorizado",
      true,
      rows.filter((r) => r.email.includes("@") && !allowed.includes(r.email.split("@")[1])).map((r) => r.line),
      `E-mail fora do domínio institucional (${allowed.join(", ")}).`,
    );
  }

  const byName = new Map<string, number[]>();
  for (const r of rows.filter((x) => x.nome)) {
    const k = r.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    byName.set(k, [...(byName.get(k) ?? []), r.line]);
  }
  add(
    "nome_repetido",
    false,
    [...byName.values()].filter((l) => l.length > 1).flat(),
    "Nomes iguais em linhas diferentes (homônimos?) — confirme com a secretaria; não bloqueia se os e-mails forem distintos.",
  );

  if (rows.length !== expected.expectedTotal) {
    issues.push({
      kind: "total_divergente",
      blocking: true,
      lines: [],
      message: `O arquivo tem ${rows.length} aluno(s); a lista institucional informada é de ${expected.expectedTotal}. Confirme com a escola antes de importar.`,
    });
  }

  return {
    total: rows.length,
    inAuthorizedClass: rows.length - outOfClass.length,
    outOfClass: outOfClass.length,
    issues,
    blocking: issues.some((i) => i.blocking),
    domainsFound,
    rows,
  };
}

export type ExistingAccountState =
  | "nova"
  | "existente_vinculada"
  | "existente_sem_matricula"
  | "existente_sem_registro_de_aluno"
  | "outro_papel"
  | "outra_instituicao"
  | "inativa"
  | "sem_perfil_ativo";

export interface DatabasePrecheck {
  byState: Record<ExistingAccountState, number[]>;
  issues: ImportIssue[];
  toCreate: number;
  toLink: number;
  alreadyLinked: number;
}

/** Papel que cada participante deve ter na instituição. */
export type ParticipantRole = "aluno" | "professor" | "administrador";

/** Professor ou gestor da configuração (fora do CSV). */
export interface StaffParticipant {
  kind: "professor" | "gestor";
  /** Rótulo neutro para relatório: "professor", "gestor 1", "gestor 2"… */
  reference: string;
  role: Exclude<ParticipantRole, "aluno">;
  email: string;
}

export type StaffAccountState =
  | "nova"
  | "existente_compativel"
  | "outra_instituicao"
  | "inativa"
  | "sem_perfil_ativo"
  | "outro_papel";

export interface StaffPrecheckEntry {
  kind: StaffParticipant["kind"];
  reference: string;
  role: StaffParticipant["role"];
  state: StaffAccountState;
}

export interface RoleCounts {
  total: number;
  novas: number;
  /** Já existem com perfil ativo compatível (alunos: vinculadas ou a vincular). */
  compativeis: number;
  bloqueadas: number;
}

export interface RosterDatabasePrecheck {
  students: DatabasePrecheck;
  staff: StaffPrecheckEntry[];
  byRole: Record<ParticipantRole, RoleCounts>;
  issues: ImportIssue[];
  blocking: boolean;
}

/** Professor e gestores da configuração, com o papel esperado de cada um. */
export function staffFromConfig(config: {
  teacher: { email: string };
  managers: Array<{ email: string }>;
}): StaffParticipant[] {
  return [
    { kind: "professor", reference: "professor", role: "professor", email: normalizeEmail(config.teacher.email) },
    ...config.managers.map((m, i) => ({
      kind: "gestor" as const,
      reference: `gestor ${i + 1}`,
      role: "administrador" as const,
      email: normalizeEmail(m.email),
    })),
  ];
}

/**
 * E-mail repetido entre professor, gestores e alunos (ou entre dois
 * gestores). Puro — vale também no modo offline. Cada pessoa precisa de
 * conta e credencial próprias, num único papel.
 */
export function precheckParticipantEmails(rows: CsvStudentRow[], staff: StaffParticipant[]): ImportIssue[] {
  const owners = new Map<string, { lines: number[]; refs: string[] }>();
  const add = (email: string, line: number | null, ref: string | null) => {
    if (!email) return;
    const o = owners.get(email) ?? { lines: [], refs: [] };
    if (line != null) o.lines.push(line);
    if (ref != null) o.refs.push(ref);
    owners.set(email, o);
  };
  for (const s of staff) add(normalizeEmail(s.email), null, s.reference);
  for (const r of rows) add(r.email, r.line, null);
  const lines: number[] = [];
  const refs: string[] = [];
  for (const o of owners.values()) {
    // Repetição só entre alunos já é "email_repetido" (precheckClassRows).
    if (o.refs.length === 0) continue;
    if (o.refs.length + o.lines.length > 1) {
      lines.push(...o.lines);
      refs.push(...o.refs);
    }
  }
  if (lines.length === 0 && refs.length === 0) return [];
  return [
    {
      kind: "email_repetido_entre_papeis",
      blocking: true,
      lines: lines.sort((a, b) => a - b),
      refs,
      message: "O mesmo e-mail aparece para mais de um participante (professor, gestor ou aluno) — cada pessoa precisa de conta própria.",
    },
  ];
}

interface AccountSnapshot {
  users: Map<string, { id: string; institution_id: string; status: string }>;
  /** Papéis com perfil ATIVO na instituição-alvo, por user_id. */
  activeRoles: Map<string, Set<string>>;
}

/** Só leitura: contas e perfis (de qualquer status) dos e-mails informados. */
async function readAccounts(db: SupabaseClient, emails: string[], institutionId: string): Promise<AccountSnapshot> {
  const users = new Map<string, { id: string; institution_id: string; status: string }>();
  for (let i = 0; i < emails.length; i += 100) {
    const { data, error } = await db
      .from("users")
      .select("id, email, institution_id, status")
      .in("email", emails.slice(i, i + 100));
    if (error) throw new Error(`users: ${error.message}`);
    for (const u of data ?? []) users.set(String(u.email).toLowerCase(), u as never);
  }
  const activeRoles = new Map<string, Set<string>>();
  const userIds = [...users.values()].map((u) => u.id);
  for (let i = 0; i < userIds.length; i += 100) {
    const { data, error } = await db
      .from("profiles")
      .select("user_id, role, status")
      .eq("institution_id", institutionId)
      .in("user_id", userIds.slice(i, i + 100));
    if (error) throw new Error(`profiles: ${error.message}`);
    for (const row of data ?? []) {
      if (String(row.status) !== "active") continue;
      const set = activeRoles.get(String(row.user_id)) ?? new Set<string>();
      set.add(String(row.role));
      activeRoles.set(String(row.user_id), set);
    }
  }
  return { users, activeRoles };
}

/** Classificação comum: instituição → conta ativa → perfil ativo do papel esperado. */
function classifyAccount(
  snap: AccountSnapshot,
  email: string,
  institutionId: string,
  role: ParticipantRole,
): "nova" | "outra_instituicao" | "inativa" | "sem_perfil_ativo" | "outro_papel" | "compativel" {
  const u = snap.users.get(email);
  if (!u) return "nova";
  if (u.institution_id !== institutionId) return "outra_instituicao";
  if (u.status !== "active") return "inativa";
  const roles = snap.activeRoles.get(u.id);
  if (!roles || roles.size === 0) return "sem_perfil_ativo";
  if (roles.size !== 1 || !roles.has(role)) return "outro_papel";
  return "compativel";
}

const STAFF_BLOCKS: Record<Exclude<StaffAccountState, "nova" | "existente_compativel">, [IssueKind, string]> = {
  outra_instituicao: ["conta_outra_instituicao", "E-mail já usado por conta de OUTRA instituição."],
  inativa: ["conta_inativa", "Conta existente desativada — reativar exige decisão da escola."],
  sem_perfil_ativo: ["conta_sem_perfil_ativo", "Conta existente sem perfil ativo nesta instituição — não é completada automaticamente."],
  outro_papel: ["conta_outro_papel", "Conta existente com outro papel nesta instituição — papel não é trocado automaticamente."],
};

/**
 * Prévia completa com banco, SÓ LEITURA: alunos (papel aluno), professor
 * (papel professor) e gestores (papel administrador), todos na instituição
 * configurada. Conflito de instituição, conta inativa, falta de perfil ativo
 * compatível ou outro papel bloqueiam — nada é corrigido automaticamente.
 * Inclui o cruzamento de e-mails entre papéis.
 */
export async function precheckRosterAgainstDatabase(
  db: SupabaseClient,
  rows: CsvStudentRow[],
  staff: StaffParticipant[],
  target: { institutionId: string; classroomId: string },
): Promise<RosterDatabasePrecheck> {
  const students = await precheckAgainstDatabase(db, rows, target);
  const snap = await readAccounts(db, [...new Set(staff.map((s) => normalizeEmail(s.email)))], target.institutionId);

  const entries: StaffPrecheckEntry[] = staff.map((s) => {
    const c = classifyAccount(snap, normalizeEmail(s.email), target.institutionId, s.role);
    return { kind: s.kind, reference: s.reference, role: s.role, state: c === "compativel" ? "existente_compativel" : c };
  });

  const issues: ImportIssue[] = [...precheckParticipantEmails(rows, staff), ...students.issues];
  for (const [state, [kind, message]] of Object.entries(STAFF_BLOCKS) as Array<
    [keyof typeof STAFF_BLOCKS, [IssueKind, string]]
  >) {
    const refs = entries.filter((e) => e.state === state).map((e) => e.reference);
    if (refs.length > 0) issues.push({ kind, blocking: true, lines: [], refs, message: `${message} (professor/gestor)` });
  }

  const st = students.byState;
  const blockedStudents =
    st.outra_instituicao.length + st.inativa.length + st.outro_papel.length + st.sem_perfil_ativo.length;
  const countStaff = (role: StaffParticipant["role"]): RoleCounts => {
    const list = entries.filter((e) => e.role === role);
    return {
      total: list.length,
      novas: list.filter((e) => e.state === "nova").length,
      compativeis: list.filter((e) => e.state === "existente_compativel").length,
      bloqueadas: list.filter((e) => e.state !== "nova" && e.state !== "existente_compativel").length,
    };
  };
  return {
    students,
    staff: entries,
    byRole: {
      aluno: {
        total: rows.filter((r) => r.email).length,
        novas: st.nova.length,
        compativeis: students.toLink + students.alreadyLinked,
        bloqueadas: blockedStudents,
      },
      professor: countStaff("professor"),
      administrador: countStaff("administrador"),
    },
    issues,
    blocking: issues.some((i) => i.blocking),
  };
}

/**
 * Execução protegida: repete a prévia completa IMEDIATAMENTE antes de gravar
 * e só chama `provision` (o primeiro upsert) se não houver bloqueio. Com
 * bloqueio, a importação inteira é recusada e nada é escrito.
 */
export async function importAfterPrecheck<R>(
  db: SupabaseClient,
  rows: CsvStudentRow[],
  staff: StaffParticipant[],
  target: { institutionId: string; classroomId: string },
  provision: () => Promise<R>,
): Promise<{ precheck: RosterDatabasePrecheck; result: R | null }> {
  const precheck = await precheckRosterAgainstDatabase(db, rows, staff, target);
  if (precheck.blocking) return { precheck, result: null };
  return { precheck, result: await provision() };
}

/**
 * Confere, só lendo, o que já existe no banco para cada e-mail de ALUNO do
 * arquivo. Conta de outra instituição, de outro papel, inativa ou sem perfil
 * ativo é divergência bloqueante — nunca é "reaproveitada" em silêncio.
 */
export async function precheckAgainstDatabase(
  db: SupabaseClient,
  rows: CsvStudentRow[],
  target: { institutionId: string; classroomId: string },
): Promise<DatabasePrecheck> {
  const byState: Record<ExistingAccountState, number[]> = {
    nova: [],
    existente_vinculada: [],
    existente_sem_matricula: [],
    existente_sem_registro_de_aluno: [],
    outro_papel: [],
    outra_instituicao: [],
    inativa: [],
    sem_perfil_ativo: [],
  };
  const emails = [...new Set(rows.map((r) => r.email).filter(Boolean))];
  const snap = await readAccounts(db, emails, target.institutionId);
  const students = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 100) {
    const { data: s, error: se } = await db
      .from("students")
      .select("id, email")
      .eq("institution_id", target.institutionId)
      .in("email", emails.slice(i, i + 100));
    if (se) throw new Error(`students: ${se.message}`);
    for (const row of s ?? []) students.set(String(row.email).toLowerCase(), String(row.id));
  }
  const enrolled = new Set<string>();
  const studentIds = [...students.values()];
  for (let i = 0; i < studentIds.length; i += 100) {
    const { data: e, error: ee } = await db
      .from("enrollments")
      .select("student_id")
      .eq("institution_id", target.institutionId)
      .eq("classroom_id", target.classroomId)
      .in("student_id", studentIds.slice(i, i + 100));
    if (ee) throw new Error(`enrollments: ${ee.message}`);
    for (const row of e ?? []) enrolled.add(String(row.student_id));
  }

  for (const r of rows) {
    if (!r.email) continue;
    const c = classifyAccount(snap, r.email, target.institutionId, "aluno");
    if (c === "nova") byState.nova.push(r.line);
    else if (c !== "compativel") byState[c].push(r.line);
    else if (!students.has(r.email)) byState.existente_sem_registro_de_aluno.push(r.line);
    else if (!enrolled.has(students.get(r.email) as string)) byState.existente_sem_matricula.push(r.line);
    else byState.existente_vinculada.push(r.line);
  }

  const issues: ImportIssue[] = [];
  const block = (lines: number[], kind: IssueKind, message: string) => {
    if (lines.length > 0) issues.push({ kind, blocking: true, lines, message });
  };
  block(byState.outra_instituicao, "conta_outra_instituicao", "E-mail já usado por conta de OUTRA instituição.");
  block(byState.outro_papel, "conta_outro_papel", "E-mail já usado por conta de professor ou gestor nesta instituição.");
  block(byState.inativa, "conta_inativa", "Conta existente desativada — reativar exige decisão da escola.");
  block(
    byState.sem_perfil_ativo,
    "conta_sem_perfil_ativo",
    "Conta existente sem perfil ativo de aluno nesta instituição — não é completada automaticamente.",
  );

  return {
    byState,
    issues,
    toCreate: byState.nova.length,
    toLink: byState.existente_sem_matricula.length + byState.existente_sem_registro_de_aluno.length,
    alreadyLinked: byState.existente_vinculada.length,
  };
}

/** Converte as linhas validadas no formato do provisionamento. */
export function toPilotStudents(rows: CsvStudentRow[], institutionId: string): PilotStudentInput[] {
  return rows.map((r) => ({
    externalId: studentIdFor(institutionId, r.email),
    name: r.nome,
    email: r.email,
  }));
}

export interface ConfigIssue {
  /** Caminho do campo na configuração (ex.: "teacher.email", "managers[0].name"). */
  path: string;
  message: string;
}

const PLACEHOLDER_RE = /preencher/i;

/**
 * Confere a configuração da turma ANTES de qualquer acesso ao banco.
 *
 * Recusa: objeto ou campo obrigatório ausente ou vazio; valor que ainda
 * contém o marcador "PREENCHER" do modelo; e-mail inválido do professor ou
 * de gestor; lista de gestores vazia; total esperado que não seja inteiro
 * positivo. Devolve a lista de problemas (vazia = configuração completa).
 * As mensagens citam só o caminho do campo, nunca o valor.
 */
export function validatePilotConfig(config: unknown): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  const root = isObj(config) ? config : {};
  if (!isObj(config)) issues.push({ path: "(raiz)", message: "a configuração precisa ser um objeto JSON." });

  const text = (obj: Record<string, unknown>, key: string, path: string, kind: "texto" | "email" = "texto") => {
    const v = obj[key];
    if (typeof v !== "string" || v.trim() === "") {
      issues.push({ path, message: "obrigatório e não pode ficar vazio." });
      return;
    }
    if (PLACEHOLDER_RE.test(v)) {
      issues.push({ path, message: 'ainda contém o marcador "PREENCHER" do modelo.' });
      return;
    }
    if (kind === "email" && !EMAIL_RE.test(normalizeEmail(v))) {
      issues.push({ path, message: "e-mail inválido." });
    }
  };
  const section = (key: string, fields: Array<[string, "texto" | "email"]>) => {
    const obj = root[key];
    if (!isObj(obj)) {
      issues.push({ path: key, message: "objeto obrigatório ausente." });
      return;
    }
    for (const [f, kind] of fields) text(obj, f, `${key}.${f}`, kind);
  };

  section("institution", [["id", "texto"], ["name", "texto"], ["slug", "texto"]]);
  if (isObj(root.institution) && root.institution.domain != null && root.institution.domain !== "") {
    text(root.institution, "domain", "institution.domain");
  }
  section("academicYear", [["id", "texto"], ["label", "texto"], ["startsOn", "texto"], ["endsOn", "texto"]]);
  section("classroom", [["id", "texto"], ["name", "texto"], ["grade", "texto"]]);
  section("teacher", [["id", "texto"], ["name", "texto"], ["email", "email"]]);

  const managers = root.managers;
  if (!Array.isArray(managers) || managers.length === 0) {
    issues.push({ path: "managers", message: "informe ao menos um gestor." });
  } else {
    managers.forEach((m, i) => {
      if (!isObj(m)) {
        issues.push({ path: `managers[${i}]`, message: "gestor precisa ser um objeto." });
        return;
      }
      for (const [f, kind] of [["id", "texto"], ["name", "texto"], ["email", "email"]] as const) {
        text(m, f, `managers[${i}].${f}`, kind);
      }
    });
  }

  const expected = root.expected;
  if (!isObj(expected)) {
    issues.push({ path: "expected", message: "objeto obrigatório ausente." });
  } else {
    text(expected, "className", "expected.className");
    const t = expected.expectedTotal;
    if (typeof t !== "number" || !Number.isInteger(t) || t < 1) {
      issues.push({ path: "expected.expectedTotal", message: "precisa ser um inteiro positivo." });
    }
    const domains = expected.emailDomains;
    if (!Array.isArray(domains) || domains.some((d) => typeof d !== "string")) {
      issues.push({ path: "expected.emailDomains", message: "precisa ser uma lista de domínios." });
    } else {
      domains.forEach((d, i) => {
        if (PLACEHOLDER_RE.test(d)) {
          issues.push({ path: `expected.emailDomains[${i}]`, message: 'ainda contém o marcador "PREENCHER" do modelo.' });
        }
      });
    }
  }
  return issues;
}
