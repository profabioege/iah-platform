/**
 * `CircuitBreaker` proposto na auditoria (`docs/ai-provider-gateway-interfaces.ts`)
 * — implementação mínima em memória, por processo. N falhas seguidas de
 * um provider abrem o circuito por T minutos; `resilient-llm-provider.ts`
 * consulta antes de tentar o provedor real e pula direto para o
 * fallback demonstrativo enquanto o circuito estiver aberto.
 */

export type CircuitState = "closed" | "open";

const FAILURE_THRESHOLD = 3;
const OPEN_DURATION_MS = 5 * 60 * 1000;

interface CircuitEntry {
  consecutiveFailures: number;
  openedAt: number | null;
}

const circuits = new Map<string, CircuitEntry>();

function entryFor(providerId: string): CircuitEntry {
  let entry = circuits.get(providerId);
  if (!entry) {
    entry = { consecutiveFailures: 0, openedAt: null };
    circuits.set(providerId, entry);
  }
  return entry;
}

export const circuitBreaker = {
  stateFor(providerId: string): CircuitState {
    const entry = entryFor(providerId);
    if (entry.openedAt === null) return "closed";
    if (Date.now() - entry.openedAt >= OPEN_DURATION_MS) {
      // Janela de abertura expirou — fecha o circuito e dá nova chance ao provider.
      entry.openedAt = null;
      entry.consecutiveFailures = 0;
      return "closed";
    }
    return "open";
  },
  reportSuccess(providerId: string): void {
    const entry = entryFor(providerId);
    entry.consecutiveFailures = 0;
    entry.openedAt = null;
  },
  reportFailure(providerId: string): void {
    const entry = entryFor(providerId);
    entry.consecutiveFailures += 1;
    if (entry.consecutiveFailures >= FAILURE_THRESHOLD) {
      entry.openedAt = Date.now();
    }
  },
  /** Só para teste — reinicia o estado de um provider entre casos. */
  _resetForTests(providerId: string): void {
    circuits.delete(providerId);
  },
};
