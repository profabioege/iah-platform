import assert from "node:assert/strict";
import test from "node:test";

import { dataAnonymizer, guardBeforeExternalCall } from "../src/lib/ai/data-anonymizer.ts";

const ROSTER = [
  { fullName: "Maria da Silva", role: "aluno" },
  { fullName: "João Pereira", role: "professor" },
  { fullName: "Ana Souza", role: "aluno" },
  { fullName: "João Costa", role: "aluno" }, // mesmo primeiro nome que "João Pereira" — colisão proposital
];

// 1. nome completo de aluno cadastrado
test("mascara nome completo de aluno cadastrado", () => {
  const result = dataAnonymizer.analyze("A aluna Maria da Silva entregou o trabalho.", { knownNames: ROSTER });
  assert.equal(result.sanitizedText, "A aluna [ALUNO_1] entregou o trabalho.");
  assert.equal(result.safeToSend, true);
  assert.ok(!result.sanitizedText.includes("Maria"));
});

// 2. nome com acento
test("casa nome cadastrado mesmo com diferença de acento no texto", () => {
  const roster = [{ fullName: "José António", role: "aluno" }];
  const result = dataAnonymizer.analyze("Conversei com Jose Antonio ontem.", { knownNames: roster });
  assert.ok(result.sanitizedText.includes("[ALUNO_1]"));
  assert.ok(!result.sanitizedText.toLowerCase().includes("antonio"));
});

// 3. diferença de caixa
test("casa nome cadastrado independente de caixa", () => {
  const result = dataAnonymizer.analyze("falei com MARIA DA SILVA hoje.", { knownNames: ROSTER });
  assert.ok(result.sanitizedText.includes("[ALUNO_1]"));
});

// 4. espaços duplicados
test("casa nome cadastrado com espaços duplicados no texto", () => {
  const result = dataAnonymizer.analyze("A aluna Maria   da    Silva faltou.", { knownNames: ROSTER });
  assert.ok(result.sanitizedText.includes("[ALUNO_1]"));
  assert.ok(!result.sanitizedText.includes("Silva"));
});

// 5. nome de professor cadastrado
test("mascara nome de professor cadastrado com alias de papel correto", () => {
  const result = dataAnonymizer.analyze("O professor João Pereira revisou o plano.", { knownNames: ROSTER });
  assert.ok(result.sanitizedText.includes("[PROFESSOR_1]"));
  assert.ok(!result.sanitizedText.includes("Pereira"));
});

// 6. CPF junto ao nome
test("mascara nome e CPF juntos, resultado seguro", () => {
  const result = dataAnonymizer.analyze("Maria da Silva, CPF 000.000.000-00, faltou.", { knownNames: ROSTER });
  assert.ok(result.sanitizedText.includes("[ALUNO_1]"));
  assert.ok(result.sanitizedText.includes("[CPF removido]"));
  assert.ok(!/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(result.sanitizedText));
  assert.equal(result.safeToSend, true);
});

// 7. e-mail junto ao nome
test("mascara nome e e-mail juntos", () => {
  const result = dataAnonymizer.analyze("Maria da Silva (maria@escola.edu.br) enviou a atividade.", { knownNames: ROSTER });
  assert.ok(result.sanitizedText.includes("[ALUNO_1]"));
  assert.ok(result.sanitizedText.includes("[e-mail removido]"));
  assert.ok(!result.sanitizedText.includes("maria@escola.edu.br"));
});

// 8. "a aluna Maria da Silva" — caso de regressão principal
test('regressão principal: "A aluna Maria da Silva, CPF ..., tem dificuldade com leitura." fica seguro para enviar', () => {
  const result = dataAnonymizer.analyze("A aluna Maria da Silva, CPF 000.000.000-00, tem dificuldade com leitura.", {
    knownNames: ROSTER,
  });
  assert.equal(result.sanitizedText, "A aluna [ALUNO_1], CPF [CPF removido], tem dificuldade com leitura.");
  assert.equal(result.safeToSend, true);
  assert.equal(result.unresolvedPersonalNames.length, 0);
});

// 9. nome pessoal não cadastrado em contexto de aluno
test("nome em contexto pessoal que não está no cadastro fica sinalizado, não mascarado, e bloqueia o envio", () => {
  const result = dataAnonymizer.analyze("A aluna Beatriz Fontoura precisa de apoio.", { knownNames: ROSTER });
  assert.ok(result.sanitizedText.includes("Beatriz Fontoura")); // não mascarado — não inventamos correspondência
  assert.deepEqual(result.unresolvedPersonalNames, ["Beatriz Fontoura"]);
  assert.equal(result.safeToSend, false);
  const guard = guardBeforeExternalCall(result);
  assert.equal(guard.allowed, false);
});

