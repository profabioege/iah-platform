/**
 * IAH Educacional — Reset do ambiente demonstrativo (Lote 2.5).
 *
 * Devolve o tenant fictício Instituto Horizonte ao estado D0 da jornada
 * de demonstração, apagando APENAS o que a jornada produz (publicação,
 * progresso, produção, reflexão, avaliação) e preservando toda a
 * estrutura semeada por `seed-demo.mjs` (instituição, ano letivo,
 * contas, perfis, professor, alunos, turmas, matrículas, disciplina,
 * Missão e Lesson).
 *
 * O objetivo NÃO é apagar banco. É tornar a demonstração REPRODUZÍVEL:
 *
 *   seed → D0–D6 → reset → D0 novamente → …
 *
 * Uso (na pasta app/):
 *
 *   node db/seed/reset-demo.mjs
 *       → DRY RUN (padrão): só diagnostica, nunca altera nada.
 *
 *   node db/seed/reset-demo.mjs --execute --confirm-tenant=inst-horizonte
 *       → executa de fato. Exige as DUAS confirmações.
 *
 * Variáveis exigidas (as mesmas da arquitetura, ver app/.env.example):
 *   NEXT_PUBLIC_SUPABASE_URL   — URL do projeto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  — service role (só servidor/CLI)
 *
 * Nenhum valor de variável, URL ou chave é impresso em qualquer modo.
 *
 * ============================================================
 * ESCOPO PERMANENTE — leia antes de reaproveitar este arquivo
 * ============================================================
 *
 * Este script é EXCLUSIVAMENTE uma ferramenta de desenvolvimento e
 * demonstração do tenant fictício Instituto Horizonte. Ele recusa, por
 * construção, qualquer tenant diferente de `inst-horizonte` — e essa
 * recusa é uma decisão de produto, não uma limitação a ser removida.
 *
 * Este script NÃO É:
 *   - ferramenta de exclusão de instituição real;
 *   - ferramenta de offboarding de cliente;
 *   - ferramenta administrativa multi-tenant;
 *   - mecanismo de atendimento a pedido de exclusão sob a LGPD;
 *   - mecanismo de reset de escola real.
 *
 * Cada um desses casos tem requisitos que este script não atende —
 * trilha de auditoria, base legal, retenção, comprovação de exclusão,
 * autorização humana registrada. Generalizá-lo sem esses requisitos
 * transformaria uma ferramenta de laboratório em risco operacional.
 *
 * ============================================================
 * LIMITAÇÃO CONHECIDA E ACEITA
 * ============================================================
 *
 * RESET MULTI-TABLE TRANSACTION = P2 (ambiente demonstrativo) /
 *                                 P1 antes de virar ferramenta genérica
 *
 * As remoções não correm dentro de uma transação única: cada tabela é
 * um DELETE independente. Uma falha no meio deixa o tenant parcialmente
 * limpo. Para o ambiente fictício, isso é aceito porque o script é
 * fail-fast (para no primeiro erro, sem continuar em silêncio),
 * idempotente (reexecutar conclui o que faltou) e valida o baseline ao
 * final. Resolver de verdade exigiria RPC/stored procedure e uma
 * migration nova — deliberadamente fora do escopo desta etapa.
 */

import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

/**
 * Identidade completa do tenant fictício. As TRÊS propriedades são
 * conferidas antes de qualquer delete: um projeto Supabase que responda
 * `inst-horizonte` com outro nome ou outro domínio não é este ambiente,
 * e o script recusa em vez de adivinhar.
 */
export const DEMO_TENANT = Object.freeze({
  id: "inst-horizonte",
  name: "Instituto Horizonte",
  domain: "institutohorizonte.edu.br",
});

/**
 * Tabelas DINÂMICAS — o que a jornada D1–D6 escreve. Todas possuem
 * `institution_id NOT NULL`, então todo delete é tenant-scoped.
 *
 * A ordem desfaz a jornada de trás para frente. Nenhuma das cinco é
 * referenciada por outra tabela (verificado nas migrations 0001–0009),
 * então não há dependência de chave estrangeira entre elas; a ordem é
 * determinística por clareza, não por obrigação do banco.
 */
export const DYNAMIC_TABLES = Object.freeze([
  "mission_reviews", // D5 — avaliação e devolutiva
  "reflections", // D4 — reflexão no Diário
  "productions", // D2/D3 — produção e entrega
  "mission_progress", // D2–D4 — status do aluno na Missão
  "mission_assignments", // D1 — publicação da Mission na turma
  // Fora de D0–D6, incluída deliberadamente: é estado operacional
  // mutável e tenant-scoped. O baseline é NENHUMA LINHA — nem o seed do
  // banco nem o do modo demonstração criam registro aqui, e hoje nada na
  // interface chega a escrever (`classroom-sync-service` existe, mas
  // `.sync()` não tem call site: o repositório do Google Classroom ainda
  // é stub). Limpar é no-op hoje e rede de segurança amanhã, quando a
  // sincronização for ligada — bem mais barato que descobrir resíduo
  // depois de uma demonstração.
  "classroom_sync_states",
]);

