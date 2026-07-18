/**
 * Implementação DATABASE dos contratos do Curriculum Engine — STUB
 * deliberado (mesmo padrão D-019/D-023/D-034): sem credenciais de
 * banco nesta fase, cada método lança em vez de fingir uma query nunca
 * testada.
 */

import type { CurriculumRepositories } from "../../domain/curriculum-repository";

function notConfigured(operation: string): never {
  throw new Error(
    `CurriculumDatabaseRepositories: "${operation}" ainda não está disponível — ` +
      "o banco não foi configurado.",
  );
}

export function createDatabaseCurriculumRepositories(): CurriculumRepositories {
  return {
    disciplines: {
      async list() {
        notConfigured("disciplines.list");
      },
    },
    units: {
      async listByDiscipline() {
        notConfigured("units.listByDiscipline");
      },
      async getById() {
        notConfigured("units.getById");
      },
      async save() {
        notConfigured("units.save");
      },
    },
    themes: {
      async listByUnit() {
        notConfigured("themes.listByUnit");
      },
      async getById() {
        notConfigured("themes.getById");
      },
      async save() {
        notConfigured("themes.save");
      },
    },
  };
}
