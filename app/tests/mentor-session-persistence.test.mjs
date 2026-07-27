import assert from "node:assert/strict";
import test from "node:test";

import { createSeedMentorRepositories } from "../src/modules/mentor/infrastructure/seed/seed-repositories.ts";
import {
  createMentorSessionService,
  findAssignmentForMission,
} from "../src/modules/mentor/services/mentor-session-service.ts";

function context(stepLabel = "Investigação") {
  return {
    missionId: "mission-1",
    missionTitle: "A Fábrica de Notícias",
    guidingQuestion: "Quem decide o que é verdade?",
    objective: "Investigar a origem de uma notícia.",
    currentStep: { number: 4, label: stepLabel },
  };
}

function scope(overrides = {}) {
  return {
    institutionId: "inst-1",
    missionId: "mission-1",
    assignmentId: "assignment-1",
    studentId: "student-1",
    ...overrides,
  };
}

// 1. Criação de sessão
test("cria uma sessão ativa para aluno x atribuição", async () => {
  const service = createMentorSessionService(createSeedMentorRepositories());
  const session = await service.getOrCreateSession(scope());

  assert.equal(session.institutionId, "inst-1");
  assert.equal(session.missionId, "mission-1");
  assert.equal(session.assignmentId, "assignment-1");
  assert.equal(session.studentId, "student-1");
  assert.equal(session.status, "active");
  assert.equal(session.requiresTeacherIntervention, false);
});

// 2. Reutilização da sessão ativa
test("reabrir a missão reutiliza a sessão ativa (não cria outra)", async () => {
  const service = createMentorSessionService(createSeedMentorRepositories());
  const first = await service.getOrCreateSession(scope());
  const second = await service.getOrCreateSession(scope());

  assert.equal(second.id, first.id);
  assert.equal(second.startedAt, first.startedAt);
});

// 3. Isolamento por estudante
test("dois alunos na mesma atribuição têm sessões distintas e isoladas", async () => {
  const service = createMentorSessionService(createSeedMentorRepositories());
  const sessionA = await service.getOrCreateSession(scope({ studentId: "student-a" }));
  const sessionB = await service.getOrCreateSession(scope({ studentId: "student-b" }));

  assert.notEqual(sessionA.id, sessionB.id);
  await service.sendMessage({
    scope: scope({ studentId: "student-a" }),
    sessionId: sessionA.id,
    clientMessageId: "msg-a-1",
    content: "Dúvida da aluna A",
    history: [],
    context: context(),
    pedagogicalStage: "Investigação",
  });

  const messagesB = await service.listMessages("inst-1", sessionB.id);
  assert.equal(messagesB.length, 0, "aluno B não deve ver mensagens do aluno A");
});

// 4. Isolamento institucional
test("mesma atribuição/aluno em instituições diferentes não compartilham sessão", async () => {
  const service = createMentorSessionService(createSeedMentorRepositories());
  const sessionInstX = await service.getOrCreateSession(scope({ institutionId: "inst-x" }));
  const sessionInstY = await service.getOrCreateSession(scope({ institutionId: "inst-y" }));

  assert.notEqual(sessionInstX.id, sessionInstY.id);

  await service.sendMessage({
    scope: scope({ institutionId: "inst-x" }),
    sessionId: sessionInstX.id,
    clientMessageId: "msg-x-1",
    content: "Mensagem da instituição X",
    history: [],
    context: context(),
    pedagogicalStage: "Investigação",
  });

  const messagesY = await service.listMessages("inst-y", sessionInstY.id);
  assert.equal(messagesY.length, 0, "instituição Y não deve ver dados da instituição X");
});

