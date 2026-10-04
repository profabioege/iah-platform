/**
 * Catálogo IAH e revisão editorial (D-050/D-052) — pela rede, com
 * autenticação normal, pelas telas e formulários do build.
 *
 * Dados SINTÉTICOS semeados pelo arranque: catálogo com contas de autoria
 * e de gestão, acervo autoral (3 itens em revisão, um com tabela, um com
 * habilidade proposta por IA) e um item no formato do Enem com figura
 * (rascunho sem resolução, fonte licenciada pendente).
 *
 * História: gestão verifica fontes → aprova e devolve → autor corrige e
 * completa a resolução → gestão aprova → escola monta lista com itens do
 * catálogo → aluno vê tabela e figura, erra e lê a devolutiva da
 * alternativa → a figura não vaza para outra escola nem para anônimo.
 */

import assert from "node:assert/strict";
import test, { before } from "node:test";

import { SessaoHttp, textoVisivel } from "./support/http-client.mjs";
import { autenticar } from "./support/sessoes.mjs";
import { BANCO, BASE_URL, CATALOGO, OUTRA_TURMA, TURMA, conta, consultarBanco } from "./support/ambiente.mjs";

const AUTORIA = conta(CATALOGO, "professor");
const GESTAO = conta(CATALOGO, "gestor");
const PROFESSOR = conta(TURMA, "professor");
const ALUNO = conta(TURMA, "aluno", 12);
const ALUNO_OUTRA = conta(OUTRA_TURMA, "aluno", 0);

const CN901 = BANCO.acervo["IAH-EM-CN-901"];
const CN902 = BANCO.acervo["IAH-EM-CN-902"];
const ENEM = BANCO.enem.versionId;
const item = (base, versao) => `${base}/${encodeURIComponent(versao)}`;
const CHECK = { gabarito: "on", habilidade: "on", direitos: "on", linguagem: "on" };

let autoria;
let gestao;
let professor;
let aluno;
let alunoOutra;
let cn902v2;
let enemV2;
let listaUrl;
let figura;

before(async () => {
  autoria = await autenticar(AUTORIA);
  gestao = await autenticar(GESTAO);
  professor = await autenticar(PROFESSOR);
  aluno = await autenticar(ALUNO);
  alunoOutra = await autenticar(ALUNO_OUTRA);
});

const statusDe = async (id) => (await consultarBanco("select status from question_versions where id = $1", [id]))[0]?.status;

/** Campos do editor a partir da versão gravada (o que a tela mostraria preenchido). */
async function camposDoEditor(versionId, extra) {
  const [v] = await consultarBanco(
    `select v.stem, v.options, k.answer_key, k.resolution, k.option_feedback, q.skill_id
       from question_versions v join question_version_keys k on k.version_id = v.id
       join questions q on q.id = v.question_id where v.id = $1`,
    [versionId],
  );
  const campos = { stem: v.stem, answerKey: v.answer_key, resolution: v.resolution ?? "", skillId: v.skill_id, difficulty: "" };
  for (const o of v.options) {
    campos[`option:${o.key}`] = o.text;
    campos[`feedback:${o.key}`] = v.option_feedback?.[o.key] ?? "";
  }
  return { ...campos, ...extra };
}

test("1. gestão verifica as fontes do catálogo em /gestor/fontes", async () => {
  let { html } = await gestao.html("/gestor/fontes");
  assert.match(textoVisivel(html), /Acervo autoral IAH Educacional/);
  const fontes = await consultarBanco("select id, kind from content_sources where institution_id = $1", [CATALOGO.institutionId]);
  for (const f of fontes) {
    const envio = await gestao.enviarFormularioCom("/gestor/fontes", `value="${f.id}"`, {
      evidence: f.kind === "licenciado" ? "Evidência FICTÍCIA — homologação local." : "Autoria IAH declarada (homologação local).",
    });
    assert.equal(envio.status, 303);
  }
  const estado = await consultarBanco("select rights_status from content_sources where institution_id = $1", [CATALOGO.institutionId]);
  assert.ok(estado.every((e) => e.rights_status === "verificado"));
  ({ html } = await gestao.html("/gestor/fontes"));
  assert.ok(!/Verificar direitos desta fonte/.test(textoVisivel(html)));
});

test("2. fila da gestão; aprovação com conferência e devolução com comentário", async () => {
  const { html } = await gestao.html("/gestor/revisao");
  const texto = textoVisivel(html);
  assert.match(texto, /Em revisão · 3/);
  assert.match(texto, /Rascunhos · 1/);
  assert.match(texto, /habilidade proposta por IA/);

  let envio = await gestao.enviarFormularioCom(item("/gestor/revisao", CN901), 'value="aprovada"', { ...CHECK, decision: "aprovada" });
  assert.equal(envio.status, 303);
  assert.match(decodeURIComponent(envio.destino ?? ""), /Versão aprovada/);
  assert.equal(await statusDe(CN901), "aprovada");

  envio = await gestao.enviarFormularioCom(item("/gestor/revisao", CN902), 'value="devolvida"', {
    decision: "devolvida",
    comment: "Habilidade proposta não confere — use EM13CNT101.",
  });
  assert.equal(envio.status, 303);
  assert.equal(await statusDe(CN902), "devolvida");
});

