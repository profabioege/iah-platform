/**
 * Perfil de gestor no modo real (REGISTRO 14 — G1 a G4), pela rede.
 *
 * Cada gestor sintético (uma instituição por turma do arranque) lê o
 * próprio painel e a Implantação. O esperado vem do banco no momento do
 * teste, pela mesma regra das telas — as outras suítes mexem nas
 * entregas antes desta.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { OUTRA_TURMA, TURMA, conta, consultarBanco } from "./support/ambiente.mjs";
import { autenticar } from "./support/sessoes.mjs";

/** Texto visível do HTML do servidor (sem scripts nem tags). */
function textoVisivel(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** Mensagem esperada no item de atenção, com concordância. */
function mensagemPendencias(n) {
  return n === 1 ? "1 entrega aguarda avaliação" : `${n} entregas aguardam avaliação`;
}

async function esperadoDoBanco(turma) {
  const [matriculas] = await consultarBanco(
    `select count(*)::int as n from enrollments
      where institution_id = $1 and classroom_id = $2 and status = 'active'`,
    [turma.institutionId, turma.classroomId],
  );
  const professores = await consultarBanco(
    `select t.email, array_remove(array_agg(ct.classroom_id), null) as turmas
       from teachers t
       left join classroom_teachers ct on ct.teacher_id = t.id
      where t.institution_id = $1
      group by t.email order by t.email`,
    [turma.institutionId],
  );
  // Missão publicada mais recente da turma — a mesma regra do painel.
  const [ativa] = await consultarBanco(
    `select mission_id from mission_assignments
      where institution_id = $1 and classroom_id = $2 and status = 'published'
      order by published_at desc limit 1`,
    [turma.institutionId, turma.classroomId],
  );
  let pendentes = null;
  let concluiram = null;
  if (ativa) {
    const [linha] = await consultarBanco(
      `select count(*) filter (where p.status = 'concluiu')::int as pendentes,
              count(*) filter (where p.status in ('concluiu', 'avaliado'))::int as concluiram
         from mission_progress p
         join enrollments e
           on e.student_id = p.student_id and e.classroom_id = p.classroom_id
          and e.status = 'active'
        where p.institution_id = $1 and p.classroom_id = $2 and p.mission_id = $3`,
      [turma.institutionId, turma.classroomId, ativa.mission_id],
    );
    ({ pendentes, concluiram } = linha);
  }
  return { alunos: matriculas.n, professores, pendentes, concluiram };
}

for (const turma of [TURMA, OUTRA_TURMA]) {
  test(`gestor ${turma.prefixo}: painel com professores, vínculos e pendências da própria instituição`, async (t) => {
    const outra = turma === TURMA ? OUTRA_TURMA : TURMA;
    const esperado = await esperadoDoBanco(turma);
    const deOutra = await esperadoDoBanco(outra);
    assert.ok(esperado.professores.length > 0, "o arranque provisiona professor por instituição");

    const gestor = await autenticar(conta(turma, "gestor", 0));
    const { resposta, caminhoFinal } = await gestor.navegar("/gestor");
    assert.equal(caminhoFinal, "/gestor");
    const texto = textoVisivel(await resposta.text());

    // G4 — rótulos do modo real.
    assert.match(texto, /Dados da instituição/);
    assert.doesNotMatch(texto, /dados simulados|demonstração comercial|Mission ativa da demonstração/i);

    // G3 — professores e vínculos efetivos, sem contagem fixa.
    assert.match(texto, new RegExp(`Professores vinculados ${esperado.professores.length}\\b`));
    for (const professor of esperado.professores) {
      assert.ok(texto.includes(professor.email), `professor ${professor.email} da instituição aparece`);
    }
    for (const professor of deOutra.professores) {
      assert.ok(!texto.includes(professor.email), `professor de outra instituição não aparece (${professor.email})`);
    }

    // G2 — aguardam avaliação = concluíram sem avaliação.
    if (esperado.pendentes === null) {
      t.diagnostic("turma sem missão publicada: contagem de pendências não conferida");
    } else if (esperado.pendentes > 0) {
      assert.match(texto, new RegExp(`\\b${mensagemPendencias(esperado.pendentes)}`));
      // Contagem exata, qualquer que seja a concordância exibida.
      const exibidas = [...texto.matchAll(/\b(\d+) entregas? aguardam? avaliação/g)].map((m) => Number(m[1]));
      assert.deepEqual(exibidas, [esperado.pendentes]);
    } else {
      assert.match(texto, /Entregas avaliadas/);
      assert.doesNotMatch(texto, /\d+ entregas? aguardam? avaliação/);
    }
    if (esperado.concluiram !== null && esperado.concluiram !== esperado.pendentes) {
      assert.doesNotMatch(
        texto,
        new RegExp(`\\b${mensagemPendencias(esperado.concluiram)}`),
        "avaliados não contam como pendentes",
      );
    }

    // Visão "Professores": um professor por linha, com as turmas dele.
    const visao = textoVisivel(await (await gestor.navegar("/gestor?visao=professores")).resposta.text());
    assert.match(visao, new RegExp(`Professores · ${esperado.professores.length}`));
    assert.doesNotMatch(visao, /Turmas vinculadas/);
  });

  test(`gestor ${turma.prefixo}: Implantação com os dados da instituição, sem seed de demonstração`, async () => {
    const esperado = await esperadoDoBanco(turma);

    const gestor = await autenticar(conta(turma, "gestor", 0));
    const { resposta, caminhoFinal } = await gestor.navegar("/gestor/implantacao");
    assert.equal(caminhoFinal, "/gestor/implantacao");
    const html = await resposta.text();
    const texto = textoVisivel(html);

    assert.match(texto, /Dados da instituição\./);
    assert.doesNotMatch(texto, /dados simulados/i);
    // Nada do seed de demonstração, nem no HTML nem nos dados enviados ao assistente.
    assert.doesNotMatch(html, /Professor\(a\) de demonstração/);
    // Os dados das etapas viajam nas props do assistente (RSC); conferidos ali.
    const props = html.replace(/\\"/g, '"');
    assert.match(props, new RegExp(`"totalStudents":${esperado.alunos}\\b`));
    assert.equal(
      (props.match(/"classrooms":\[\{"id":"[^"]+","name":"[^"]+"\}/g) ?? []).length,
      esperado.professores.filter((p) => p.turmas.length > 0).length,
      "um vínculo de turma por professor vinculado",
    );
    for (const professor of esperado.professores) {
      assert.ok(props.includes(`"email":"${professor.email}"`), `professor ${professor.email} nas props`);
    }
  });
}
