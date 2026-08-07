/**
 * Stub de `next/cache` — registra as rotas revalidadas pelas Server
 * Actions para que o teste possa afirmar o efeito sem um servidor Next.
 */

import { testEnv } from "../test-env.mjs";

export function revalidatePath(path) {
  testEnv.revalidated.push(path);
}

export function revalidateTag(tag) {
  testEnv.revalidated.push(`tag:${tag}`);
}

export const unstable_cache = (fn) => fn;
export const unstable_noStore = () => {};