// 10 e 11. autor histórico / cientista — Camada 5
test("preserva autores/cientistas históricos — nunca tratados como pessoa sensível", () => {
  const casosNaoSensiveis = [
    "Quero relacionar as ideias de Karl Marx às transformações do trabalho.",
    "Vamos estudar Machado de Assis nesta unidade.",
    "A contribuição de Ada Lovelace para a computação.",
    "Charles Darwin e a teoria da seleção natural.",
  ];
  for (const texto of casosNaoSensiveis) {
    const result = dataAnonymizer.analyze(texto, { knownNames: ROSTER });
    assert.equal(result.sanitizedText, texto, `não deveria alterar: "${texto}"`);
    assert.equal(result.safeToSend, true, `deveria ser seguro: "${texto}"`);
    assert.equal(result.warnings.length, 0, `não deveria ter aviso: "${texto}"`);
  }
});

// 12. localização
test("preserva nomes de lugares", () => {
  const result = dataAnonymizer.analyze("A turma visitou São Paulo durante o projeto.", { knownNames: ROSTER });
  assert.equal(result.sanitizedText, "A turma visitou São Paulo durante o projeto.");
  assert.equal(result.safeToSend, true);
});

// 13. nome parcial ambíguo
test("não mascara primeiro nome isolado quando há colisão entre duas pessoas cadastradas, mesmo em modo estrito", () => {
  const result = dataAnonymizer.analyze("João entregou o relatório.", {
    knownNames: ROSTER,
    strictFirstNameMatching: true,
  });
  assert.equal(result.sanitizedText, "João entregou o relatório."); // "João" sozinho é ambíguo (Pereira x Costa)
});

// 14. dois alunos no mesmo texto
test("dois alunos distintos no mesmo texto recebem aliases distintos", () => {
  const result = dataAnonymizer.analyze("Maria da Silva e Ana Souza fizeram a atividade juntas.", { knownNames: ROSTER });
  assert.ok(result.sanitizedText.includes("[ALUNO_1]"));
  assert.ok(result.sanitizedText.includes("[ALUNO_2]"));
  assert.ok(!result.sanitizedText.includes("Silva") && !result.sanitizedText.includes("Souza"));
});

// 15. logs sem nomes — o resultado inteiro é seguro para logar (nunca carrega o nome original)
test("AnonymizationResult nunca contém o nome original em nenhum campo — seguro para log", () => {
  const result = dataAnonymizer.analyze("A aluna Maria da Silva tem dificuldade com leitura.", { knownNames: ROSTER });
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes("Maria"));
  assert.ok(!serialized.includes("Silva"));
});

// 16. alias não persistido entre chamadas
test("numeração de alias não persiste entre chamadas — cada análise começa do zero", () => {
  const first = dataAnonymizer.analyze("A aluna Maria da Silva faltou.", { knownNames: ROSTER });
  const second = dataAnonymizer.analyze("A aluna Maria da Silva faltou de novo.", { knownNames: ROSTER });
  assert.ok(first.sanitizedText.includes("[ALUNO_1]"));
  assert.ok(second.sanitizedText.includes("[ALUNO_1]")); // não virou ALUNO_2 na segunda chamada
});

// 17. safeToSend=false por dado de saúde/diagnóstico
test("safeToSend=false quando o texto contém termo de diagnóstico/saúde, mesmo sem nome não resolvido", () => {
  const result = dataAnonymizer.analyze("A turma tem um aluno com laudo de TDAH e usa medicação controlada.", {
    knownNames: ROSTER,
  });
  assert.equal(result.safeToSend, false);
  assert.ok(result.detectedSensitiveTypes.includes("dado_saude_pessoa_identificavel"));
});

test('"dificuldade com leitura" isolado NÃO é tratado como dado de saúde (linguagem pedagógica comum, não diagnóstico)', () => {
  const result = dataAnonymizer.analyze("A aluna Maria da Silva tem dificuldade com leitura.", { knownNames: ROSTER });
  assert.equal(result.safeToSend, true);
  assert.ok(!result.detectedSensitiveTypes.includes("dado_saude_pessoa_identificavel"));
});

// guardBeforeExternalCall
test("guardBeforeExternalCall bloqueia com mensagem segura, sem detalhe do achado", () => {
  const result = dataAnonymizer.analyze("A aluna Beatriz Fontoura precisa de apoio.", { knownNames: ROSTER });
  const guard = guardBeforeExternalCall(result);
  assert.equal(guard.allowed, false);
  assert.equal(guard.message, "Identificamos informações pessoais no texto. Remova ou substitua os nomes antes de usar a melhoria com IA.");
});

test("guardBeforeExternalCall permite quando safeToSend é true", () => {
  const result = dataAnonymizer.analyze("Quero relacionar as ideias de Karl Marx às transformações do trabalho.", {
    knownNames: ROSTER,
  });
  const guard = guardBeforeExternalCall(result);
  assert.equal(guard.allowed, true);
});

test("sem cadastro (knownNames vazio), texto sem PII permanece seguro e inalterado", () => {
  const result = dataAnonymizer.analyze("Quero trabalhar redes e os impactos na circulação de informações.");
  assert.equal(result.sanitizedText, "Quero trabalhar redes e os impactos na circulação de informações.");
  assert.equal(result.safeToSend, true);
});
