#!/usr/bin/env node
/**
 * Ensaio de carga pela REDE, com sessões próprias.
 *
 *   npm run test:homologacao:carga -- --students=45
 *   npm run test:homologacao:carga -- --students=65 --entry-window=60
 *
 * Diferença para `pilot-load-test.mjs` (que exercita os módulos em
 * processo): aqui cada estudante é um cliente HTTP separado, com seu
 * próprio cookie de sessão, falando com o servidor Next como o
 * navegador fala. Login, middleware, render e Server Actions entram na
 * conta. Todas as sessões saem do mesmo IP, como a turma na rede da
 * escola.
 *
 * Critérios declarados ANTES da execução (não se afrouxam depois):
 *
 *   - nenhum erro de escrita;
 *   - p95 de login ≤ 4000 ms na entrada concentrada;
 *   - p95 de gravação ≤ 2500 ms;
 *   - integridade: uma entrega por estudante, sem duplicata e sem
 *     conteúdo trocado entre pessoas.
 *
 * Os limites são mais largos que os do ensaio em processo porque aqui
 * cada passo inclui HTTP, render e o custo do `scrypt` de 47 ou 67
 * logins na MESMA máquina que hospeda o banco e a aplicação. Isto é uma
 * medição local: não é, e não substitui, a medição na hospedagem.
 */

import { SessaoHttp } from "../tests/e2e/support/http-client.mjs";
import { startHttpHomologation, stopHttpHomologation } from "./pilot-http-env.mjs";

const LIMITES = {
  errosDeEscrita: 0,
  p95LoginMs: 4000,
  p95GravacaoMs: 2500,
};

function arg(nome, padrao) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
}

const ALUNOS = Number(arg("students", "45"));
const JANELA_ENTRADA_S = Number(arg("entry-window", "0"));
const RASCUNHOS = Number(arg("drafts", "3"));

function percentil(valores, p) {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return Math.round(ordenados[indice]);
}

function resumo(nome, valores) {
  return {
    etapa: nome,
    amostras: valores.length,
    p50: percentil(valores, 50),
    p95: percentil(valores, 95),
    max: Math.round(Math.max(0, ...valores)),
  };
}

async function medir(registro, fn) {
  const inicio = performance.now();
  const resultado = await fn();
  registro.push(performance.now() - inicio);
  return resultado;
}

const erros = [];

function registrarErro(quem, etapa, detalhe) {
  erros.push({ quem, etapa, detalhe: String(detalhe).slice(0, 200) });
}