/**
 * Tabelas ESTRUTURAIS — semeadas por `seed-demo.mjs`, jamais apagadas.
 * Listadas explicitamente para que `assertPlanIsSafe()` possa provar, a
 * cada execução, que nenhuma delas entrou no plano por engano.
 *
 * `missions` está aqui e é um caso especial: é catálogo GLOBAL do IAH e
 * não tem `institution_id` (exceção deliberada de D-023). Um delete
 * nessa tabela nunca poderia ser tenant-scoped — motivo a mais para
 * nunca tocá-la.
 */
export const PROTECTED_TABLES = Object.freeze([
  "institutions",
  "academic_years",
  "users",
  "profiles",
  "teachers",
  "classrooms",
  "classroom_teachers",
  "students",
  "enrollments",
  "subjects",
  "missions",
  "lessons",
]);

/**
 * Estruturais conferidas depois do reset. Não é comparação de contagem
 * exata (o seed pode crescer): a asserção é que NENHUMA ficou vazia —
 * tabela estrutural zerada significa destruição acidental.
 */
export const STRUCTURAL_CHECKS = Object.freeze([
  "institutions",
  "users",
  "profiles",
  "teachers",
  "students",
  "classrooms",
  "enrollments",
  "lessons",
]);

/** Erro de uso/segurança — separado de falha de banco. */
export class ResetRefused extends Error {}

// ---------------------------------------------------------------- args

/**
 * Dupla confirmação por ARGUMENTO, não por variável de ambiente: uma
 * variável exportada na sessão do shell continua armada nas execuções
 * seguintes, e é exatamente assim que um reset acidental acontece. Um
 * argumento precisa ser digitado a cada vez.
 */
export function parseArgs(argv = []) {
  let execute = false;
  let confirmTenant = null;
  const unknown = [];

  for (const arg of argv) {
    if (arg === "--execute") {
      execute = true;
    } else if (arg.startsWith("--confirm-tenant=")) {
      confirmTenant = arg.slice("--confirm-tenant=".length);
    } else {
      unknown.push(arg);
    }
  }

  return { execute, confirmTenant, unknown };
}

/**
 * Um argumento desconhecido nunca é ignorado: `--exceute` cairia em dry
 * run silencioso, e `--confirm-tenat=` deixaria o operador convencido de
 * que confirmou algo que não confirmou.
 */
export function assertArgsAreValid({ execute, confirmTenant, unknown }) {
  if (unknown.length > 0) {
    throw new ResetRefused(
      `Argumento desconhecido: ${unknown.join(", ")}. ` +
        "Use apenas --execute e --confirm-tenant=<id>.",
    );
  }
  if (!execute) return; // dry run não exige mais nada

  if (!confirmTenant) {
    throw new ResetRefused(
      "--execute exige a segunda confirmação: " +
        `--confirm-tenant=${DEMO_TENANT.id}`,
    );
  }
  if (confirmTenant !== DEMO_TENANT.id) {
    throw new ResetRefused(
      `Confirmação não corresponde ao tenant deste script ` +
        `(recebido "${confirmTenant}", esperado "${DEMO_TENANT.id}").`,
    );
  }
}

/** Prova, a cada execução, que estrutural e dinâmico não se cruzam. */
export function assertPlanIsSafe(
  dynamicTables = DYNAMIC_TABLES,
  protectedTables = PROTECTED_TABLES,
) {
  const invasoras = dynamicTables.filter((t) => protectedTables.includes(t));
  if (invasoras.length > 0) {
    throw new ResetRefused(
      `Tabela estrutural no plano de remoção: ${invasoras.join(", ")}.`,
    );
  }
}

// -------------------------------------------------------------- tenant

/**
 * Carrega e confere a identidade do tenant. Recusa se a instituição não
 * existir ou se qualquer uma das três propriedades divergir.
 */
