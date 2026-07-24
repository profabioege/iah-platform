import { promptTemplateRegistry } from "../../../prompt-template-registry.ts";
import { docentiahImproveContextV1 } from "./v1.ts";
import { docentiahImproveContextV2 } from "./v2.ts";

export { docentiahImproveContextV1 } from "./v1.ts";
export { docentiahImproveContextV2 } from "./v2.ts";
export {
  docentiahImproveContextInputSchema,
  docentiahImproveContextOutputSchema,
  type DocentiahImproveContextInput,
  type DocentiahImproveContextOutput,
} from "./schema.ts";

/** Ordem importa — o registry sempre usa a última registrada (`getLatest`), então v1 antes de v2. */
export function registerDocentiahImproveContextPrompts(): void {
  promptTemplateRegistry.register(docentiahImproveContextV1);
  promptTemplateRegistry.register(docentiahImproveContextV2);
}
