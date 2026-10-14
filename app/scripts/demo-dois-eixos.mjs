#!/usr/bin/env node
/**
 * Demonstração LOCAL dos dois eixos (D-053) e do diagnóstico + plano
 * semanal (D-054) — sobe o mesmo ambiente da
 * homologação (`npm run test:homologacao`) e o DEIXA NO AR para navegar:
 *
 *   npm run demo:dois-eixos
 *   npm run demo:dois-eixos -- --lote-piloto=C:\caminho\banco_piloto_40_v1.1_aprovado.json
 *
 * O que fica disponível (tudo sintético, banco efêmero local, apagado ao
 * encerrar com Ctrl+C):
 *  - escola "beryon" (1ª série, 1º bimestre do recorte provisório) com
 *    professor, gestão e alunos sintéticos; escola "outra" para conferir
 *    isolamento;
 *  - Missão 01 da Trilha IA & Humanidades (dois eixos: História
 *    EM13CHS101 + competência em IA) no registro de missões, ainda NÃO
 *    atribuída — o professor atribui em "Trilha IA & Humanidades";
 *  - itens sintéticos REVISADOS de História (EM13CHS101) e de Matemática
 *    no banco da escola, para a lista ligada ao tema e o circuito;
 *  - Catálogo IAH sintético (autoria e gestão).
 *  - Com `--lote-piloto=<arquivo>`: os itens APROVADOS pela coordenação
 *    do lote piloto entram no Catálogo IAH sintético EM REVISÃO (a
 *    aprovação no sistema continua sendo da gestão, pela tela).
 *  - Com `--lote-complementar=<arquivo>`: os itens do lote complementar
 *    da 1ª série (D-055), PENDENTES de revisão docente, entram no
 *    Catálogo IAH sintético EM REVISÃO.
 *
 * As senhas iniciais vão para um arquivo no diretório temporário do
 * sistema (o caminho é impresso; o conteúdo, não) e são apagadas ao
 * encerrar. Cada conta troca a senha no primeiro acesso.
 *
 * Nada aqui toca banco remoto, a Vercel, o site ou o domínio. Este
 * ambiente local NÃO mede capacidade da Vercel.
 */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { startHttpHomologation, stopHttpHomologation } from "./pilot-http-env.mjs";

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

function node(args, env) {
  return new Promise((ok, fail) => {
    const child = spawn(process.execPath, args, { stdio: ["ignore", "inherit", "inherit"], env });
    child.on("error", fail);
    child.on("close", (code) => (code === 0 ? ok() : fail(new Error(`${args[1] ?? args[0]} saiu com ${code}`))));
  });
}

let ambiente = null;
async function encerrar() {
  await stopHttpHomologation(ambiente);
  console.log("\nAmbiente de demonstração removido (banco, servidor e senhas iniciais).");
  process.exit(0);
}
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);

try {
  const alunos = Number(arg("alunos") ?? 45);
  ambiente = await startHttpHomologation({ students: alunos });

  const arquivoBanco = join(ambiente.workdir, "banco-de-questoes.json");
  await node(
    ["--experimental-strip-types", "scripts/homologacao-seed-banco-questoes.mjs", `--out=${arquivoBanco}`],
    ambiente.env,
  );

  for (const [opcao, extra] of [
    ["lote-piloto", []],
    ["lote-complementar", ["--complementar"]],
  ]) {
    const lote = arg(opcao);
    if (!lote) continue;
    await node(
      [
        "--experimental-strip-types",
        "scripts/catalogo-iah-lote-piloto-carga.mjs",
        `--arquivo=${resolve(lote)}`,
        "--catalogo=iah-catalogo-homolog",
        ...extra,
        "--execute",
      ],
      ambiente.env,
    );
  }

  const banco = JSON.parse(readFileSync(arquivoBanco, "utf8"));
  const contas = [
    ...ambiente.turmas.flatMap((t) => t.contas.map((c) => ({ escola: t.institutionId, ...c }))),
    ...banco.contas.map((c) => ({ escola: banco.institutionId, ...c })),
  ];
  const arquivoContas = join(ambiente.workdir, "contas-demo.csv");
  writeFileSync(
    arquivoContas,
    ["escola;perfil;email;senha_inicial", ...contas.map((c) => `${c.escola};${c.perfil};${c.email};${c.senha}`)].join("\n"),
    "utf8",
  );
  // Mesmo formato que as suítes HTTP leem: permite rodar
  // `tests/e2e/*.test.mjs` contra este servidor com E2E_AMBIENTE.
  const arquivoAmbiente = join(ambiente.workdir, "ambiente.json");
  writeFileSync(
    arquivoAmbiente,
    JSON.stringify({
      baseUrl: ambiente.baseUrl,
      actions: ambiente.actions,
      missionId: ambiente.missionId,
      aiMissionId: ambiente.aiMissionId,
      geoMissionId: ambiente.geoMissionId,
      turmas: ambiente.turmas,
      supabaseUrl: ambiente.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: ambiente.env.SUPABASE_SERVICE_ROLE_KEY,
      databaseUrl: ambiente.env.PILOT_TEST_DATABASE_URL,
      bancoDeQuestoes: banco,
    }),
    "utf8",
  );

  console.log(`
==============================================================
 Demonstração local no ar: ${ambiente.baseUrl}/entrar
--------------------------------------------------------------
 Contas sintéticas e senhas iniciais (troca no 1º acesso):
   ${arquivoContas}
 Roteiro — dois eixos (D-053):
   1. Professor (escola inst-beryon) → "Trilha IA & Humanidades"
      → "Atribuir à turma" (Missão 1 — História; Missão 2 — Geografia).
   2. Aluno → Dashboard ("Meus percursos") → missão → produção,
      etapa "Uso da IA", entrega e reflexão.
   3. Professor → "Abrir entregas e avaliar os dois eixos".
 Roteiro — diagnóstico e plano (D-054; itens DEMONSTRATIVOS):
   4. Professor → "Diagnóstico e planos" → criar e publicar.
   5. Aluno → "Diagnóstico": etapas curtas, salvar e continuar,
      entregar com questões em branco, evidências iniciais.
   6. Aluno → "Plano da semana": dias + minutos → plano com motivos;
      concluir, adiar, reagendar. Professor ajusta e orienta.
 Roteiro — prontidão para o diagnóstico real (D-055):
   7. Professor → "Diagnóstico e planos" → "Prontidão": o que falta
      (planejamento validado; ≥ 3 questões revisadas por habilidade).
   8. Gestão do catálogo → "Revisão" → filtro "1ª série" e habilidade.
 Ctrl+C encerra e apaga tudo.
 Ambiente para as suítes HTTP: E2E_AMBIENTE=${arquivoAmbiente}
==============================================================
`);
  // Mantém o processo vivo até Ctrl+C.
  setInterval(() => {}, 1 << 30);
} catch (error) {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  await stopHttpHomologation(ambiente);
  process.exit(1);
}
