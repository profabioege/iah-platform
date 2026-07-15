/**
 * Entidade central do módulo Biblioteca.
 * Representa uma Missão conforme a estrutura padrão definida em docs/MISSION.md.
 */

/** Situação da Missão no ciclo de vida editorial. */
export type MissionStatus = "draft" | "published" | "archived";

export interface Mission {
  /** Identificador único (UUID quando houver banco de dados). */
  id: string;

  /** Número da Missão (ex.: Missão 3). */
  number: number;

  /** 1. Título */
  title: string;

  /** Módulo do curso ao qual a Missão pertence. */
  module: string;

  /** 2. Objetivo */
  objective: string;

  /** 3. Pergunta Norteadora */
  guidingQuestion: string;

  /** 4. Contexto */
  context: string;

  /** 5. Material Didático — lista de materiais de apoio. */
  didacticMaterials: string[];

  /** 6. Ferramentas de IA — lista de ferramentas utilizadas na Missão. */
  aiTools: string[];

  /** 7. Desafio */
  challenge: string;

  /** 8. Produção do Aluno */
  studentProduction: string;

  /** 9. Reflexão no Diário do Auditor */
  reflection: string;

  /** 10. Entrega */
  delivery: string;

  /** 11. Competências Desenvolvidas — lista de competências. */
  competencies: string[];

  /** Posição da Missão na sequência do módulo. */
  order: number;

  /** Situação editorial da Missão. */
  status: MissionStatus;

  /** Data de criação. */
  createdAt: Date;

  /** Data da última atualização. */
  updatedAt: Date;
}

/** Dados necessários para criar uma Missão (id e datas são gerados pelo sistema). */
export type CreateMissionInput = Omit<Mission, "id" | "createdAt" | "updatedAt">;

/** Dados para atualizar uma Missão (todos os campos editáveis são opcionais). */
export type UpdateMissionInput = Partial<CreateMissionInput>;
