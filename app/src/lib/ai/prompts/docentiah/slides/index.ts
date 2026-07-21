import { promptTemplateRegistry } from "../../../prompt-template-registry.ts";
import { docentiahGenerateSlidesV1 } from "./v1.ts";

export { docentiahGenerateSlidesV1 } from "./v1.ts";
export type { DocentiahSlidesEnrichedContext } from "./v1.ts";
export * from "./schema.ts";
export { DOCENTIAH_SLIDES_EXAMPLES, type DocentiahSlidesExample } from "./examples.ts";

/** Registra a versão atual da capacidade `docentiah.generate_slides` — chamado uma vez, na inicialização do Gateway. */
export function registerDocentiahSlidesPrompts(): void {
  promptTemplateRegistry.register(docentiahGenerateSlidesV1);
}
