/**
 * Ensaio de recuperação em ambiente isolado (banco efêmero): copia os
 * dados do piloto, apaga tudo, restaura num banco vazio e confere que
 * contas, matrículas, entregas e o isolamento voltam iguais. Também
 * prova que a restauração recusa banco com dados (nunca mistura).
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  adminDb,
  credentialsFrom,
  loginAs,
  logout,
  MISSION,
  OUTRA,
  PILOT,
  provisionPilotFixtures,
  resetPilotDatabase,
} from "./support/pilot-fixtures.mjs";

const { exportPilotData, restorePilotData, countPilotRows } = await import("../../scripts/pilot-backup-lib.mjs");

const aluno01 = "aluno.instsinteticoaaluno01@sintetico-a.test";
const ID_ALUNO_01 = "inst-sintetico-a-aluno-01";
let senhas;

async function cicloComoAluno() {
  const { getRequestRepositories } = await import("@/modules/platform/infrastructure/request-repositories");
  const { createLearningCycleService, createMissionPublishingService } = await import("@/modules/platform");
  return { repos: await getRequestRepositories(), createLearningCycleService, createMissionPublishingService };
}

before(async () => {
  await resetPilotDatabase();
  senhas = credentialsFrom((await provisionPilotFixtures()).a);
});
after(async () => {
  logout();
  await resetPilotDatabase();
});

test("cópia → banco apagado → restauração devolve tudo, e o login continua valendo", async () => {
  // Professor publica; aluno entrega.
  await loginAs(PILOT.teacher.email, senhas.get(PILOT.teacher.email));
  let ctx = await cicloComoAluno();
  await ctx.createMissionPublishingService(ctx.repos).publish({
    institutionId: PILOT.institution.id,
    classroomId: PILOT.classroom.id,
    missionId: MISSION.id,
    lessonId: null,
  });
  await loginAs(aluno01, senhas.get(aluno01));
  ctx = await cicloComoAluno();
  const escopo = { institutionId: PILOT.institution.id, classroomId: PILOT.classroom.id, studentId: ID_ALUNO_01, missionId: MISSION.id };
  const ciclo = ctx.createLearningCycleService(ctx.repos);
  await ciclo.saveProductionDraft(escopo, "Produção antes da cópia");
  await ciclo.setProductionDelivered(escopo, true);
  logout();

  const copia = await exportPilotData(adminDb);
  assert.equal(copia.counts.students, PILOT.studentCount + OUTRA.studentCount);
  assert.equal(copia.counts.productions, 1);

  // Destino com dados: recusado, nada muda.
  await assert.rejects(() => restorePilotData(adminDb, copia), /não está vazio/);

  await resetPilotDatabase();
  const vazio = await countPilotRows(adminDb);
  assert.ok(Object.values(vazio).every((n) => n === 0));

  const depois = await restorePilotData(adminDb, copia);
  for (const [tabela, n] of Object.entries(copia.counts)) assert.equal(depois[tabela], n, tabela);

  // A conta restaurada entra com a mesma senha e retoma o trabalho.
  const ator = await loginAs(aluno01, senhas.get(aluno01));
  assert.ok(ator, "login depois da restauração");
  ctx = await cicloComoAluno();
  const trabalho = await ctx.createLearningCycleService(ctx.repos).getStudentWork(escopo);
  assert.equal(trabalho.production, "Produção antes da cópia");
  assert.ok(trabalho.productionDeliveredAt);

  // O isolamento continua: o aluno da escola A não lê a turma da escola B.
  const outra = await ctx.repos.productions.listByClassroomMission(
    OUTRA.institution.id,
    OUTRA.classroom.id,
    MISSION.id,
  );
  assert.equal(outra.length, 0);
  logout();
});
