/**
 * Limites de homologação da Preview (Fase 5, integração DeepSeek em
 * docentiah.improve_context) — teto de segurança durante o teste
 * supervisionado, não cobrança. Reaproveita o `GenerationUsage` já
 * existente (nenhuma tabela nova, nenhuma migration).
 */

export const PREVIEW_DAILY_LIMIT_PER_TEACHER = 10;

export interface UsageRecordLike {
  userId: string;
  capability: string;
  createdAt: string;
}

function isSameUtcDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

export function countTodayUsage(
  usageRecords: UsageRecordLike[],
  userId: string,
  capability: string,
  now: Date = new Date(),
): number {
  const nowIso = now.toISOString();
  return usageRecords.filter(
    (entry) => entry.userId === userId && entry.capability === capability && isSameUtcDay(entry.createdAt, nowIso),
  ).length;
}

export function hasReachedDailyLimit(
  usageRecords: UsageRecordLike[],
  userId: string,
  capability: string,
  limit: number = PREVIEW_DAILY_LIMIT_PER_TEACHER,
  now?: Date,
): boolean {
  return countTodayUsage(usageRecords, userId, capability, now) >= limit;
}

/**
 * 1 solicitação simultânea por usuário — melhor esforço, em memória por
 * processo (mesma simplificação já documentada no circuit breaker: não
 * é um lock distribuído; suficiente para o teto de homologação da
 * Preview, não uma garantia de concorrência real entre instâncias).
 */
const inFlightUsers = new Set<string>();

export function tryAcquireInFlightLock(userId: string): boolean {
  if (inFlightUsers.has(userId)) return false;
  inFlightUsers.add(userId);
  return true;
}

export function releaseInFlightLock(userId: string): void {
  inFlightUsers.delete(userId);
}

/** Só para teste — nunca chamado em produção. */
export function _resetInFlightLocksForTests(): void {
  inFlightUsers.clear();
}
