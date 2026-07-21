import { registerDocentiahImproveTextPrompts } from "./prompts/docentiah/improve-text/index.ts";
import { registerDocentiahSlidesPrompts } from "./prompts/docentiah/slides/index.ts";

let registered = false;

/** Registra todas as capacidades do IAH AI Gateway — idempotente, chamada pelo próprio Gateway. */
export function ensurePromptsRegistered(): void {
  if (registered) return;
  registerDocentiahSlidesPrompts();
  registerDocentiahImproveTextPrompts();
  registered = true;
}
