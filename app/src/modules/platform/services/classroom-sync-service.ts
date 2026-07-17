/**
 * Serviço de sincronização de Turmas com uma origem externa.
 *
 * Fluxo (docs/GOOGLE_CLASSROOM_INTEGRATION.md):
 *   selecionar turma → buscar alunos → comparar com o banco →
 *   criar inexistentes → atualizar existentes → registrar sincronização
 *
 * Não duplica o ImportService: compõe-o. O ImportService resolve
 * candidatos + reconciliação por e-mail + gravação; este serviço
 * acrescenta o que é próprio de sincronizar (repetir sobre uma turma já
 * importada e registrar o resultado em ClassroomSyncState).
 *
 * É genérico sobre ImportProvider — não conhece Google, Microsoft nem
 * CSV (docs/IMPORT_ARCHITECTURE.md).
 */

import type { ImportProvider } from "@/modules/integrations";
import type { ClassroomSyncState } from "../domain/entities";
import type { PlatformRepositories } from "../domain/repositories";
import { createImportService } from "./import-service";

export interface SyncResult {
  classroomId: string;
  createdStudents: number;
  updatedStudents: number;
  studentCount: number;
  syncedAt: string;
}

export function createClassroomSyncService(
  repositories: PlatformRepositories,
) {
  const importService = createImportService(repositories);

  return {
    /**
     * Sincroniza uma turma externa já importada. Alunos novos são
     * criados; alunos já conhecidos (mesmo e-mail) são reconciliados,
     * nunca duplicados.
     */
    async syncClassroom(
      provider: ImportProvider,
      params: {
        institutionId: string;
        academicYearId: string;
        externalCourseId: string;
        assignmentCount?: number;
      },
    ): Promise<SyncResult> {
      const { institutionId, academicYearId, externalCourseId } = params;

      try {
        const result = await importService.importClassroom(
          provider,
          institutionId,
          academicYearId,
          externalCourseId,
        );
        const syncedAt = new Date().toISOString();

        await this.recordSync(institutionId, {
          id: `sync-${provider.id}-${externalCourseId}`,
          institutionId,
          classroomId: result.classroomId,
          provider: provider.id,
          externalCourseId,
          status: "synced",
          lastSyncAt: syncedAt,
          studentCount: result.enrollments,
          assignmentCount: params.assignmentCount ?? 0,
          lastError: null,
        });

        return {
          classroomId: result.classroomId,
          createdStudents: result.createdStudents,
          updatedStudents: result.reconciledStudents,
          studentCount: result.enrollments,
          syncedAt,
        };
      } catch (error) {
        // Falha de origem externa nunca some silenciosamente: fica
        // registrada no estado da turma (degradação graciosa, D-019).
        const previous = await repositories.classroomSyncStates.getByClassroom(
          institutionId,
          `class-${provider.id}-${externalCourseId}`,
        );
        await this.recordSync(institutionId, {
          id: `sync-${provider.id}-${externalCourseId}`,
          institutionId,
          classroomId: `class-${provider.id}-${externalCourseId}`,
          provider: provider.id,
          externalCourseId,
          status: "failed",
          lastSyncAt: previous?.lastSyncAt ?? null,
          studentCount: previous?.studentCount ?? 0,
          assignmentCount: previous?.assignmentCount ?? 0,
          lastError: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    async recordSync(
      institutionId: string,
      state: ClassroomSyncState,
    ): Promise<void> {
      await repositories.classroomSyncStates.save(institutionId, state);
    },

    async listSyncStates(institutionId: string): Promise<ClassroomSyncState[]> {
      return repositories.classroomSyncStates.listByInstitution(institutionId);
    },
  };
}
