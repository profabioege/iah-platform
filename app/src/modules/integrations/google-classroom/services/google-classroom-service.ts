/**
 * ClassroomService real — orquestra a camada de dados (repositories/)
 * e traduz os DTOs crus em entidades (mappers/).
 *
 * A orquestração aqui já é a definitiva: quando o
 * googleClassroomRepository deixar de ser stub (credenciais OAuth
 * existirem — docs/GOOGLE_WORKSPACE.md), este serviço passa a funcionar
 * sem nenhuma alteração. É por isso que ele não é um stub: o que falta
 * é a camada de baixo, não esta.
 */

import type { ClassroomService, GoogleClassroomRepository } from "../contracts";
import {
  toGoogleAssignment,
  toGoogleCourse,
  toGoogleStudent,
  toGoogleTeacher,
} from "../mappers";
import { googleClassroomRepository } from "../repositories/google-classroom-repository";

export function createGoogleClassroomService(
  repository: GoogleClassroomRepository = googleClassroomRepository,
): ClassroomService {
  const service: ClassroomService = {
    id: "google",
    isSimulated: false,
    get isConfigured() {
      return repository.isConfigured;
    },
    async listCourses() {
      return (await repository.fetchCourses()).map(toGoogleCourse);
    },
    async listStudents(courseId) {
      return (await repository.fetchStudents(courseId)).map(toGoogleStudent);
    },
    async listTeachers(courseId) {
      return (await repository.fetchTeachers(courseId)).map(toGoogleTeacher);
    },
    async listAssignments(courseId) {
      return (await repository.fetchAssignments(courseId)).map(
        toGoogleAssignment,
      );
    },
    async fetchClassroom(courseId) {
      const [courses, students, teachers, assignments] = await Promise.all([
        service.listCourses(),
        service.listStudents(courseId),
        service.listTeachers(courseId),
        service.listAssignments(courseId),
      ]);
      const course = courses.find((c) => c.id === courseId);
      if (!course) {
        throw new Error(`Turma "${courseId}" não encontrada no Google Classroom.`);
      }
      return { course, students, teachers, assignments };
    },
  };
  return service;
}

export const googleClassroomService = createGoogleClassroomService();
