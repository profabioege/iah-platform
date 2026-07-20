/**
 * Implementação SEED dos contratos de persistência — em memória, sobre
 * os dados de demonstração (seeds/demo-seed.ts). É a implementação em
 * uso enquanto não há banco real configurado.
 *
 * Escritas (create/save) afetam só a memória do processo — coerente com
 * a regra de nunca persistir dado fictício (docs/PERSISTENCE.md).
 */

import type {
  ClassroomIntegration,
  ClassroomSyncState,
  Enrollment,
  MissionProgress,
  MissionReview,
  Production,
  Reflection,
  Student,
  Classroom,
} from "../../domain/entities";
import type { MissionAssignment } from "../../domain/mission-delivery";
import type { PlatformRepositories } from "../../domain/repositories";
import {
  DEMO_ACADEMIC_YEAR,
  DEMO_CLASSROOMS,
  DEMO_ENROLLMENTS,
  DEMO_INSTITUTION,
  DEMO_MISSION_PROGRESS,
  DEMO_MISSION_RECORD,
  DEMO_PRODUCTIONS,
  DEMO_REFLECTIONS,
  DEMO_STUDENTS,
  DEMO_TEACHER,
} from "../../seeds/demo-seed";

export function createSeedRepositories(): PlatformRepositories {
  // Cópias mutáveis por instância — escritas não vazam entre factories.
  const classrooms: Classroom[] = [...DEMO_CLASSROOMS];
  const students: Student[] = [...DEMO_STUDENTS];
  const enrollments: Enrollment[] = [...DEMO_ENROLLMENTS];
  const progress: MissionProgress[] = [...DEMO_MISSION_PROGRESS];
  const productions: Production[] = [...DEMO_PRODUCTIONS];
  const reflections: Reflection[] = [...DEMO_REFLECTIONS];
  const integrations: ClassroomIntegration[] = [];
  const syncStates: ClassroomSyncState[] = [];
  // Nenhuma publicação pré-fabricada: a jornada demonstrativa começa com a
  // Mission ainda não publicada — quem publica é o Professor, ao vivo (M21).
  const assignments: MissionAssignment[] = [];
  const reviews: MissionReview[] = [];

  return {
    institutions: {
      async getById(id) {
        return id === DEMO_INSTITUTION.id ? DEMO_INSTITUTION : null;
      },
      async list() {
        return [DEMO_INSTITUTION];
      },
    },
    academicYears: {
      async listByInstitution(institutionId) {
        return DEMO_ACADEMIC_YEAR.institutionId === institutionId
          ? [DEMO_ACADEMIC_YEAR]
          : [];
      },
    },
    teachers: {
      async listByInstitution(institutionId) {
        return DEMO_TEACHER.institutionId === institutionId
          ? [DEMO_TEACHER]
          : [];
      },
    },
    classrooms: {
      async listByInstitution(institutionId, academicYearId) {
        return classrooms.filter(
          (c) =>
            c.institutionId === institutionId &&
            (!academicYearId || c.academicYearId === academicYearId),
        );
      },
      async getById(institutionId, id) {
        return (
          classrooms.find(
            (c) => c.institutionId === institutionId && c.id === id,
          ) ?? null
        );
      },
      async create(institutionId, classroom) {
        classrooms.push({ ...classroom, institutionId });
      },
    },
    students: {
      async listByClassroom(institutionId, classroomId) {
        const ids = new Set(
          enrollments
            .filter(
              (e) =>
                e.institutionId === institutionId &&
                e.classroomId === classroomId,
            )
            .map((e) => e.studentId),
        );
        return students.filter(
          (s) => s.institutionId === institutionId && ids.has(s.id),
        );
      },
      async findByEmail(institutionId, email) {
        const normalized = email.trim().toLowerCase();
        return (
          students.find(
            (s) =>
              s.institutionId === institutionId &&
              s.email?.toLowerCase() === normalized,
          ) ?? null
        );
      },
      async create(institutionId, student) {
        students.push({ ...student, institutionId });
      },
    },
    enrollments: {
      async listByClassroom(institutionId, classroomId) {
        return enrollments.filter(
          (e) =>
            e.institutionId === institutionId && e.classroomId === classroomId,
        );
      },
      async create(institutionId, enrollment) {
        enrollments.push({ ...enrollment, institutionId });
      },
    },
    missions: {
      async list() {
        return [DEMO_MISSION_RECORD];
      },
    },
    missionProgress: {
      async listByClassroomMission(institutionId, classroomId, missionId) {
        return progress.filter(
          (p) =>
            p.institutionId === institutionId &&
            p.classroomId === classroomId &&
            p.missionId === missionId,
        );
      },
      async save(institutionId, item) {
        const index = progress.findIndex(
          (p) => p.institutionId === institutionId && p.id === item.id,
        );
        if (index >= 0) progress[index] = { ...item, institutionId };
        else progress.push({ ...item, institutionId });
      },
    },
    productions: {
      async listByStudent(institutionId, studentId) {
        return productions.filter(
          (p) =>
            p.institutionId === institutionId && p.studentId === studentId,
        );
      },
      async listByClassroomMission(institutionId, classroomId, missionId) {
        return productions.filter(
          (p) =>
            p.institutionId === institutionId &&
            p.classroomId === classroomId &&
            p.missionId === missionId,
        );
      },
      async save(institutionId, item) {
        const index = productions.findIndex(
          (p) => p.institutionId === institutionId && p.id === item.id,
        );
        if (index >= 0) productions[index] = { ...item, institutionId };
        else productions.push({ ...item, institutionId });
      },
    },
    reflections: {
      async listByStudent(institutionId, studentId) {
        return reflections.filter(
          (r) =>
            r.institutionId === institutionId && r.studentId === studentId,
        );
      },
      async listByClassroomMission(institutionId, classroomId, missionId) {
        return reflections.filter(
          (r) =>
            r.institutionId === institutionId &&
            r.classroomId === classroomId &&
            r.missionId === missionId,
        );
      },
      async save(institutionId, item) {
        // Diário é append-only (DOMAIN_MODEL.md) — save nunca sobrescreve.
        reflections.push({ ...item, institutionId });
      },
    },
    classroomIntegrations: {
      async listByInstitution(institutionId) {
        return integrations.filter((i) => i.institutionId === institutionId);
      },
    },
    classroomSyncStates: {
      async listByInstitution(institutionId) {
        return syncStates.filter((s) => s.institutionId === institutionId);
      },
      async getByClassroom(institutionId, classroomId) {
        return (
          syncStates.find(
            (s) =>
              s.institutionId === institutionId && s.classroomId === classroomId,
          ) ?? null
        );
      },
      async save(institutionId, state) {
        const index = syncStates.findIndex(
          (s) => s.institutionId === institutionId && s.id === state.id,
        );
        if (index >= 0) syncStates[index] = { ...state, institutionId };
        else syncStates.push({ ...state, institutionId });
      },
    },
    missionAssignments: {
      async listByClassroom(institutionId, classroomId) {
        return assignments.filter(
          (a) =>
            a.institutionId === institutionId && a.classroomId === classroomId,
        );
      },
      async getById(institutionId, id) {
        return (
          assignments.find(
            (a) => a.institutionId === institutionId && a.id === id,
          ) ?? null
        );
      },
      async save(institutionId, assignment) {
        const index = assignments.findIndex(
          (a) => a.institutionId === institutionId && a.id === assignment.id,
        );
        if (index >= 0) assignments[index] = { ...assignment, institutionId };
        else assignments.push({ ...assignment, institutionId });
      },
    },
    missionReviews: {
      async listByClassroomMission(institutionId, classroomId, missionId) {
        return reviews.filter(
          (r) =>
            r.institutionId === institutionId &&
            r.classroomId === classroomId &&
            r.missionId === missionId,
        );
      },
      async listByStudent(institutionId, studentId) {
        return reviews.filter(
          (r) =>
            r.institutionId === institutionId && r.studentId === studentId,
        );
      },
      async save(institutionId, review) {
        const index = reviews.findIndex(
          (r) =>
            r.institutionId === institutionId &&
            r.classroomId === review.classroomId &&
            r.studentId === review.studentId &&
            r.missionId === review.missionId,
        );
        if (index >= 0) reviews[index] = { ...review, institutionId };
        else reviews.push({ ...review, institutionId });
      },
    },
  };
}
