/**
 * Fila durável de jobs assíncronos (D-047, `docs/architecture/iah-event-driven-hermes-agent.md`).
 *
 * Contrato de domínio da Micro Missão 1: apenas o job e sua máquina de
 * estados. Não inclui claim transacional, heartbeat real, dead-letter
 * separado ou auditoria append-only — esses fazem parte de missões
 * futuras (worker, API interna do Hermes). Aqui a máquina de estados é a
 * versão mínima suficiente para representar o ciclo de vida do job:
 * `queued` → `processing` → `succeeded` | `failed`, com retorno a
 * `queued` para retry controlado e `cancelled` como saída antecipada.
 * O backoff entre tentativas é representado por `availableAt`, sem um
 * estado dedicado.
 */
export const ASYNC_JOB_STATUSES = [
  "queued",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export type AsyncJobStatus = (typeof ASYNC_JOB_STATUSES)[number];

/** Estados que não podem mais transicionar para processamento. */
const TERMINAL_ASYNC_JOB_STATUSES: readonly AsyncJobStatus[] = [
  "succeeded",
  "failed",
  "cancelled",
];

export interface AsyncJob {
  id: string;
  institutionId: string;
  capability: string;
  status: AsyncJobStatus;
  idempotencyKey: string;
  priority: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  /** A partir de quando o job pode ser reivindicado (ISO); representa o backoff entre tentativas. */
  availableAt: string;
  lockedAt: string | null;
  lockExpiresAt: string | null;
  lockedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
}

export const ASYNC_JOB_PRIORITY_MIN = 1;
export const ASYNC_JOB_PRIORITY_MAX = 999;
export const ASYNC_JOB_DEFAULT_PRIORITY = 100;
export const ASYNC_JOB_DEFAULT_MAX_ATTEMPTS = 3;

export interface AsyncJobCreationInput {
  id: string;
  institutionId: string;
  capability: string;
  idempotencyKey: string;
  input: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
  createdBy?: string | null;
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Cria um job na fila (estado inicial `queued`, disponível imediatamente).
 * Lança erro com mensagem em português quando um parâmetro mínimo é
 * inválido — mesmo padrão de guarda usado em `assertRole`/`assertClassroomScope`
 * (`modules/assessment/domain/authorization.ts`).
 */
export function createAsyncJob(input: AsyncJobCreationInput, now: string): AsyncJob {
  if (!isNonEmptyString(input.institutionId)) {
    throw new Error("Job assíncrono requer institutionId.");
  }
  if (!isNonEmptyString(input.capability)) {
    throw new Error("Job assíncrono requer capability não vazia.");
  }
  if (!isNonEmptyString(input.idempotencyKey)) {
    throw new Error("Job assíncrono requer idempotencyKey não vazia.");
  }

  const priority = input.priority ?? ASYNC_JOB_DEFAULT_PRIORITY;
  if (priority < ASYNC_JOB_PRIORITY_MIN || priority > ASYNC_JOB_PRIORITY_MAX) {
    throw new Error(
      `priority deve estar entre ${ASYNC_JOB_PRIORITY_MIN} e ${ASYNC_JOB_PRIORITY_MAX}.`,
    );
  }

  const maxAttempts = input.maxAttempts ?? ASYNC_JOB_DEFAULT_MAX_ATTEMPTS;
  if (maxAttempts <= 0) {
    throw new Error("maxAttempts deve ser maior que zero.");
  }

  return {
    id: input.id,
    institutionId: input.institutionId,
    capability: input.capability,
    status: "queued",
    idempotencyKey: input.idempotencyKey,
    priority,
    input: input.input,
    output: null,
    errorCode: null,
    errorMessage: null,
    attempts: 0,
    maxAttempts,
    availableAt: now,
    lockedAt: null,
    lockExpiresAt: null,
    lockedBy: null,
    createdBy: input.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    cancelledAt: null,
  };
}

/** O job já esgotou as tentativas permitidas — não deve mais voltar a `queued`, só a `failed`. */
export function hasReachedMaxAttempts(
  job: Pick<AsyncJob, "attempts" | "maxAttempts">,
): boolean {
  return job.attempts >= job.maxAttempts;
}

export function isValidAsyncJobStatus(value: string): value is AsyncJobStatus {
  return (ASYNC_JOB_STATUSES as readonly string[]).includes(value);
}

/** Um estado terminal nunca volta a ser processado. */
export function isTerminalAsyncJobStatus(status: AsyncJobStatus): boolean {
  return TERMINAL_ASYNC_JOB_STATUSES.includes(status);
}

/**
 * Transições válidas do ciclo de vida do job.
 *
 * `queued` → `processing` (claim) → `succeeded` | `failed`;
 * `processing` → `queued` é o retry controlado (backoff via `availableAt`);
 * `queued`/`processing` → `cancelled` é o cancelamento solicitado pelo
 * usuário. Estados terminais (`succeeded`, `failed`, `cancelled`) nunca
 * transicionam de volta ao processamento.
 */
export function canTransitionAsyncJob(
  from: AsyncJobStatus,
  to: AsyncJobStatus,
): boolean {
  if (from === to) return true;
  if (isTerminalAsyncJobStatus(from)) return false;

  return (
    (from === "queued" && to === "processing") ||
    (from === "processing" && to === "succeeded") ||
    (from === "processing" && to === "queued") ||
    (from === "processing" && to === "failed") ||
    (from === "queued" && to === "cancelled") ||
    (from === "processing" && to === "cancelled")
  );
}
