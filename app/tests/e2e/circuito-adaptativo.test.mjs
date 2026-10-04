/**
 * Circuito adaptativo (D-051) — pela rede, com autenticação normal.
 *
 * Cada passo é o que a tela faz: GET da página e envio do formulário da
 * própria página (a Server Action do build), com o cookie do Auth.js.
 * Nenhum módulo da aplicação é importado. Dados sintéticos semeados pelo
 * arranque (`scripts/homologacao-seed-banco-questoes.mjs`): recorte
 * provisório da 1ª série com Matemática primeiro e 6 itens aprovados.
 *
 * A ordem importa: professor liga → aluno faz duas rodadas e consolida →
 * professor libera o avanço → aluno passa à habilidade seguinte.
 */

import assert from "node:assert/strict";
import test, { before } from "node:test";

import { textoVisivel } from "./support/http-client.mjs";
import { autenticar } from "./support/sessoes.mjs";
import { TURMA, conta, consultarBanco } from "./support/ambiente.mjs";

const PROFESSOR = conta(TURMA, "professor");
const ALUNO = conta(TURMA, "aluno", 10);
const COLEGA = conta(TURMA, "aluno", 11);
const PAINEL = `/professor/circuito?turma=${encodeURIComponent(TURMA.classroomId)}`;

let professor;
let aluno;
let colega;
let studentId;
const rodadas = [];

before(async () => {
  professor = await autenticar(PROFESSOR);
  aluno = await autenticar(ALUNO);
  colega = await autenticar(COLEGA);
  [{ id: studentId }] = await consultarBanco(
    "select s.id from students s join users u on u.id = s.user_id where u.email = $1",
    [ALUNO.email],
  );
});

/** Pede a rodada pela tela do circuito; devolve o id da lista para onde o servidor redirecionou. */
async function pedirRodada(rotulo) {
  const envio = await aluno.enviarFormularioCom("/dashboard/circuito", rotulo);
  assert.equal(envio.status, 303, `pedido de rodada (${rotulo})`);
  const destino = decodeURIComponent(envio.destino ?? "");
  assert.match(destino, /\/dashboard\/listas\/circ:/, `redireciona para a rodada: ${destino}`);
  return destino.split("/dashboard/listas/")[1];
}

/** Responde a rodada com o gabarito (conferido no banco de teste) e entrega pelo formulário. */
async function responderCertoEEntregar(listId) {
  const gabarito = await consultarBanco(
    `select i.id, k.answer_key from practice_list_items i
       join question_version_keys k on k.version_id = i.question_version_id where i.list_id = $1`,
    [listId],
  );
  const caminho = `/dashboard/listas/${encodeURIComponent(listId)}`;
  const campos = Object.fromEntries(gabarito.map((g) => [`item:${g.id}`, g.answer_key]));
  const envio = await aluno.enviarFormularioCom(caminho, 'name="listId"', { ...campos, intent: "entregar" });
  assert.equal(envio.status, 303);
  const { html } = await aluno.html(caminho);
  assert.match(textoVisivel(html), /Você acertou 3 de 3/);
}

test("1. professor liga o circuito pela tela; a 1ª habilidade é liberada para a turma toda", async () => {
  let { html } = await professor.html(PAINEL);
  assert.match(textoVisivel(html), /Ligar circuito e liberar a 1ª habilidade/);
  const envio = await professor.enviarFormularioCom(PAINEL, "Ligar circuito");
  assert.equal(envio.status, 303);
  ({ html } = await professor.html(PAINEL));
  const texto = textoVisivel(html);
  assert.match(texto, /Alunos × habilidades/);
  assert.match(texto, /Ativo/);
  const [{ n, total }] = await consultarBanco(
    `select count(*)::int as n,
            (select count(*)::int from enrollments where classroom_id = $1 and status = 'active') as total
       from adaptive_unlocks where circuit_id = $2`,
    [TURMA.classroomId, `circuit:${TURMA.classroomId}`],
  );
  assert.equal(n, total);
});

test("2. aluno faz duas rodadas certas, sem repetir questão, e consolida", async () => {
  let { html } = await aluno.html("/dashboard/circuito");
  assert.match(textoVisivel(html), /Começar rodada/);

  rodadas.push(await pedirRodada("Começar rodada"));
  assert.equal(await pedirRodada("Continuar rodada"), rodadas[0], "rodada aberta é devolvida, não duplicada");
  await responderCertoEEntregar(rodadas[0]);

  rodadas.push(await pedirRodada("Começar rodada"));
  await responderCertoEEntregar(rodadas[1]);

  const repetidas = await consultarBanco(
    `select v.question_id from practice_list_items i join question_versions v on v.id = i.question_version_id
      where i.list_id = any($1) group by v.question_id having count(*) > 1`,
    [rodadas],
  );
  assert.deepEqual(repetidas, [], "nenhuma questão repetida entre rodadas");

  ({ html } = await aluno.html("/dashboard/circuito"));
  const texto = textoVisivel(html);
  assert.match(texto, /Consolidado · 5 de 5 recentes/);
  assert.match(texto, /Você consolidou esta habilidade/);
});

test("3. a rodada é pessoal: o colega recebe 404", async () => {
  const resposta = await colega.get(`/dashboard/listas/${encodeURIComponent(rodadas[0])}`);
  assert.equal(resposta.status, 404);
  const { html } = await colega.html("/dashboard/listas");
  assert.ok(!html.includes(rodadas[0]), "rodada não aparece nas listas do colega");
});

test("4. o painel mostra o aluno pronto para avançar; o professor libera pela tela", async () => {
  let { html } = await professor.html(PAINEL);
  assert.match(textoVisivel(html), /1 aluno\(s\) pronto\(s\) para avançar/);
  const envio = await professor.enviarFormularioCom(PAINEL, `value="${studentId}"`);
  assert.equal(envio.status, 303);
  ({ html } = await professor.html(PAINEL));
  assert.match(textoVisivel(html), /0 aluno\(s\) pronto\(s\) para avançar/);
  const liberadas = await consultarBanco(
    "select skill_id, reason from adaptive_unlocks where student_id = $1 order by unlocked_at",
    [studentId],
  );
  assert.equal(liberadas.length, 2);
  assert.equal(liberadas[1].reason, "avanco");
});

test("5. o aluno passa à habilidade liberada e recebe rodada dela", async () => {
  const [{ skill_id: liberada }] = await consultarBanco(
    "select skill_id from adaptive_unlocks where student_id = $1 and reason = 'avanco'",
    [studentId],
  );
  const { html } = await aluno.html("/dashboard/circuito");
  assert.match(textoVisivel(html), /Começar rodada/);
  const nova = await pedirRodada("Começar rodada");
  const [{ target_skill_id }] = await consultarBanco("select target_skill_id from practice_lists where id = $1", [nova]);
  assert.equal(target_skill_id, liberada);
});
