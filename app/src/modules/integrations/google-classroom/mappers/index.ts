/**
 * Mappers — a fronteira do módulo. Traduzem:
 *   DTO cru do Google  →  entidade Google (types/)
 *   entidade Google    →  tipos genéricos de importação (ImportProvider)
 *
 * É aqui, e só aqui, que o formato do Google encosta no formato do IAH.
 * Trocar o Google por Microsoft/Moodle = escrever outro mapper, sem
 * tocar em nada da plataforma (docs/IMPORT_ARCHITECTURE.md).
 */

import type { ImportedClassroom, ImportedStudent } from "@/modules/integrations";
import type {
  GoogleAssignmentDto,
  GoogleCourseDto,
  GoogleStudentDto,
  GoogleTeacherDto,
} from "../dto";
import type {
  GoogleAssignment,
  GoogleCourse,
  GoogleCourseState,
  GoogleStudent,
  GoogleTeacher,
} from "../types";

const COURSE_STATES: GoogleCourseState[] = [
  "ACTIVE",
  "ARCHIVED",
  "PROVISIONED",
  "DECLINED",
];

function toCourseState(value: string | undefined): GoogleCourseState {
  return COURSE_STATES.find((s) => s === value) ?? "PROVISIONED";
}

export function toGoogleCourse(dto: GoogleCourseDto): GoogleCourse {
  return {
    id: dto.id,
    name: dto.name,
    section: dto.section ?? null,
    state: toCourseState(dto.courseState),
    ownerId: dto.ownerId ?? "",
  };
}

export function toGoogleStudent(dto: GoogleStudentDto): GoogleStudent {
  return {
    id: dto.userId,
    courseId: dto.courseId,
    fullName: dto.profile?.name?.fullName ?? "(sem nome)",
    email: dto.profile?.emailAddress ?? null,
  };
}

export function toGoogleTeacher(dto: GoogleTeacherDto): GoogleTeacher {
  return {
    id: dto.userId,
    courseId: dto.courseId,
    fullName: dto.profile?.name?.fullName ?? "(sem nome)",
    email: dto.profile?.emailAddress ?? null,
  };
}

export function toGoogleAssignment(dto: GoogleAssignmentDto): GoogleAssignment {
  return {
    id: dto.id,
    courseId: dto.courseId,
    title: dto.title ?? "(sem título)",
    state: dto.state === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    dueAt: toDueAt(dto),
  };
}

/** O Google separa data e hora de entrega em dois objetos parciais. */
function toDueAt(dto: GoogleAssignmentDto): string | null {
  const { year, month, day } = dto.dueDate ?? {};
  if (!year || !month || !day) return null;
  const hours = dto.dueTime?.hours ?? 0;
  const minutes = dto.dueTime?.minutes ?? 0;
  return new Date(Date.UTC(year, month - 1, day, hours, minutes)).toISOString();
}

/** Turma do Google → candidato genérico de importação. */
export function toImportedClassroom(course: GoogleCourse): ImportedClassroom {
  return {
    externalId: course.id,
    name: course.section ? `${course.name} · ${course.section}` : course.name,
  };
}

/** Aluno do Google → candidato genérico de importação. */
export function toImportedStudent(student: GoogleStudent): ImportedStudent {
  return {
    externalId: student.id,
    name: student.fullName,
    email: student.email,
  };
}
