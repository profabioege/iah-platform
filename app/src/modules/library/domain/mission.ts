/**
 * Entidade central do módulo Biblioteca.
 * Representa uma Missão conforme a estrutura padrão definida em docs/MISSION.md.
 */

import type { MissionAxes } from "./mission-axes";

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

  /**
   * Dois eixos (D-053): objetivo/habilidade da disciplina e objetivo/
   * competência de IA, com critérios separados. Opcional: Missões antigas
   * não têm; quando existe, a entrega exige o registro de uso da IA e a
   * avaliação exige os dois eixos.
   */
  axes?: MissionAxes;

  /**
   * Textos de apresentação opcionais do Mission Flow (D-054): cada Missão
   * pode orientar a produção, a hipótese de cada item e o título dos
   * critérios com as próprias palavras. Ausentes, a tela usa textos gerais.
   */
  productionPlaceholder?: string;
  hypothesisPrompt?: string;
  criteriaTitle?: string;

  /**
   * Modelo do Relatório (D-057). Presente, a etapa Investigação ganha um
   * campo de hipótese por item do Dossiê, gravado em linhas próprias no
   * topo do texto da Produção (mesmo rascunho e salvamento automático), e
   * este modelo entra no texto logo abaixo, na primeira hipótese
   * registrada. Também é o texto de exemplo da Produção vazia.
   */
  productionTemplate?: string;

  /**
   * Estimativa própria de minutos por etapa do Mission Flow (posição 0 =
   * etapa 1), quando a heurística geral de `mission-timing.ts` não serve
   * à Missão. Estimativa de planejamento, não medição com alunos.
   */
  stepMinutes?: number[];

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