test("3. autor corrige a devolvida (nova versão, troca de habilidade) e completa a resolução do item do Enem", async () => {
  let { html } = await autoria.html("/professor/revisao?status=devolvida");
  assert.match(textoVisivel(html), /IAH-EM-CN-902/);
  ({ html } = await autoria.html(item("/professor/revisao", CN902)));
  assert.match(textoVisivel(html), /Corrigir \(cria a versão 2\)/);

  let envio = await autoria.enviarFormularioCom(item("/professor/revisao", CN902), 'name="stem"',
    await camposDoEditor(CN902, { skillId: "bncc-em13cnt101", intent: "enviar" }));
  assert.equal(envio.status, 303);
  cn902v2 = decodeURIComponent(envio.destino.split("/professor/revisao/")[1]);
  assert.equal(await statusDe(cn902v2), "em_revisao");
  const [q] = await consultarBanco("select q.skill_id from questions q join question_versions v on v.question_id = q.id where v.id = $1", [cn902v2]);
  assert.equal(q.skill_id, "bncc-em13cnt101");

  envio = await autoria.enviarFormularioCom(item("/professor/revisao", ENEM), 'name="stem"',
    await camposDoEditor(ENEM, { resolution: "Resolução sintética escrita pela equipe IAH.", intent: "enviar" }));
  assert.equal(envio.status, 303);
  enemV2 = decodeURIComponent(envio.destino.split("/professor/revisao/")[1]);
  assert.equal(await statusDe(enemV2), "em_revisao");

  // O autor não aprova a própria versão: a tela nem oferece a conferência.
  ({ html } = await autoria.html(item("/professor/revisao", cn902v2)));
  assert.match(textoVisivel(html), /outra pessoa da equipe precisa revisá-la/);
});

test("4. gestão aprova as versões corrigidas", async () => {
  for (const v of [cn902v2, enemV2]) {
    const envio = await gestao.enviarFormularioCom(item("/gestor/revisao", v), 'value="aprovada"', { ...CHECK, decision: "aprovada" });
    assert.equal(envio.status, 303);
    assert.equal(await statusDe(v), "aprovada");
  }
});

test("5. professor da escola vê os itens do catálogo, rotulados, e publica uma lista", async () => {
  const banco = `/professor/banco-de-questoes?turma=${encodeURIComponent(TURMA.classroomId)}&habilidade=bncc-em13cnt101`;
  const { html } = await professor.html(banco);
  const texto = textoVisivel(html);
  assert.match(texto, /Catálogo IAH/);
  assert.match(texto, /EM13CNT101 confirmada pela equipe/);
  assert.ok(html.includes(CN901) && html.includes(enemV2));
  assert.match(html, /<table/);

  const envio = await professor.enviarFormularioCom(banco, 'name="versionIds"', {
    versionIds: [CN901, enemV2],
    title: "Diagnóstica com itens do Catálogo IAH",
    kind: "diagnostica",
  });
  assert.equal(envio.status, 303);
  listaUrl = envio.destino.replace(BASE_URL, "");
  assert.match(listaUrl, /\/professor\/banco-de-questoes\/listas\//);
});

test("6. aluno vê tabela e figura, erra uma questão e lê a devolutiva da alternativa marcada", async () => {
  const caminho = listaUrl.replace("/professor/banco-de-questoes/listas/", "/dashboard/listas/");
  const { html } = await aluno.html(caminho);
  assert.match(html, /<table/);
  figura = decodeURIComponent(html.match(/src="(\/api\/questoes\/figura\/[^"]+)"/)?.[1] ?? "");
  assert.ok(figura, "a figura do item do Enem aparece na lista");
  const png = await aluno.get(figura);
  assert.equal(png.status, 200);
  assert.equal(png.headers.get("content-type"), "image/png");

  const listId = decodeURIComponent(caminho.split("/dashboard/listas/")[1]);
  const itens = await consultarBanco(
    `select i.id, i.question_version_id, k.answer_key from practice_list_items i
       join question_version_keys k on k.version_id = i.question_version_id where i.list_id = $1`,
    [listId],
  );
  const campos = Object.fromEntries(
    itens.map((i) => [`item:${i.id}`, i.question_version_id === CN901 ? (i.answer_key === "A" ? "C" : "A") : i.answer_key]),
  );
  const envio = await aluno.enviarFormularioCom(caminho, 'name="listId"', { ...campos, intent: "entregar" });
  assert.equal(envio.status, 303);
  const depois = textoVisivel((await aluno.html(caminho)).html);
  assert.match(depois, /Você acertou 1 de 2/);
  assert.match(depois, /Sobre a alternativa [AC]: Devolutiva sintética da alternativa [AC]\./);
});

test("7. a figura não vaza: aluno de outra escola e visitante sem sessão não a recebem", async () => {
  assert.equal((await alunoOutra.get(figura)).status, 404);
  const anonimo = await new SessaoHttp(BASE_URL, "anônimo").get(figura);
  assert.notEqual(anonimo.status, 200);
  assert.equal((await professor.get(figura)).status, 200, "a equipe da escola alcança o item aprovado do catálogo");
});