// 5. Ordem das mensagens
test("mensagens ficam em ordem determinística (sequence_number)", async () => {
  const repositories = createSeedMentorRepositories();
  const service = createMentorSessionService(repositories);
  const session = await service.getOrCreateSession(scope());

  await repositories.messages.append("inst-1", {
    id: "m1",
    sessionId: session.id,
    role: "student",
    content: "primeira",
    pedagogicalStage: null,
    supportLevel: null,
  });
  await repositories.messages.append("inst-1", {
    id: "m2",
    sessionId: session.id,
    role: "mentor",
    content: "segunda",
    pedagogicalStage: null,
    supportLevel: null,
  });
  await repositories.messages.append("inst-1", {
    id: "m3",
    sessionId: session.id,
    role: "student",
    content: "terceira",
    pedagogicalStage: null,
    supportLevel: null,
  });

  const messages = await service.listMessages("inst-1", session.id);
  assert.deepEqual(
    messages.map((m) => m.sequenceNumber),
    [1, 2, 3],
  );
  assert.deepEqual(
    messages.map((m) => m.content),
    ["primeira", "segunda", "terceira"],
  );
});

// 6 & 7. Persistência da mensagem do estudante e da resposta do Mentor
test("sendMessage persiste a mensagem do estudante e a resposta do Mentor", async () => {
  const service = createMentorSessionService(createSeedMentorRepositories());
  const session = await service.getOrCreateSession(scope());

  const { studentMessage, mentorMessage } = await service.sendMessage({
    scope: scope(),
    sessionId: session.id,
    clientMessageId: "client-msg-1",
    content: "Dê uma pista para eu começar",
    history: [],
    context: context("Investigação"),
    pedagogicalStage: "Investigação",
  });

  assert.equal(studentMessage.role, "student");
  assert.equal(studentMessage.content, "Dê uma pista para eu começar");
  assert.equal(mentorMessage.role, "mentor");
  assert.ok(mentorMessage.content.length > 0);

  const stored = await service.listMessages("inst-1", session.id);
  assert.equal(stored.length, 2);
  assert.equal(stored[0].role, "student");
  assert.equal(stored[1].role, "mentor");
});

// 8. Recuperação após reabertura
test("reabrir a missão recupera o histórico já existente", async () => {
  const repositories = createSeedMentorRepositories();
  const service = createMentorSessionService(repositories);
  const session = await service.getOrCreateSession(scope());
  await service.sendMessage({
    scope: scope(),
    sessionId: session.id,
    clientMessageId: "client-msg-1",
    content: "Como começo a investigar?",
    history: [],
    context: context(),
    pedagogicalStage: "Investigação",
  });

  // Simula reabertura: nova chamada independente, mesma atribuição/aluno.
  const reopened = await service.getOrCreateSession(scope());
  const history = await service.listMessages("inst-1", reopened.id);

  assert.equal(reopened.id, session.id);
  assert.equal(history.length, 2);
  assert.equal(history[0].content, "Como começo a investigar?");
});

// 9. Ausência de saudação duplicada
test("sessão sem mensagens está vazia (saudação só no cliente); com histórico, não", async () => {
  const service = createMentorSessionService(createSeedMentorRepositories());
  const session = await service.getOrCreateSession(scope());

  const beforeAnyMessage = await service.listMessages("inst-1", session.id);
  assert.equal(beforeAnyMessage.length, 0, "sem mensagens, o cliente deve mostrar a saudação");

  await service.sendMessage({
    scope: scope(),
    sessionId: session.id,
    clientMessageId: "client-msg-1",
    content: "Uma dúvida",
    history: [],
    context: context(),
    pedagogicalStage: "Investigação",
  });

  const afterMessage = await service.listMessages("inst-1", session.id);
  assert.ok(afterMessage.length > 0, "com histórico, o cliente não deve repetir a saudação");
});

