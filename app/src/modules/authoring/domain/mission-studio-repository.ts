/**
 * Contrato de persistência do Mission Studio (porta do domínio).
 *
 * Implementações: local (localStorage, em uso — missões "salvas neste
 * dispositivo") e banco (stub até o Supabase existir; a troca é um item
 * do checklist Mock → Banco Real de docs/PERSISTENCE.md).
 *
 * Regras de versionamento (docs/AUTHORING_MODEL.md):
 *  - cada registro é UMA versão de uma linhagem (lineageId, version);
 *  - versão publicada é imutável — editar exige criar nova versão;
 *  - nada é apagado: o fim de vida é status "archived".
 */

import type { StudioMission } from "./studio-mission";

export interface MissionStudioRepository {
  /** Todas as versões de todas as missões (a biblioteca filtra). */
  list(): Promise<StudioMission[]>;
  get(id: string): Promise<StudioMission | null>;
  /** Cria ou atualiza (autosave). Recusa alterar versão publicada/arquivada. */
  save(mission: StudioMission): Promise<void>;
  /** Copia a versão para uma nova linhagem (v1, rascunho). */
  duplicate(id: string): Promise<StudioMission>;
  /** Publica a versão (rascunho/revisão → publicada, imutável). */
  publish(id: string): Promise<StudioMission>;
  /** Nova versão editável (v+1, rascunho) a partir de uma publicada. */
  createNewVersion(id: string): Promise<StudioMission>;
  /** Arquiva a versão (fim de vida — nunca exclusão física). */
  archive(id: string): Promise<StudioMission>;
}
