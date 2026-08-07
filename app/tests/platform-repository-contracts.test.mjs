/**
 * A regra multi-tenant do contrato: todo método de repositório recebe
 * `institutionId` como PRIMEIRO parâmetro.
 *
 * O comentário no topo de `domain/repositories.ts` chama isso de
 * inegociável — este teste é o que torna a frase verificável. A
 * verificação é feita sobre o TEXTO do contrato, de propósito: as
 * interfaces somem na compilação, então nenhum teste de runtime
 * alcançaria a assinatura. Um método novo sem `institutionId` quebra
 * aqui antes de existir uma implementação para esquecer de filtrar.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const CONTRACTS_PATH = new URL(
  "../src/modules/platform/domain/repositories.ts",
  import.meta.url,
);

/**
 * Exceções conscientes — as duas entidades que NÃO são dado de tenant:
 *
 *  - Instituição: é o próprio tenant, não existe uma instituição
 *    "acima" dela para filtrar;
 *  - Missão: é catálogo do produto IAH, compartilhado por todas as
 *    instituições. A tabela `missions` (migration 0001) não tem coluna
 *    `institution_id` — o vínculo com a escola mora em
 *    `mission_progress`/`mission_assignments`, que têm.
 *
 * Qualquer adição a esta lista é decisão de arquitetura, não ajuste de
 * teste: exige coluna sem `institution_id` na migration correspondente.
 */
const NON_TENANT_METHODS = new Set([
  "InstitutionRepository.getById",
  "InstitutionRepository.list",
  "MissionRecordRepository.list",
]);

const source = readFileSync(CONTRACTS_PATH, "utf8");

/** Extrai `{ interface, método, primeiro parâmetro }` de cada assinatura. */
function parseRepositoryMethods(text) {
  const methods = [];
  const interfaceBlocks = text.matchAll(
    /export interface (\w*Repository)\s*\{([\s\S]*?)\n\}/g,
  );

  for (const [, interfaceName, body] of interfaceBlocks) {
    // Assinatura = nome seguido de "(" no primeiro nível do bloco.
    const signatures = body.matchAll(/^ {2}(\w+)\(([\s\S]*?)\):/gm);
    for (const [, methodName, params] of signatures) {
      const first = params
        .split(",")[0]
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim()
        .split(":")[0]
        .replace(/\?$/, "")
        .trim();
      methods.push({
        qualified: `${interfaceName}.${methodName}`,
        firstParam: first,
      });
    }
  }
  return methods;
}

const methods = parseRepositoryMethods(source);

test("o parser realmente encontrou os contratos", () => {
  // Trava contra falso verde: se a regex parar de casar (refatoração do
  // arquivo), o teste abaixo passaria vazio sem verificar nada.
  assert.ok(
    methods.length >= 20,
    `esperava dezenas de métodos, achei ${methods.length}`,
  );
  const interfaces = new Set(methods.map((m) => m.qualified.split(".")[0]));
  assert.ok(interfaces.size >= 10, `poucas interfaces: ${interfaces.size}`);
});

test("todo método de repositório recebe institutionId primeiro", () => {
  const offenders = methods
    .filter((m) => !NON_TENANT_METHODS.has(m.qualified))
    .filter((m) => m.firstParam !== "institutionId")
    .map((m) => `${m.qualified}(${m.firstParam}, …)`);

  assert.deepEqual(
    offenders,
    [],
    "métodos sem isolamento por tenant no contrato:\n" + offenders.join("\n"),
  );
});

test("as exceções ainda existem e continuam sem coluna de instituição", () => {
  const qualified = new Set(methods.map((m) => m.qualified));
  for (const exception of NON_TENANT_METHODS) {
    assert.ok(
      qualified.has(exception),
      `exceção obsoleta no teste: ${exception} não existe mais no contrato`,
    );
    assert.match(exception, /^(Institution|MissionRecord)Repository\./);
  }

  // A exceção da Missão só se sustenta enquanto a tabela for global.
  const schema = readFileSync(
    new URL("../db/migrations/0001_initial_schema.sql", import.meta.url),
    "utf8",
  );
  const missions = schema.match(/create table missions \(([\s\S]*?)\);/);
  assert.ok(missions, "tabela missions não encontrada na migration 0001");
  assert.equal(
    missions[1].includes("institution_id"),
    false,
    "missions ganhou institution_id — a exceção do catálogo caiu",
  );
});

test("o agregado PlatformRepositories reúne os contratos", () => {
  const aggregate = source.match(
    /export interface PlatformRepositories\s*\{([\s\S]*?)\n\}/,
  );
  assert.ok(aggregate, "PlatformRepositories não encontrado");
  const declared = [...aggregate[1].matchAll(/(\w+)Repository;/g)].length;
  assert.ok(declared >= 10, `agregado com poucos repositórios: ${declared}`);
});

test("o contrato declara por escrito a regra multi-tenant", () => {
  // O comentário é parte do contrato: quem for adicionar um método
  // precisa encontrar a regra no próprio arquivo, não só neste teste.
  assert.match(source, /institutionId` como primeiro parâmetro/);
});
