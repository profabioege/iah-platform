/**
 * Salvaguardas do reset do ambiente demonstrativo (Lote 2.5).
 *
 * Um script destrutivo não se valida "lendo com atenção": valida-se
 * provando, a cada execução da suíte, que ele recusa o que deve recusar
 * e preserva o que deve preservar. Nenhum teste abre conexão de rede —
 * o client é um dublê em memória (`support/fake-supabase-admin.mjs`).
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertArgsAreValid,
  assertPlanIsSafe,
  assertTenantIdentity,
  buildResetPlan,
  DEMO_TENANT,
  DYNAMIC_TABLES,
  PROTECTED_TABLES,
  parseArgs,
  ResetRefused,
  runReset,
} from "../db/seed/reset-demo.mjs";

import {
  ContractViolation,
  createFakeAdminSupabase,
  createHorizonteScenario,
  TABLE_CONTRACT,
} from "./support/fake-supabase-admin.mjs";

import { countScoped, scopeColumn } from "../db/seed/reset-demo.mjs";

const silencioso = () => {};

function totalDinamico(db) {
  return DYNAMIC_TABLES.reduce(
    (soma, table) => soma + (db.store[table]?.length ?? 0),
    0,
  );
}

function fotoEstrutural(db) {
  return Object.fromEntries(
    PROTECTED_TABLES.map((table) => [table, db.store[table]?.length ?? 0]),
  );
}

// ------------------------------------------- contrato com o schema real

test(
  "REGRESSÃO: institutions não tem institution_id — filtrar por ela é erro",
  () => {
    // O defeito original: `countScoped("institutions", …)` filtrava por
    // `institution_id`. Contra o Postgres seria 42703; com o dublê antigo
    // era um silencioso 0, que fazia `verifyBaseline` acusar "tabela
    // estrutural vazia". Agora o harness recusa.
    const db = createHorizonteScenario();
    assert.throws(
      () => db.from("institutions").select("id").eq("institution_id", "x"),
      ContractViolation,
    );
  },
);

test("REGRESSÃO: a instituição é escopada pelo próprio id", async () => {
  assert.equal(scopeColumn("institutions"), "id");
  const db = createHorizonteScenario();
  // Se o reset voltasse a usar institution_id aqui, isto lançaria.
  assert.equal(await countScoped(db, "institutions", DEMO_TENANT.id), 1);
});

test("toda tabela descendente é escopada por institution_id", async (t) => {
  const db = createHorizonteScenario();
  for (const table of DYNAMIC_TABLES) {
    await t.test(table, async () => {
      assert.equal(scopeColumn(table), "institution_id");
      assert.ok(
        TABLE_CONTRACT[table].includes("institution_id"),
        `${table} precisa ter institution_id no schema real`,
      );
      // Exercita a query de contagem contra o contrato.
      await countScoped(db, table, DEMO_TENANT.id);
    });
  }
});

test("toda tabela de verificação estrutural respeita o contrato", async (t) => {
  const db = createHorizonteScenario();
  for (const table of [
    "institutions",
    "users",
    "profiles",
    "teachers",
    "students",
    "classrooms",
    "enrollments",
    "lessons",
  ]) {
    await t.test(table, async () => {
      const contrato = TABLE_CONTRACT[table];
      assert.ok(contrato, `${table} sem contrato declarado`);
      assert.ok(contrato.includes("id"), `${table} precisa ter id`);
      assert.ok(
        contrato.includes(scopeColumn(table)),
        `${table} não tem a coluna de escopo ${scopeColumn(table)}`,
      );
      await countScoped(db, table, DEMO_TENANT.id);
    });
  }
});

test("missions é catálogo global e não tem institution_id", () => {
  // Exceção deliberada de D-023. Nunca entra em delete nem em contagem
  // tenant-scoped — filtrar por institution_id ali seria o mesmo defeito
  // em outra tabela.
  assert.equal(TABLE_CONTRACT.missions.includes("institution_id"), false);
  assert.equal(DYNAMIC_TABLES.includes("missions"), false);
  assert.ok(PROTECTED_TABLES.includes("missions"));
  const db = createHorizonteScenario();
  assert.throws(
    () => db.from("missions").select("id").eq("institution_id", "x"),
    ContractViolation,
  );
});

test("tabela fora do contrato conhecido é recusada pelo harness", () => {
  const db = createHorizonteScenario();
  assert.throws(() => db.from("tabela_inexistente"), ContractViolation);
});

test("coluna inventada em tabela conhecida é recusada", () => {
  const db = createHorizonteScenario();
  assert.throws(
    () => db.from("productions").select("id").eq("tenant_id", "x"),
    ContractViolation,
  );
});

// --------------------------------------------------------- plano seguro

test("nenhuma tabela estrutural entra no plano de remoção", () => {
  assertPlanIsSafe();
  for (const table of DYNAMIC_TABLES) {
    assert.equal(
      PROTECTED_TABLES.includes(table),
      false,
      `${table} não pode estar nas duas listas`,
    );
  }
});

test("o plano cobre o que a jornada escreve, mais o estado operacional", () => {
  assert.deepEqual([...DYNAMIC_TABLES].sort(), [
    "classroom_sync_states", // fora de D0–D6: estado operacional mutável
    "mission_assignments", // D1
    "mission_progress", // D2–D4
    "mission_reviews", // D5
    "productions", // D2/D3
    "reflections", // D4
  ]);
});

test("as tabelas estruturais do seed estão todas protegidas", () => {
  for (const table of [
    "institutions",
    "academic_years",
    "users",
    "profiles",
    "teachers",
    "students",
    "classrooms",
    "classroom_teachers",
    "enrollments",
    "subjects",
    "missions",
    "lessons",
  ]) {
    assert.ok(PROTECTED_TABLES.includes(table), `${table} desprotegida`);
  }
});

test("um plano que inclua tabela estrutural é recusado", () => {
  assert.throws(
    () => assertPlanIsSafe(["productions", "students"], PROTECTED_TABLES),
    ResetRefused,
  );
});

// ----------------------------------------------------- dupla confirmação

test("sem argumento nenhum, o modo é dry run", () => {
  const args = parseArgs([]);
  assert.equal(args.execute, false);
  assert.doesNotThrow(() => assertArgsAreValid(args));
});

test("--execute sozinho é recusado: falta a segunda confirmação", () => {
  assert.throws(() => assertArgsAreValid(parseArgs(["--execute"])), ResetRefused);
});

test("confirmação de tenant errado é recusada", () => {
  for (const errado of [
    "inst-beryon",
    "inst-horizonte ",
    "INST-HORIZONTE",
    "horizonte",
    "",
  ]) {
    assert.throws(
      () =>
        assertArgsAreValid(
          parseArgs(["--execute", `--confirm-tenant=${errado}`]),
        ),
      ResetRefused,
      `deveria recusar "${errado}"`,
    );
  }
});

test("as duas confirmações corretas passam", () => {
  const args = parseArgs(["--execute", `--confirm-tenant=${DEMO_TENANT.id}`]);
  assert.equal(args.execute, true);
  assert.equal(args.confirmTenant, DEMO_TENANT.id);
  assert.doesNotThrow(() => assertArgsAreValid(args));
});

test("argumento desconhecido nunca é ignorado", () => {
  for (const typo of ["--exceute", "--confirm-tenat=inst-horizonte", "-f"]) {
    assert.throws(() => assertArgsAreValid(parseArgs([typo])), ResetRefused);
  }
});

test("confirmação por variável de ambiente não arma o script", () => {
  process.env.IAH_DEMO_RESET_CONFIRM = DEMO_TENANT.id;
  try {
    assert.throws(
      () => assertArgsAreValid(parseArgs(["--execute"])),
      ResetRefused,
      "só argumento explícito pode armar a destruição",
    );
  } finally {
    delete process.env.IAH_DEMO_RESET_CONFIRM;
  }
});

// ------------------------------------------------------ identidade

test("banco sem o Instituto Horizonte é recusado", async () => {
  const db = createFakeAdminSupabase({ institutions: [] });
  await assert.rejects(() => assertTenantIdentity(db), ResetRefused);
});

test("id certo com nome ou domínio diferente é recusado", async () => {
  const variacoes = [
    { id: DEMO_TENANT.id, name: "Colégio Beryon", domain: DEMO_TENANT.domain },
    { id: DEMO_TENANT.id, name: DEMO_TENANT.name, domain: "colegioberyon.com.br" },
    { id: DEMO_TENANT.id, name: "", domain: "" },
  ];
  for (const institution of variacoes) {
    const db = createFakeAdminSupabase({ institutions: [institution] });
    await assert.rejects(
      () => assertTenantIdentity(db),
      ResetRefused,
      `deveria recusar ${JSON.stringify(institution)}`,
    );
  }
});

test("identidade completa e exata é aceita", async () => {
  const db = createHorizonteScenario();
  const institution = await assertTenantIdentity(db);
  assert.equal(institution.id, DEMO_TENANT.id);
});

test("tenant errado não chega a apagar nada", async () => {
  const db = createHorizonteScenario();
  db.store.institutions[0].name = "Outra Escola";
  const antes = totalDinamico(db);
  await assert.rejects(
    () =>
      runReset(db, {
        execute: true,
        confirmTenant: DEMO_TENANT.id,
        log: silencioso,
      }),
    ResetRefused,
  );
  assert.equal(totalDinamico(db), antes, "nenhuma linha pode ter sumido");
  assert.equal(
    db.ops.some((op) => op.mode === "delete"),
    false,
    "nenhum DELETE pode ter sido emitido",
  );
});

// ------------------------------------------------------------- dry run

test("dry run não altera absolutamente nada", async () => {
  const db = createHorizonteScenario();
  const dinamicoAntes = totalDinamico(db);
  const estruturaAntes = fotoEstrutural(db);

  const resultado = await runReset(db, { log: silencioso });

  assert.equal(resultado.executed, false);
  assert.equal(totalDinamico(db), dinamicoAntes);
  assert.deepEqual(fotoEstrutural(db), estruturaAntes);
  assert.equal(
    db.ops.some((op) => op.mode === "delete"),
    false,
    "dry run não pode emitir DELETE",
  );
});

test("o dry run informa a contagem real por tabela, na ordem de remoção", async () => {
  const db = createHorizonteScenario();
  const { plan } = await runReset(db, { log: silencioso });
  assert.deepEqual(
    plan.map((item) => item.table),
    [...DYNAMIC_TABLES],
  );
  assert.deepEqual(
    plan.map((item) => item.count),
    // reviews, reflections, productions, progress, assignments, sync
    [1, 1, 2, 2, 1, 2],
  );
});

// ------------------------------------------------------------- execução

test("execução limpa o dinâmico e preserva todo o estrutural", async () => {
  const db = createHorizonteScenario();
  const estruturaAntes = fotoEstrutural(db);

  const resultado = await runReset(db, {
    execute: true,
    confirmTenant: DEMO_TENANT.id,
    log: silencioso,
  });

  assert.equal(resultado.executed, true);
  assert.equal(totalDinamico(db), 0, "nenhum dado dinâmico pode sobrar");
  assert.deepEqual(
    fotoEstrutural(db),
    estruturaAntes,
    "nenhuma linha estrutural pode ter sido tocada",
  );
});

test("todo DELETE emitido é tenant-scoped", async () => {
  const db = createHorizonteScenario();
  await runReset(db, {
    execute: true,
    confirmTenant: DEMO_TENANT.id,
    log: silencioso,
  });

  const deletes = db.ops.filter((op) => op.mode === "delete");
  assert.equal(deletes.length, DYNAMIC_TABLES.length);
  for (const op of deletes) {
    assert.ok(
      op.filters.some(
        ([column, value]) =>
          column === "institution_id" && value === DEMO_TENANT.id,
      ),
      `DELETE em ${op.table} saiu sem filtro institucional`,
    );
    assert.equal(
      PROTECTED_TABLES.includes(op.table),
      false,
      `DELETE atingiu tabela estrutural: ${op.table}`,
    );
  }
});

test("dados de outra instituição no mesmo banco não são tocados", async () => {
  const db = createHorizonteScenario();
  db.store.productions.push(
    { id: "production-outra-01", institution_id: "inst-outra-escola" },
    { id: "production-outra-02", institution_id: "inst-outra-escola" },
  );
  db.store.mission_reviews.push({
    id: "review-outra-01",
    institution_id: "inst-outra-escola",
  });

  await runReset(db, {
    execute: true,
    confirmTenant: DEMO_TENANT.id,
    log: silencioso,
  });

  const sobreviventes = [...db.store.productions, ...db.store.mission_reviews];
  assert.equal(sobreviventes.length, 3);
  for (const row of sobreviventes) {
    assert.equal(row.institution_id, "inst-outra-escola");
  }
});

test("execução sem a segunda confirmação é recusada antes de qualquer delete", async () => {
  const db = createHorizonteScenario();
  const antes = totalDinamico(db);
  await assert.rejects(
    () => runReset(db, { execute: true, log: silencioso }),
    ResetRefused,
  );
  assert.equal(totalDinamico(db), antes);
});

// ------------------------------------------- classroom_sync_states (L2.5)

test("classroom_sync_states está no plano e é tenant-scoped", () => {
  assert.ok(DYNAMIC_TABLES.includes("classroom_sync_states"));
  assert.equal(PROTECTED_TABLES.includes("classroom_sync_states"), false);
});

test("o dry run conta classroom_sync_states quando há registros", async () => {
  const db = createHorizonteScenario();
  const { plan } = await runReset(db, { log: silencioso });
  const item = plan.find((p) => p.table === "classroom_sync_states");
  assert.ok(item, "a tabela precisa aparecer no plano");
  assert.equal(item.count, 2);
});

test("o dry run não remove nenhum registro de classroom_sync_states", async () => {
  const db = createHorizonteScenario();
  const antes = db.store.classroom_sync_states.length;
  await runReset(db, { log: silencioso });
  assert.equal(db.store.classroom_sync_states.length, antes);
  assert.equal(
    db.ops.some(
      (op) => op.mode === "delete" && op.table === "classroom_sync_states",
    ),
    false,
  );
});

test("execute remove classroom_sync_states somente do Instituto Horizonte", async () => {
  const db = createHorizonteScenario();
  db.store.classroom_sync_states.push(
    { id: "sync-outra-01", institution_id: "inst-outra-escola" },
    { id: "sync-outra-02", institution_id: "inst-outra-escola" },
  );

  await runReset(db, {
    execute: true,
    confirmTenant: DEMO_TENANT.id,
    log: silencioso,
  });

  assert.equal(db.store.classroom_sync_states.length, 2);
  for (const row of db.store.classroom_sync_states) {
    assert.equal(row.institution_id, "inst-outra-escola");
  }

  const op = db.ops.find(
    (o) => o.mode === "delete" && o.table === "classroom_sync_states",
  );
  assert.ok(
    op.filters.some(
      ([column, value]) =>
        column === "institution_id" && value === DEMO_TENANT.id,
    ),
    "o DELETE precisa filtrar explicitamente por institution_id",
  );
});

test("a estrutura da turma sobrevive à limpeza do estado de sincronização", async () => {
  const db = createHorizonteScenario();
  const antes = {
    classrooms: db.store.classrooms.length,
    classroom_teachers: db.store.classroom_teachers.length,
    enrollments: db.store.enrollments.length,
    students: db.store.students.length,
  };

  await runReset(db, {
    execute: true,
    confirmTenant: DEMO_TENANT.id,
    log: silencioso,
  });

  assert.equal(db.store.classroom_sync_states.length, 0);
  assert.deepEqual(
    {
      classrooms: db.store.classrooms.length,
      classroom_teachers: db.store.classroom_teachers.length,
      enrollments: db.store.enrollments.length,
      students: db.store.students.length,
    },
    antes,
    "turma, vínculos e matrículas não podem ser afetados",
  );
});

test("reset repetido continua idempotente com classroom_sync_states", async () => {
  const db = createHorizonteScenario();
  for (let i = 0; i < 3; i += 1) {
    await runReset(db, {
      execute: true,
      confirmTenant: DEMO_TENANT.id,
      log: silencioso,
    });
    assert.equal(db.store.classroom_sync_states.length, 0);
  }
  const plano = await buildResetPlan(db);
  assert.equal(
    plano.find((p) => p.table === "classroom_sync_states").count,
    0,
  );
});

test("baseline do seed é nenhuma linha em classroom_sync_states", async () => {
  // Nem o seed do banco (`seed-demo.mjs`) nem o do modo demonstração
  // (`seed-repositories.ts`) criam registro aqui — o reset devolve ao
  // mesmo estado em que o ambiente nasce.
  const db = createFakeAdminSupabase({
    institutions: [{ ...DEMO_TENANT }],
    classroom_sync_states: [],
  });
  const plano = await buildResetPlan(db);
  assert.equal(
    plano.find((p) => p.table === "classroom_sync_states").count,
    0,
  );
});

// ---------------------------------------------------------- idempotência

test("reset → reset novamente é seguro e não muda a estrutura", async () => {
  const db = createHorizonteScenario();
  const estruturaAntes = fotoEstrutural(db);

  await runReset(db, {
    execute: true,
    confirmTenant: DEMO_TENANT.id,
    log: silencioso,
  });
  const segunda = await runReset(db, {
    execute: true,
    confirmTenant: DEMO_TENANT.id,
    log: silencioso,
  });

  assert.equal(segunda.executed, true);
  assert.equal(totalDinamico(db), 0);
  assert.deepEqual(fotoEstrutural(db), estruturaAntes);
  assert.deepEqual(
    segunda.plan.map((item) => item.count),
    DYNAMIC_TABLES.map(() => 0),
    "o segundo plano encontra zero registros",
  );
});

test("seed → reset → seed converge para o mesmo baseline", async () => {
  const db = createHorizonteScenario();
  const estruturaSemeada = fotoEstrutural(db);

  await runReset(db, {
    execute: true,
    confirmTenant: DEMO_TENANT.id,
    log: silencioso,
  });

  // "reseed": o seed é upsert por id, então reexecutar não duplica
  // estrutura e não recria dado dinâmico (ele não semeia progresso).
  assert.deepEqual(fotoEstrutural(db), estruturaSemeada);
  assert.equal(totalDinamico(db), 0);

  const plano = await buildResetPlan(db);
  assert.deepEqual(
    plano.map((item) => item.count),
    DYNAMIC_TABLES.map(() => 0),
  );
});

// ----------------------------------------------------------- vazamento

test("nenhuma saída expõe URL, chave ou senha", async () => {
  const db = createHorizonteScenario();
  const linhas = [];
  await runReset(db, {
    execute: true,
    confirmTenant: DEMO_TENANT.id,
    log: (linha) => linhas.push(String(linha)),
  });
  const saida = linhas.join("\n");
  for (const proibido of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "AUTH_SECRET",
    "IAH_DEMO_PASSWORD",
    "supabase.co",
    "https://",
    "password",
  ]) {
    assert.equal(
      saida.includes(proibido),
      false,
      `saída não pode conter "${proibido}"`,
    );
  }
});

test("o script não carrega nenhum secret hardcoded", async () => {
  const { readFile } = await import("node:fs/promises");
  const fonte = await readFile(
    new URL("../db/seed/reset-demo.mjs", import.meta.url),
    "utf8",
  );
  assert.equal(
    /eyJ[A-Za-z0-9_-]{20,}/.test(fonte),
    false,
    "parece haver um JWT embutido",
  );
  assert.equal(
    /(SERVICE_ROLE_KEY|AUTH_SECRET|IAH_DEMO_PASSWORD)\s*=\s*["'][^"']+["']/.test(
      fonte,
    ),
    false,
    "parece haver um secret atribuído no código",
  );
  // As variáveis são LIDAS do ambiente, nunca definidas aqui.
  assert.ok(fonte.includes("process.env.NEXT_PUBLIC_SUPABASE_URL"));
  assert.ok(fonte.includes("process.env.SUPABASE_SERVICE_ROLE_KEY"));
});
