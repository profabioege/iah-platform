/**
 * Banco de questões DESTA requisição — só no modo real.
 *
 * Mesmo caminho das telas pedagógicas (`request-repositories.ts` do
 * módulo platform): o ator é conferido contra o banco (conta ativa,
 * perfil, papel, instituição, versão da credencial) e vira um JWT curto
 * no papel `iah_app`. Nenhum dado de escopo vem do cliente.
 *
 * Não há modo demonstração para este módulo: o banco de questões só
 * faz sentido com persistência e RLS reais (D-049).
 */

import { isAuthConfigured, getPlatformConfigError } from "@/lib/auth-flags";

import { createDatabaseQuestionBankRepositories } from "./database-repositories";
import { createEditorialService, type EditorialService } from "../services/editorial-service";
import {
  createAdaptiveCircuitService,
  type AdaptiveCircuitService,
} from "../services/adaptive-circuit-service";
import {
  createQuestionBankService,
  type QuestionBankActor,
  type QuestionBankService,
} from "../services/question-bank-service";

export class QuestionBankUnavailableError extends Error {}

export async function getQuestionBankContext(): Promise<{
  actor: QuestionBankActor;
  service: QuestionBankService;
  circuit: AdaptiveCircuitService;
  editorial: EditorialService;
}> {
  const configError = getPlatformConfigError();
  if (configError) throw new QuestionBankUnavailableError(configError);
  if (!isAuthConfigured()) {
    throw new QuestionBankUnavailableError(
      "O banco de questões está disponível apenas na instalação com banco real.",
    );
  }
  const { getDatabaseActor } = await import(
    "@/modules/platform/infrastructure/database/request-actor"
  );
  const { getScopedDatabaseClient } = await import(
    "@/modules/platform/infrastructure/database/scoped-client"
  );
  const actor = await getDatabaseActor();
  if (!actor) throw new Error("Sessão inválida ou expirada — entre novamente.");
  const repositories = createDatabaseQuestionBankRepositories(await getScopedDatabaseClient(actor));
  const service = createQuestionBankService(repositories, actor);
  return {
    actor,
    service,
    circuit: createAdaptiveCircuitService(repositories, actor, service),
    editorial: createEditorialService(repositories, actor, service),
  };
}
