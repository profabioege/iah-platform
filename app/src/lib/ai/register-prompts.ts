import { registerDocentiahImproveContextPrompts } from "./prompts/docentiah/improve-context/index.ts";
import { registerDocentiahSlidesPrompts } from "./prompts/docentiah/slides/index.ts";

let registered = false;

/** Registra todas as capacidades do IAH AI Gateway — idempotente, chamada pelo próprio Gateway. */
export function ensurePromptsRegistered(): void {
  if (registered) return;
  registerDocentiahSlidesPrompts();
  registerDocentiahImproveContextPrompts();
  registered = true;
}
