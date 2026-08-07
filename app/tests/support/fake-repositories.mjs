/**
 * Repositórios falsos em memória — implementam só os métodos que o
 * contexto do Workspace e o serviço de ciclo de aprendizagem chamam.
 *
 * Cada método guarda em `repositories.calls` o `institutionId` que
 * recebeu como PRIMEIRO argumento: é assim que os testes provam que o
 * tenant vem sempre da sessão e nunca de um parâmetro do cliente.
 */

export function createFakeRepositories({
  institution = null,
  academicYears = [],
  classrooms = [],
  productions = [],
  reflections = [],
  missionReviews = [],
} = {}) {
  const calls = [];
  const record = (method, institutionId, extra = {}) => {
    calls.push({ method, institutionId, ...extra });
  };

  const saved = {
    productions: [...productions],
    reflections: [...reflections],
    missionReviews: [...missionReviews],
    missionProgress: [],
  };

  const byClassroomMission = (collection) =>
    async function listByClassroomMission(
      institutionId,
      classroomId,
      missionId,
    ) {
      record(`${collection}.listByClassroomMission`, institutionId, {
        classroomId,
        missionId,
      });
      return saved[collection].filter(
        (row) =>
          row.institutionId === institutionId &&
          row.classroomId === classroomId &&
          row.missionId === missionId,
      );
    };

  const upsert = (collection) =>
    async function save(institutionId, entity) {
      record(`${collection}.save`, institutionId, { entity });
      const index = saved[collection].findIndex((row) => row.id === entity.id);
      if (index >= 0) saved[collection][index] = entity;
      else saved[collection].push(entity);
    };

  return {
    calls,
    saved,
    institutions: {
      async getById(id) {
        record("institutions.getById", id);
        return institution && institution.id === id ? institution : null;
      },
      async list() {
        record("institutions.list", null);
        return institution ? [institution] : [];
      },
    },
    academicYears: {
      async listByInstitution(institutionId) {
        record("academicYears.listByInstitution", institutionId);
        return academicYears.filter(
          (year) => year.institutionId === institutionId,
        );
      },
    },
    classrooms: {
      async listByInstitution(institutionId) {
        record("classrooms.listByInstitution", institutionId);
        return classrooms.filter(
          (classroom) => classroom.institutionId === institutionId,
        );
      },
      async getById(institutionId, id) {
        record("classrooms.getById", institutionId, { id });
        return (
          classrooms.find(
            (classroom) =>
              classroom.institutionId === institutionId && classroom.id === id,
          ) ?? null
        );
      },
    },
    productions: {
      listByClassroomMission: byClassroomMission("productions"),
      save: upsert("productions"),
    },
    reflections: {
      listByClassroomMission: byClassroomMission("reflections"),
      save: upsert("reflections"),
    },
    missionReviews: {
      listByClassroomMission: byClassroomMission("missionReviews"),
      save: upsert("missionReviews"),
    },
    missionProgress: {
      save: upsert("missionProgress"),
    },
  };
}
