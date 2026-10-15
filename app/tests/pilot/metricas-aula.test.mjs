/**
 * Indicadores agregados da aula: o script lê o banco e devolve só
 * contagens e tempos — nunca nome, e-mail ou texto de aluno.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test, { after, before } from "node:test";

import {
  credentialsFrom,
  loginAs,
  logout,
  MISSION,
  PILOT,
  provisionPilotFixtures,
  resetPilotDatabase,
} from "./support/pilot-fixtures.mjs";

let senhas;
before(async () => {
  await resetPilotDatabase();
  senhas = credentialsFrom((await provisionPilotFixtures()).a);
});
after(async () => {
  logout();
  await resetPilotDatabase();
});

test("indicadores da aula: acessos, entregas e tempos, sem dado identificável", async () => {
  const inicio = new Date(Date.now() - 60_000).toISOString();
  const { getRequestRepositories } = await import("@/modules/platform/infrastructure/request-repositories");
  const { createLearningCycleService, createMissionPublishingService } = await import("@/modules/platform");

  await loginAs(PILOT.teacher.email, senhas.get(PILOT.teacher.email));
  await createMissionPublishingService(await getRequestRepositories()).publish({
    institutionId: PILOT.institution.id, classroomId: PILOT.classroom.id, missionId: MISSION.id, lessonId: null,
  });
  for (const n of ["01", "02"]) {
    const email = `aluno.instsinteticoaaluno${n}@sintetico-a.test`;
    await loginAs(email, senhas.get(email));
    const ciclo = createLearningCycleService(await getRequestRepositories());
    const escopo = { institutionId: PILOT.institution.id, classroomId: PILOT.classroom.id, studentId: `inst-sintetico-a-aluno-${n}`, missionId: MISSION.id };
    await ciclo.saveProductionDraft(escopo, `Texto ${n}`);
    if (n === "01") {
      await ciclo.setProductionDelivered(escopo, true);
      await ciclo.saveReflectionDraft(escopo, "Reflexão");
      await ciclo.setReflectionRecorded(escopo, true);
    }
  }
  await loginAs("aluno.instsinteticoaaluno03@sintetico-a.test", "senha-errada");
  logout();

  const saida = execFileSync(
    process.execPath,
    [
      "scripts/pilot-metricas-aula.mjs",
      `--institution=${PILOT.institution.id}`,
      `--turma=${PILOT.classroom.id}`,
      `--missao=${MISSION.id}`,
      `--inicio=${inicio}`,
      `--fim=${new Date(Date.now() + 60_000).toISOString()}`,
    ],
    { env: process.env, encoding: "utf8" },
  );
  const r = JSON.parse(saida);
  assert.equal(r.matriculados, PILOT.studentCount);
  assert.equal(r.acessos.alunosComLoginNaJanela, 2);
  assert.equal(r.acessos.alunosQueTentaramENaoEntraram, 1);
  assert.equal(r.missao.iniciaram, 2);
  assert.equal(r.missao.producoesEntregues, 1);
  assert.equal(r.missao.concluiram, 1);
  assert.doesNotMatch(saida, /@|Texto 0|Reflexão/, "saída sem e-mail nem texto de aluno");
});
