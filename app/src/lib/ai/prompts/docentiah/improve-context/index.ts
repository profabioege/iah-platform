import { promptTemplateRegistry } from "../../../prompt-template-registry.ts";
import { docentiahImproveContextV1 } from "./v1.ts";

export { docentiahImproveContextV1 } from "./v1.ts";
export {
  docentiahImproveContextInputSchema,
  docentiahImproveContextOutputSchema,
  type DocentiahImproveContextInput,
  type DocentiahImproveContextOutput,
} from "./schema.ts";

export function registerDocentiahImproveContextPrompts(): void {
  promptTemplateRegistry.register(docentiahImproveContextV1);
}