export async function assertTenantIdentity(db) {
  const { data, error } = await db
    .from("institutions")
    .select("id, name, domain")
    .eq("id", DEMO_TENANT.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao ler institutions: ${error.message}`);
  }
  if (!data) {
    throw new ResetRefused(
      `Instituição "${DEMO_TENANT.id}" não existe neste banco. ` +
        "Este script só opera no ambiente demonstrativo.",
    );
  }
  for (const campo of ["id", "name", "domain"]) {
    if (data[campo] !== DEMO_TENANT[campo]) {
      throw new ResetRefused(
        `Identidade do tenant não confere em "${campo}". ` +
          "Este banco não é o ambiente demonstrativo do Instituto Horizonte.",
      );
    }
  }
  return data;
}

// --------------------------------------------------------------- plano

/**
 * Coluna que amarra a linha ao tenant. `institutions` é a raiz: ela não
 * tem `institution_id`, o próprio `id` é o tenant. Todas as demais
 * tabelas deste script têm `institution_id NOT NULL`.
 */
export function scopeColumn(table) {
  return table === "institutions" ? "id" : "institution_id";
}

/** Contagem tenant-scoped, sem trazer nenhuma linha (head: true). */
export async function countScoped(db, table, institutionId) {
  const { count, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(scopeColumn(table), institutionId);
  if (error) throw new Error(`Falha ao contar ${table}: ${error.message}`);
  return count ?? 0;
}

/** Plano de remoção: tabela + quantos registros existem hoje. */
export async function buildResetPlan(db, institutionId = DEMO_TENANT.id) {
  const plan = [];
  for (const table of DYNAMIC_TABLES) {
    plan.push({ table, count: await countScoped(db, table, institutionId) });
  }
  return plan;
}

// ------------------------------------------------------------- execução

/**
 * Delete SEMPRE com filtro institucional, e SEMPRE numa tabela dinâmica.
 * O filtro é literalmente `institution_id` — nunca `scopeColumn()` —
 * porque a única tabela cujo escopo é o `id` é `institutions`, e apagar
 * linha de `institutions` é exatamente o que este script não pode fazer.
 * A verificação de pertinência é redundante com `assertPlanIsSafe()` de
 * propósito: num script destrutivo, redundância é barata.
 */
async function deleteScoped(db, table, institutionId) {
  if (!DYNAMIC_TABLES.includes(table)) {
    throw new ResetRefused(`Tabela fora do plano de remoção: ${table}.`);
  }
  const { error } = await db
    .from(table)
    .delete()
    .eq("institution_id", institutionId);
  if (error) throw new Error(`Falha ao limpar ${table}: ${error.message}`);
}

/** Confere que o baseline D0 foi atingido — dinâmico zerado, estrutura viva. */
export async function verifyBaseline(db, institutionId = DEMO_TENANT.id) {
  const restante = [];
  for (const table of DYNAMIC_TABLES) {
    const count = await countScoped(db, table, institutionId);
    if (count > 0) restante.push(`${table} (${count})`);
  }
  if (restante.length > 0) {
    throw new Error(`Baseline não atingido — ainda há: ${restante.join(", ")}.`);
  }

  const vazias = [];
  const estrutura = [];
  for (const table of STRUCTURAL_CHECKS) {
    const count = await countScoped(db, table, institutionId);
    estrutura.push({ table, count });
    if (count === 0) vazias.push(table);
  }
  if (vazias.length > 0) {
    throw new Error(
      `Tabela estrutural vazia após o reset: ${vazias.join(", ")}. ` +
        "Isso indica remoção indevida — investigar antes de reexecutar o seed.",
    );
  }
  return estrutura;
}

/**
 * Ponto único de execução. Recebe o client por parâmetro para que os
 * testes possam exercitá-lo sem nenhuma conexão de rede.
 */
export async function runReset(db, options = {}) {
  const { execute = false, confirmTenant = null, log = console.log } = options;

  assertPlanIsSafe();
  assertArgsAreValid({ execute, confirmTenant, unknown: [] });
  await assertTenantIdentity(db);

  const plan = await buildResetPlan(db);
  const total = plan.reduce((soma, item) => soma + item.count, 0);

  log(`Tenant alvo: ${DEMO_TENANT.name} (${DEMO_TENANT.id})`);
  log(`Modo: ${execute ? "EXECUÇÃO" : "DRY RUN (nada será alterado)"}`);
  log("Ordem de remoção e registros encontrados:");
  for (const [i, item] of plan.entries()) {
    log(`  ${i + 1}. ${item.table} — ${item.count} registro(s)`);
  }
  log(`Total dinâmico: ${total} registro(s).`);

  if (!execute) {
    log("");
    log("Nenhuma alteração executada. Para executar de fato:");
    log(
      `  node db/seed/reset-demo.mjs --execute --confirm-tenant=${DEMO_TENANT.id}`,
    );
    return { executed: false, plan, structure: null };
  }

  for (const { table } of plan) {
    await deleteScoped(db, table, DEMO_TENANT.id);
    log(`✓ ${table} limpo`);
  }

  const structure = await verifyBaseline(db);
  log("");
  log("Baseline D0 restaurado. Estrutura preservada:");
  for (const { table, count } of structure) {
    log(`  ${table}: ${count}`);
  }
  return { executed: true, plan, structure };
}

// ----------------------------------------------------------------- CLI

async function main(argv) {
  const args = parseArgs(argv);
  assertArgsAreValid(args);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new ResetRefused(
      "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY " +
        "antes de executar o reset.",
    );
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  await runReset(db, {
    execute: args.execute,
    confirmTenant: args.confirmTenant,
  });
}

const invocadoDiretamente =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invocadoDiretamente) {
  main(process.argv.slice(2)).catch((error) => {
    // Só a mensagem — nunca a stack, que poderia conter a URL do projeto.
    console.error(
      error instanceof ResetRefused
        ? `Reset recusado: ${error.message}`
        : (error.message ?? String(error)),
    );
    process.exit(1);
  });
}
