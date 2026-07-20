/**
 * Acompanhamento de turma sobre a arquitetura institucional (M17 —
 * Learning Lifecycle) — implementa o mesmo contrato `ClassMonitorReader`
 * (`modules/classroom`) que `simulated-class-monitor` implementava,
 * agora lendo `Student`/`Enrollment`/`MissionProgress`/`Production`/
 * `Reflection` de `modules/platform` em vez de um array fixo. Mesma UI
 * (`ClassPanel`) continua funcionando sem alteração — só a fonte trocou
 * (D-001: trocar injeção, nunca a interface).
 */

import type { ClassMonitorReader, StudentMissionSnapshot } from "@/modules/classroom";

import type { PlatformRepositories } from "../domain/repositories";

export function createInstitutionalClassMonitor(
  repositories: PlatformRepositories,
  institutionId: string,
  classroomId: string,
): ClassMonitorReader {
  return {
    async listByMission(missionId) {
      const [students, progress, productions, reflections, reviews] =
        await Promise.all([
          repositories.students.listByClassroom(institutionId, classroomId),
          repositories.missionProgress.listByClassroomMission(
            institutionId,
            classroomId,
            missionId,
          ),
          repositories.productions.listByClassroomMission(
            institutionId,
            classroomId,
            missionId,
          ),
          repositories.reflections.listByClassroomMission(
            institutionId,
            classroomId,
            missionId,
          ),
          repositories.missionReviews.listByClassroomMission(
            institutionId,
            classroomId,
            missionId,
          ),
        ]);

      const snapshots: StudentMissionSnapshot[] = students.map((student) => {
        const studentProgress = progress.find((p) => p.studentId === student.id);
        const production = productions.find((p) => p.studentId === student.id);
        const reflection = reflections.find((r) => r.studentId === student.id);
        const review = reviews.find((r) => r.studentId === student.id);
        return {
          studentId: student.id,
          studentName: student.name,
          status: review ? "avaliado" : (studentProgress?.status ?? "nao_acessou"),
          lastAccessAt: studentProgress?.lastAccessAt ?? null,
          production: production?.content ?? null,
          reflection: reflection?.text ?? null,
          review: review
            ? {
                grade: review.grade,
                observedCriteria: review.observedCriteria,
                feedback: review.feedback,
                reviewedAt: review.reviewedAt,
                reviewerId: review.reviewerId,
                reviewerName: review.reviewerName,
              }
            : null,
        };
      });

      return snapshots.sort((a, b) => a.studentName.localeCompare(b.studentName));
    },
  };
}