async function main() {
  let ambiente = null;
  try {
    console.log(
      `Ensaio HTTP: ${ALUNOS} estudantes + professor + gestor = ${ALUNOS + 2} sessões.`,
    );
    ambiente = await startHttpHomologation({ students: ALUNOS, dbPool: 30 });

    const turma = ambiente.turmas.find((t) => t.prefixo === "beryon");
    const alunos = turma.contas.filter((c) => c.perfil === "aluno");
    const professor = turma.contas.find((c) => c.perfil === "professor");
    const gestor = turma.contas.find((c) => c.perfil === "gestor");
    const senhaDe = (registro) => `Carga-2026-${registro.referencia}`;

    const metricas = {
      login: [],
      leitura: [],
      gravacao: [],
      entrega: [],
      painelProfessor: [],
      painelGestor: [],
    };

    // ---- Preparo: cada conta troca a senha temporária (fora da medição).
    console.log("Preparando contas (troca inicial de senha)...");
    for (const registro of [...alunos, professor, gestor]) {
      const sessao = new SessaoHttp(ambiente.baseUrl, registro.email);
      const entrada = await sessao.entrar(registro.email, registro.senha);
      if (!entrada.ok) {
        registrarErro(registro.email, "preparo", entrada.erro ?? "login inicial falhou");
        continue;
      }
      await sessao.enviarFormulario("/entrar/nova-senha", {
        atual: registro.senha,
        nova: senhaDe(registro),
        confirmacao: senhaDe(registro),
      });
    }

    // ---- Professor publica a missão da aula.
    const sessaoProfessor = new SessaoHttp(ambiente.baseUrl, professor.email);
    await sessaoProfessor.entrar(professor.email, senhaDe(professor));
    await sessaoProfessor.acao("/professor/turmas", ambiente.actions.publishLessonMission, [
      {
        institutionId: turma.institutionId,
        classroomId: turma.classroomId,
        missionId: ambiente.missionId,
        lessonId: null,
      },
    ]);

    const inicioEnsaio = performance.now();

    // ---- Fase 1: entrada concentrada (todos no mesmo IP).
    console.log(
      JANELA_ENTRADA_S > 0
        ? `Fase 1: entrada distribuída em ${JANELA_ENTRADA_S}s...`
        : "Fase 1: entrada simultânea (pior caso)...",
    );
    const sessoes = new Map();
    await Promise.all(
      alunos.map(async (registro, indice) => {
        if (JANELA_ENTRADA_S > 0) {
          const atraso = (indice / alunos.length) * JANELA_ENTRADA_S * 1000;
          await new Promise((r) => setTimeout(r, atraso));
        }
        const sessao = new SessaoHttp(ambiente.baseUrl, registro.email);
        const entrada = await medir(metricas.login, () =>
          sessao.entrar(registro.email, senhaDe(registro)),
        );
        if (!entrada.ok) {
          registrarErro(registro.email, "login", entrada.erro ?? "sem cookie de sessão");
          return;
        }
        sessoes.set(registro.referencia, sessao);
        await medir(metricas.leitura, () => sessao.navegar("/dashboard"));
      }),
    );

    // ---- Fase 2: aula — abrir a missão e rascunhar várias vezes.
    console.log("Fase 2: missão aberta e rascunhos...");
    await Promise.all(
      [...sessoes.entries()].map(async ([referencia, sessao]) => {
        await medir(metricas.leitura, () =>
          sessao.acao(`/missoes/${ambiente.missionId}`, ambiente.actions.startMissionAction, [
            ambiente.missionId,
          ]),
        );
        for (let i = 1; i <= RASCUNHOS; i += 1) {
          const texto = `Rascunho ${i} de ${referencia}: investigação em andamento.`;
          const resposta = await medir(metricas.gravacao, () =>
            sessao.acao(
              `/missoes/${ambiente.missionId}`,
              ambiente.actions.saveProductionDraftAction,
              [ambiente.missionId, texto],
            ),
          );
          if (/^1:E\{/m.test(resposta.texto)) registrarErro(referencia, "rascunho", "recusado");
        }
      }),
    );

    // ---- Fase 3: pico de entregas + reflexão, todos juntos.
    console.log("Fase 3: pico de entregas e reflexões...");
    await Promise.all(
      [...sessoes.entries()].map(async ([referencia, sessao]) => {
        const final = `Entrega final de ${referencia}.`;
        await medir(metricas.gravacao, () =>
          sessao.acao(
            `/missoes/${ambiente.missionId}`,
            ambiente.actions.saveProductionDraftAction,
            [ambiente.missionId, final],
          ),
        );
        const entrega = await medir(metricas.entrega, () =>
          sessao.acao(
            `/missoes/${ambiente.missionId}`,
            ambiente.actions.setProductionDeliveredAction,
            [ambiente.missionId, true],
          ),
        );
        if (/^1:E\{/m.test(entrega.texto)) registrarErro(referencia, "entrega", "recusada");

        await medir(metricas.gravacao, () =>
          sessao.acao(
            `/missoes/${ambiente.missionId}`,
            ambiente.actions.saveReflectionDraftAction,
            [ambiente.missionId, `Reflexão de ${referencia}.`],
          ),
        );
        const reflexao = await medir(metricas.gravacao, () =>
          sessao.acao(
            `/missoes/${ambiente.missionId}`,
            ambiente.actions.setReflectionRecordedAction,
            [ambiente.missionId, true],
          ),
        );
        if (/^1:E\{/m.test(reflexao.texto)) registrarErro(referencia, "reflexão", "recusada");
      }),
    );

    // ---- Fase 4: professor e gestor acompanham durante o pico.
    console.log("Fase 4: acompanhamento do professor e do gestor...");
    const sessaoGestor = new SessaoHttp(ambiente.baseUrl, gestor.email);
    await sessaoGestor.entrar(gestor.email, senhaDe(gestor));
    for (let i = 0; i < 5; i += 1) {
      await medir(metricas.painelProfessor, () => sessaoProfessor.navegar("/professor"));
      await medir(metricas.painelGestor, () => sessaoGestor.navegar("/gestor"));
    }

    const duracaoS = Math.round((performance.now() - inicioEnsaio) / 1000);

    // ---- Integridade: o banco decide, não a tela.
    const pg = (await import("pg")).default;
    const cliente = new pg.Client({ connectionString: ambiente.env.PILOT_TEST_DATABASE_URL });
    await cliente.connect();
    let integridade;
    try {
      const { rows } = await cliente.query(
        `select
           (select count(*) from students where institution_id = $1)                as alunos,
           (select count(*) from productions
             where mission_id = $2 and delivered_at is not null)                    as entregues,
           (select count(*) from reflections
             where mission_id = $2 and recorded_at is not null)                     as reflexoes,
           (select count(*) from (
              select student_id from productions where mission_id = $2
              group by student_id having count(*) > 1) d)                           as duplicadas,
           (select count(*) from productions
             where mission_id = $2 and content not like '%' || student_id || '%')   as conteudoTrocado`,
        [turma.institutionId, ambiente.missionId],
      );
      integridade = rows[0];
    } finally {
      await cliente.end();
    }

    const etapas = [
      resumo("login", metricas.login),
      resumo("leitura", metricas.leitura),
      resumo("gravação", metricas.gravacao),
      resumo("entrega", metricas.entrega),
      resumo("painel do professor", metricas.painelProfessor),
      resumo("painel do gestor", metricas.painelGestor),
    ];

    console.log(`\n== Ensaio HTTP — ${ALUNOS + 2} sessões, ${duracaoS}s`);
    console.table(etapas);
    console.log("Integridade:", integridade);
    console.log("Erros:", erros.length === 0 ? "nenhum" : erros.slice(0, 10));

    const p95Login = percentil(metricas.login, 95);
    const p95Gravacao = percentil([...metricas.gravacao, ...metricas.entrega], 95);
    const reprovacoes = [];
    if (erros.length > LIMITES.errosDeEscrita) reprovacoes.push(`${erros.length} erro(s)`);
    if (p95Login > LIMITES.p95LoginMs) {
      reprovacoes.push(`p95 de login ${p95Login}ms > ${LIMITES.p95LoginMs}ms`);
    }
    if (p95Gravacao > LIMITES.p95GravacaoMs) {
      reprovacoes.push(`p95 de gravação ${p95Gravacao}ms > ${LIMITES.p95GravacaoMs}ms`);
    }
    if (Number(integridade.entregues) !== sessoes.size) {
      reprovacoes.push(`entregas ${integridade.entregues} ≠ sessões ${sessoes.size}`);
    }
    if (Number(integridade.duplicadas) > 0) reprovacoes.push("entregas duplicadas");
    if (Number(integridade.conteudotrocado) > 0) reprovacoes.push("conteúdo trocado entre pessoas");

    if (reprovacoes.length > 0) {
      console.error(`\n✖ Fora dos limites declarados: ${reprovacoes.join("; ")}`);
      process.exitCode = 1;
    } else {
      console.log("\n✔ Ensaio local dentro dos limites declarados.");
    }
    console.log(
      "Medição LOCAL (aplicação, banco e clientes na mesma máquina). " +
        "Não vale como capacidade da hospedagem nem substitui o ensaio na rede da escola.",
    );
  } catch (erro) {
    console.error(`✖ ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exitCode = 1;
  } finally {
    await stopHttpHomologation(ambiente);
    console.log("Ambiente removido.");
  }
}

await main();
