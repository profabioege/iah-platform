/**
 * Serviço de importação — converte candidatos de qualquer ImportProvider
 * em Turma/Aluno/Matrícula internos, através dos contratos de repositório.
 * A UI de importação futura consome só este serviço, sem saber qual
 * provedor está por trás (docs/IMPORT_ARCHITECTURE.md).
 *
 * Regra central: a importação nunca é automática — este serviço expõe a
 * pré-visualização (preview) separada da gravação (importClassroom), para
 * que a tela de revisão humana fique entre as duas.
 */

import type { ImportProvider } from "@/modules/integrations";
import type { Classroom, Enrollment, Student } from "../domain/entities";
import type { PlatformRepositories } from "../domain/repositories";

export interface ImportPreview {
  classroom: { externalId: string; name: string };
  students: Array<{
    externalId: string;
    name: string;
    email: string | null;
    /** Aluno já existente com o mesmo e-mail (reconciliação) — não será duplicado. */
    existingStudentId: string | null;
  }>;
}

export interface ImportResult {
  classroomId: string;
  createdStudents: number;
  reconciledStudents: number;
  enrollments: number;
}

export function createImportService(repositories: PlatformRepositories) {
  return {
    /** Candidatos de uma turma externa, com reconciliação por e-mail já indicada. */
    async previewClassroom(
      provider: ImportProvider,
      institutionId: string,
      externalClassroomId: string,
    ): Promise<ImportPreview> {
      const classrooms = await provider.listClassrooms();
      const classroom = classrooms.find(
        (c) => c.externalId === externalClassroomId,
      );
      if (!classroom) {
        throw new Error(
          `Turma externa "${externalClassroomId}" não encontrada na origem "${provider.id}".`,
        );
      }
      const candidates = await provider.listStudents(externalClassroomId);
      const students = await Promise.all(
        candidates.map(async (candidate) => ({
          ...candidate,
          existingStudentId: candidate.email
            ? (
                await repositories.students.findByEmail(
                  institutionId,
                  candidate.email,
                )
              )?.id ?? null
            : null,
        })),
      );
      return { classroom, students };
    },

    /** Grava a turma revisada no modelo interno. Chamar SÓ após revisão humana. */
    async importClassroom(
      provider: ImportProvider,
      institutionId: string,
      academicYearId: string,
      externalClassroomId: string,
    ): Promise<ImportResult> {
      const preview = await this.previewClassroom(
        provider,
        institutionId,
        externalClassroomId,
      );

      const classroom: Classroom = {
        id: `class-${provider.id}-${externalClassroomId}`,
        institutionId,
        academicYearId,
        name: preview.classroom.name,
        grade: null,
        teacherIds: [],
      };
      await repositories.classrooms.create(institutionId, classroom);

      let createdStudents = 0;
      let reconciledStudents = 0;
      for (const candidate of preview.students) {
        let studentId = candidate.existingStudentId;
        if (studentId) {
          reconciledStudents += 1;
        } else {
          const student: Student = {
            id: `student-${provider.id}-${candidate.externalId}`,
            institutionId,
            name: candidate.name,
            email: candidate.email,
          };
          await repositories.students.create(institutionId, student);
          studentId = student.id;
          createdStudents += 1;
        }
        const enrollment: Enrollment = {
          id: `enr-${classroom.id}-${studentId}`,
          institutionId,
          classroomId: classroom.id,
          studentId,
          status: "active",
          enrolledAt: new Date().toISOString(),
        };
        await repositories.enrollments.create(institutionId, enrollment);
      }

      return {
        classroomId: classroom.id,
        createdStudents,
        reconciledStudents,
        enrollments: preview.students.length,
      };
    },
  };
}
