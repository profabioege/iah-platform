/**
 * Implementação DATABASE dos contratos de persistência — Supabase/PostgreSQL.
 *
 * STUB deliberado (mesmo padrão D-019): não existem credenciais de banco
 * nesta fase, então cada método lança erro em vez de fingir uma query que
 * nunca foi testada contra um banco real. O schema correspondente já está
 * versionado em app/db/migrations/. Quando o banco existir, implementar
 * cada método aqui (as queries filtram SEMPRE por institution_id) e a
 * factory passa a entregá-los sem que nenhuma página mude.
 * Critérios completos da troca: docs/PERSISTENCE.md.
 */

import type { PlatformRepositories } from "../../domain/repositories";

function notConfigured(operation: string): never {
  throw new Error(
    `DatabaseRepositories: "${operation}" ainda não está disponível — o ` +
      "banco não foi configurado. Ver docs/PERSISTENCE.md para a ativação.",
  );
}

export function createDatabaseRepositories(): PlatformRepositories {
  return {
    institutions: {
      async getById() {
        notConfigured("institutions.getById");
      },
      async list() {
        notConfigured("institutions.list");
      },
    },
    academicYears: {
      async listByInstitution() {
        notConfigured("academicYears.listByInstitution");
      },
    },
    teachers: {
      async listByInstitution() {
        notConfigured("teachers.listByInstitution");
      },
    },
    classrooms: {
      async listByInstitution() {
        notConfigured("classrooms.listByInstitution");
      },
      async getById() {
        notConfigured("classrooms.getById");
      },
      async create() {
        notConfigured("classrooms.create");
      },
    },
    students: {
      async listByClassroom() {
        notConfigured("students.listByClassroom");
      },
      async findByEmail() {
        notConfigured("students.findByEmail");
      },
      async create() {
        notConfigured("students.create");
      },
    },
    enrollments: {
      async listByClassroom() {
        notConfigured("enrollments.listByClassroom");
      },
      async create() {
        notConfigured("enrollments.create");
      },
    },
    missions: {
      async list() {
        notConfigured("missions.list");
      },
    },
    missionProgress: {
      async listByClassroomMission() {
        notConfigured("missionProgress.listByClassroomMission");
      },
      async save() {
        notConfigured("missionProgress.save");
      },
    },
    productions: {
      async listByStudent() {
        notConfigured("productions.listByStudent");
      },
      async save() {
        notConfigured("productions.save");
      },
    },
    reflections: {
      async listByStudent() {
        notConfigured("reflections.listByStudent");
      },
      async save() {
        notConfigured("reflections.save");
      },
    },
    classroomIntegrations: {
      async listByInstitution() {
        notConfigured("classroomIntegrations.listByInstitution");
      },
    },
    classroomSyncStates: {
      async listByInstitution() {
        notConfigured("classroomSyncStates.listByInstitution");
      },
      async getByClassroom() {
        notConfigured("classroomSyncStates.getByClassroom");
      },
      async save() {
        notConfigured("classroomSyncStates.save");
      },
    },
  };
}
