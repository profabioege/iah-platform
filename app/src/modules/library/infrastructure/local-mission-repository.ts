import { missions } from "@/content/missions";

import type { Mission } from "../domain/mission";
import type { MissionReader } from "../domain/mission-repository";

/**
 * Implementação local do lado de leitura de Missões (Fase 1 do MVP).
 *
 * A fonte é o índice de arquivos de conteúdo (`@/content/missions`), servido
 * em memória. Satisfaz o contrato {@link MissionReader}, de modo que uma
 * futura fonte (ex.: banco de dados) possa substituí-la sem alterar os
 * consumidores. As operações são assíncronas por contrato, ainda que aqui
 * resolvam de forma síncrona.
 */
function sortByModuleAndOrder(list: Mission[]): Mission[] {
  return [...list].sort((a, b) => {
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    return a.order - b.order;
  });
}

export const localMissionRepository: MissionReader = {
  async list() {
    return sortByModuleAndOrder(missions);
  },

  async listByModule(module) {
    return sortByModuleAndOrder(missions.filter((m) => m.module === module));
  },

  async getById(id) {
    return missions.find((m) => m.id === id) ?? null;
  },
};
