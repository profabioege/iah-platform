import type { CorrelatedLesson, CurriculumConnection } from "./entities";

export interface CurriculumConnectionRepository {
  getById(institutionId: string, id: string): Promise<CurriculumConnection | null>;
  listByTeacher(institutionId: string, teacherId: string): Promise<CurriculumConnection[]>;
  save(institutionId: string, connection: CurriculumConnection): Promise<void>;
}

export interface CorrelatedLessonRepository {
  getByConnectionId(curriculumConnectionId: string): Promise<CorrelatedLesson | null>;
  getByGeneratedMaterialId(generatedMaterialId: string): Promise<CorrelatedLesson | null>;
  save(lesson: CorrelatedLesson): Promise<void>;
}

export interface ConexoesIahRepositories {
  connections: CurriculumConnectionRepository;
  correlatedLessons: CorrelatedLessonRepository;
}
