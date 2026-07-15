import type { CreateMissionInput, Mission, UpdateMissionInput } from "./mission";

/**
 * Lado de LEITURA de Missões (porta do domínio).
 *
 * É o contrato que a interface consome para exibir Missões. A Fase 1 do MVP
 * o satisfaz com um repositório local, alimentado por arquivos de conteúdo
 * (read-only). Uma futura implementação com banco de dados poderá substituir
 * a fonte sem alterar os consumidores.
 */
export interface MissionReader {
  /** Lista todas as Missões, ordenadas por módulo e ordem. */
  list(): Promise<Mission[]>;

  /** Lista as Missões de um módulo específico. */
  listByModule(module: string): Promise<Mission[]>;

  /** Busca uma Missão pelo id. Retorna null se não existir. */
  getById(id: string): Promise<Mission | null>;
}

/**
 * Contrato completo de persistência de Missões (leitura + escrita).
 *
 * Estende o {@link MissionReader} com as operações de escrita, que só farão
 * sentido quando as Missões forem editáveis (ex.: autoria via banco de dados).
 * Não é usado na Fase 1 do MVP, em que o conteúdo vem de arquivos.
 */
export interface MissionRepository extends MissionReader {
  /** Cria uma Missão e retorna a entidade completa gerada. */
  create(input: CreateMissionInput): Promise<Mission>;

  /** Atualiza uma Missão existente e retorna a entidade atualizada. */
  update(id: string, input: UpdateMissionInput): Promise<Mission>;

  /** Remove uma Missão pelo id. */
  delete(id: string): Promise<void>;
}
