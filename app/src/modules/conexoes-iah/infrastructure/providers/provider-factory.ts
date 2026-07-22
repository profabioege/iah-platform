import type { CurriculumConnectionProvider } from "../../domain/provider";
import { demoCurriculumConnectionProvider } from "./demo-curriculum-connection-provider.ts";

/** Único ponto de troca para um provedor real no futuro — hoje sempre o demonstrativo determinístico. */
export function getCurriculumConnectionProvider(): CurriculumConnectionProvider {
  return demoCurriculumConnectionProvider;
}
