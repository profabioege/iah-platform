/**
 * Registra os hooks de resolução dos testes.
 *
 * Importar ESTE arquivo (estaticamente, na primeira linha do teste)
 * antes de qualquer `await import()` do código da Plataforma. Os imports
 * estáticos de um módulo ESM são avaliados na ordem em que aparecem, e
 * os hooks só valem para o que é resolvido depois do registro — daí a
 * regra dos testes deste lote: alias e stubs primeiro, `await import()`
 * do alvo dentro do corpo.
 *
 * `npm test` casa `tests/*.test.mjs`; nada dentro de `tests/support/`
 * é executado como suíte.
 */

import { register } from "node:module";

const srcRoot = new URL("../../src/", import.meta.url).href;
const stub = (name) => new URL(`./stubs/${name}`, import.meta.url).href;
const source = (path) => new URL(path, srcRoot).href;

register("./resolve-hooks.mjs", {
  parentURL: import.meta.url,
  data: {
    srcRoot,
    // Módulos que só existem dentro do runtime do Next.js.
    bare: {
      "next/server": stub("next-server.mjs"),
      "next/cache": stub("next-cache.mjs"),
      "next/headers": stub("next-headers.mjs"),
      "next/navigation": stub("next-navigation.mjs"),
    },
    // Bordas de infraestrutura, trocadas pelo endereço já resolvido.
    byUrl: {
      [source("auth.ts")]: stub("auth.mjs"),
      [source("modules/platform/infrastructure/database/admin-client.ts")]:
        stub("admin-client.mjs"),
      [source("modules/platform/infrastructure/repository-factory.ts")]:
        stub("repository-factory.mjs"),
    },
  },
});
