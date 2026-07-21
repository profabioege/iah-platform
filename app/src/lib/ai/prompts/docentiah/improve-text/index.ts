import { promptTemplateRegistry } from "../../../prompt-template-registry.ts";
import { docentiahImproveTextV1 } from "./v1.ts";

export { docentiahImproveTextV1, type DocentiahImproveTextInput } from "./v1.ts";

export function registerDocentiahImproveTextPrompts(): void {
  promptTemplateRegistry.registerText(docentiahImproveTextV1);
}