// 10. Falha de persistência
test("falha ao persistir a resposta do Mentor não perde a mensagem do estudante já enviada", async () => {
  const real = createSeedMentorRepositories();
  const failingOnMentorReply = {
    sessions: real.sessions,
    messages: {
      ...real.messages,
      async append(institutionId, message) {
        if (message.role === "mentor") {
          throw new Error("Falha simulada ao salvar a resposta do Mentor");
        }
        return real.messages.append(institutionId, message);
      },
    },
  };
  const service = createMentorSessionService(failingOnMentorReply);
  const session = await service.getOrCreateSession(scope());

  await assert.rejects(
    service.sendMessage({
      scope: scope(),
      sessionId: session.id,
      clientMessageId: "client-msg-1",
      content: "Mensagem que deve sobreviver à falha",
      history: [],
      context: context(),
      pedagogicalStage: "Investigação",
    }),
  );

  const stored = await real.messages.listBySession("inst-1", session.id);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].role, "student");
  assert.equal(stored[0].content, "Mensagem que deve sobreviver à falha");
});

// 11. Atribuição inexistente
test("sem atribuição publicada para a Missão, nenhuma atribuição é resolvida", () => {
  const assignments = [
    { id: "a1", institutionId: "inst-1", classroomId: "c1", missionId: "outra-missao", lessonId: null, missionVersion: 1, publishedAt: "2026-07-01T00:00:00Z", dueAt: null, status: "published", closedAt: null, externalAssignmentId: null },
    { id: "a2", institutionId: "inst-1", classroomId: "c1", missionId: "mission-1", lessonId: null, missionVersion: 1, publishedAt: "2026-07-01T00:00:00Z", dueAt: null, status: "draft", closedAt: null, externalAssignmentId: null },
  ];
  assert.equal(findAssignmentForMission(assignments, "mission-1"), null);

  const publishedAssignments = [
    ...assignments,
    { id: "a3", institutionId: "inst-1", classroomId: "c1", missionId: "mission-1", lessonId: null, missionVersion: 1, publishedAt: "2026-07-01T00:00:00Z", dueAt: null, status: "published", closedAt: null, externalAssignmentId: null },
  ];
  const found = findAssignmentForMission(publishedAssignments, "mission-1");
  assert.equal(found?.id, "a3");
});

// 12. Sessão duplicada
test("criar a sessão duas vezes com o mesmo id não duplica nem sobrescreve", async () => {
  const repositories = createSeedMentorRepositories();
  const service = createMentorSessionService(repositories);
  const first = await service.getOrCreateSession(scope());

  // Tenta recriar diretamente no repositório com dado diferente — deve ser ignorado.
  await repositories.sessions.create("inst-1", {
    ...first,
    startedAt: "2099-01-01T00:00:00Z",
    requiresTeacherIntervention: true,
  });

  const stillActive = await repositories.sessions.findActiveByAssignment(
    "inst-1",
    "assignment-1",
    "student-1",
  );
  assert.equal(stillActive.startedAt, first.startedAt);
  assert.equal(stillActive.requiresTeacherIntervention, false);
});

// 13. Acesso não autorizado
test("mensagens não são visíveis fora da instituição correta, mesmo com o id certo da sessão", async () => {
  const repositories = createSeedMentorRepositories();
  const service = createMentorSessionService(repositories);
  const session = await service.getOrCreateSession(scope());
  await service.sendMessage({
    scope: scope(),
    sessionId: session.id,
    clientMessageId: "client-msg-1",
    content: "Mensagem privada do aluno",
    history: [],
    context: context(),
    pedagogicalStage: "Investigação",
  });

  const leaked = await repositories.messages.listBySession("inst-outro", session.id);
  assert.equal(leaked.length, 0);
});

// 14. Execução com fallback determinístico
test("o motor demonstrativo (fallback) responde através da mesma camada de persistência", async () => {
  const service = createMentorSessionService(createSeedMentorRepositories());
  const session = await service.getOrCreateSession(scope());

  const { mentorMessage } = await service.sendMessage({
    scope: scope(),
    sessionId: session.id,
    clientMessageId: "client-msg-1",
    content: "Dê uma pista para eu começar",
    history: [],
    context: context("Investigação"),
    pedagogicalStage: "Investigação",
  });

  // Resposta determinística conhecida do motor de demonstração
  // (demo-mentor-provider.ts, ramo "pista"/"começar").
  assert.match(mentorMessage.content, /pista para a etapa/i);
  assert.match(mentorMessage.content, /Investigação/);
});
