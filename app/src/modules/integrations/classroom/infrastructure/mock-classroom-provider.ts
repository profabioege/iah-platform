import type {
  ClassroomProvider,
  ExternalCourse,
  ExternalStudent,
} from "../domain/classroom-provider";

const COURSES: ExternalCourse[] = [
  { id: "curso-demo-1", name: "IA no Ensino Médio · Turma A" },
];

const STUDENTS_BY_COURSE: Record<string, ExternalStudent[]> = {
  "curso-demo-1": [
    { id: "gs-01", name: "Ana Beatriz Souza", email: "ana.souza@escola-demo.edu" },
    { id: "gs-02", name: "Bruno Ferreira Lima", email: "bruno.lima@escola-demo.edu" },
    { id: "gs-03", name: "Carla Mendes Rocha", email: "carla.rocha@escola-demo.edu" },
  ],
};

/**
 * Implementação simulada do {@link ClassroomProvider} — nenhuma chamada
 * real à API do Google. Usada enquanto o projeto Google Cloud não está
 * configurado (ver docs/GOOGLE_WORKSPACE.md).
 */
export const mockClassroomProvider: ClassroomProvider = {
  id: "mock",
  isConfigured: true,
  async listCourses() {
    return COURSES;
  },
  async listStudents(courseId) {
    return STUDENTS_BY_COURSE[courseId] ?? [];
  },
  async publishMission() {
    // Simulado: nenhuma publicação real ocorre nesta fase.
  },
};
