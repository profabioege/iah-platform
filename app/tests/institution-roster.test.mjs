import assert from "node:assert/strict";
import test from "node:test";

import { fetchInstitutionalRoster } from "../src/lib/ai/anonymization/institution-roster.ts";

function fakeRepositories(db) {
  return {
    teachers: {
      async listByInstitution(institutionId) {
        return db.teachers.filter((t) => t.institutionId === institutionId);
      },
    },
    students: {
      async listByClassroom(institutionId, classroomId) {
        return db.students.filter((s) => s.institutionId === institutionId && s.classroomId === classroomId);
      },
    },
  };
}

const DB = {
  teachers: [
    { id: "t1", institutionId: "inst-a", name: "João Pereira", email: "joao@a.edu" },
    { id: "t2", institutionId: "inst-b", name: "Carla Nunes", email: "carla@b.edu" },
  ],
  students: [
    { id: "s1", institutionId: "inst-a", classroomId: "c1", name: "Maria da Silva", email: null },
    { id: "s2", institutionId: "inst-a", classroomId: "c1", name: "Ana Souza", email: null },
    { id: "s3", institutionId: "inst-b", classroomId: "c2", name: "Beatriz Fontoura", email: null },
  ],
};

// 21. isolamento institucional
test("fetchInstitutionalRoster só retorna nomes da instituição pedida", async () => {
  const repositories = fakeRepositories(DB);
  const classroomsInstA = [{ id: "c1" }];
  const roster = await fetchInstitutionalRoster("inst-a", classroomsInstA, repositories);

  const names = roster.map((r) => r.fullName).sort();
  assert.deepEqual(names, ["João Pereira", "Ana Souza", "Maria da Silva"].sort());
  assert.ok(!names.includes("Carla Nunes"));
  assert.ok(!names.includes("Beatriz Fontoura"));
});

test("fetchInstitutionalRoster mapeia papéis corretamente (professor/aluno)", async () => {
  const repositories = fakeRepositories(DB);
  const roster = await fetchInstitutionalRoster("inst-a", [{ id: "c1" }], repositories);

  const teacher = roster.find((r) => r.fullName === "João Pereira");
  const student = roster.find((r) => r.fullName === "Maria da Silva");
  assert.equal(teacher.role, "professor");
  assert.equal(student.role, "aluno");
});

test("fetchInstitutionalRoster com instituição sem turmas/professores devolve lista vazia, sem erro", async () => {
  const repositories = fakeRepositories(DB);
  const roster = await fetchInstitutionalRoster("inst-inexistente", [], repositories);
  assert.deepEqual(roster, []);
});
