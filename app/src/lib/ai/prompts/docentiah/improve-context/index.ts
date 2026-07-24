import { promptTemplateRegistry } from "../../../prompt-template-registry.ts";
import { docentiahImproveContextV1 } from "./v1.ts";
import { docentiahImproveContextV2 } from "./v2.ts";
import { docentiahImproveContextV3 } from "./v3.ts";

export { docentiahImproveContextV1 } from "./v1.ts";
export { docentiahImproveContextV2 } from "./v2.ts";
export { docentiahImproveContextV3 } from "./v3.ts";
export {
  docentiahImproveContextInputSchema,
  docentiahImproveContextOutputSchema,
  type DocentiahImproveContextInput,
  type DocentiahImproveContextOutput,
} from "./schema.ts";

/** Ordem importa — o registry sempre usa a última registrada (`getLatest`), então v1 → v2 → v3. */
export function registerDocentiahImproveContextPrompts(): void {
  promptTemplateRegistry.register(docentiahImproveContextV1);
  promptTemplateRegistry.register(docentiahImproveContextV2);
  promptTemplateRegistry.register(docentiahImproveContextV3);
}
