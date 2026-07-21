import { getDefaultRepositories, type Institution } from "@/modules/platform";

/**
 * "Rede" do Mantenedor (D-046): hoje é simplesmente a lista de
 * instituições existentes — sem tabela de organização/rede nova (fora
 * de escopo desta etapa, a spec autoriza tratar isso como rede
 * demonstrativa com uma unidade ativa). Quando existir mais de uma
 * instituição, este mesmo cálculo já funciona para todas.
 */
export interface UnitStats {
  institution: Institution;
  teacherCount: number;
  studentCount: number;
  activeStudents: number;
  utilizationPercent: number;
  hasActivity: boolean;
}

export async function loadNetworkUnits(): Promise<UnitStats[]> {
  const repositories = getDefaultRepositories();
  const institutions = await repositories.institutions.list();
  const missionRecords = await repositories.missions.list();
  const activeMissionId = missionRecords[0]?.id ?? "";

  return Promise.all(
    institutions.map(async (institution) => {
      const [teachers, classrooms] = await Promise.all([
        repositories.teachers.listByInstitution(institution.id),
        repositories.classrooms.listByInstitution(institution.id),
      ]);

      const classroomStats = await Promise.all(
        classrooms.map(async (classroom) => {
          const [students, progress, missionAssignments] = await Promise.all([
            repositories.students.listByClassroom(institution.id, classroom.id),
            activeMissionId
              ? repositories.missionProgress.listByClassroomMission(
                  institution.id,
                  classroom.id,
                  activeMissionId,
                )
              : Promise.resolve([]),
            repositories.missionAssignments.listByClassroom(institution.id, classroom.id),
          ]);
          return {
            total: students.length,
            active: progress.filter((item) => item.status !== "nao_acessou").length,
            hasActivity: missionAssignments.length > 0,
          };
        }),
      );

      const studentCount = classroomStats.reduce((sum, c) => sum + c.total, 0);
      const activeStudents = classroomStats.reduce((sum, c) => sum + c.active, 0);

      return {
        institution,
        teacherCount: teachers.length,
        studentCount,
        activeStudents,
        utilizationPercent:
          studentCount > 0 ? Math.round((activeStudents / studentCount) * 100) : 0,
        hasActivity: classroomStats.some((c) => c.hasActivity),
      };
    }),
  );
}
