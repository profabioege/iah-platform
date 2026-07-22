/**
 * Flags de funcionalidade em avaliação (independentes do modo real ×
 * demonstração de `lib/auth-flags.ts`). `NEXT_PUBLIC_*` já é inlinado
 * pelo Next.js tanto em componentes de servidor quanto de cliente —
 * sem precisar do espelho via `next.config.ts` usado para segredos.
 */

/** Conexões IAH (MVP) — oculto por padrão até a funcionalidade ser validada. */
export function isConexoesIahEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_CONEXOES_IAH === "true";
}
