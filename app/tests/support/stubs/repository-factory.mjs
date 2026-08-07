/**
 * Stub da factory de repositórios — devolve os repositórios falsos do
 * teste. Substituir a factory (e não cada repositório) mantém o serviço
 * de ciclo de aprendizagem REAL sob teste: o que é falso é só a
 * persistência, então as asserções sobre `institutionId` valem sobre o
 * código de produção, não sobre uma reimplementação.
 */

import { testEnv } from "../test-env.mjs";

function required() {
  if (!testEnv.repositories) {
    throw new Error(
      "O teste não configurou testEnv.repositories — use createFakeRepositories().",
    );
  }
  return testEnv.repositories;
}

export function createRepositories() {
  return required();
}

export function getDefaultRepositories() {
  return required();
}
