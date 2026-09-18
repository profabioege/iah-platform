/**
 * Hooks de módulo dos testes do PILOTO.
 *
 * Diferença essencial para `tests/support/module-hooks.mjs`: aqui NÃO se
 * substitui nenhuma borda de infraestrutura. O alvo destes testes é
 * justamente o caminho real — cliente Supabase de verdade, repositórios
 * de verdade, PostgREST e PostgreSQL de verdade. Só os módulos que só
 * existem dentro do runtime do Next.js (`next/cache`, `next/headers`,
 * `next/navigation`, `next/server`) e o alias `@/…` são resolvidos.
 *
 * `@/auth` é trocado por um stub controlado pelo teste: ele representa a
 * SESSÃO já emitida pelo Auth.js. O login por senha continua sendo
 * exercitado de verdade, chamando `authorize` diretamente
 * (`pilot-session.mjs`) — o stub só carrega para as telas e ações a
 * sessão que aquele login devolveu.
 */

import { register } from "node:module";

const srcRoot = new URL("../../../src/", import.meta.url).href;
const stub = (name) => new URL(`../../support/stubs/${name}`, import.meta.url).href;
const pilotStub = (name) => new URL(`./${name}`, import.meta.url).href;

register("../../support/resolve-hooks.mjs", {
  parentURL: import.meta.url,
  data: {
    srcRoot,
    bare: {
      "next/server": stub("next-server.mjs"),
      "next/cache": stub("next-cache.mjs"),
      "next/headers": stub("next-headers.mjs"),
      "next/navigation": stub("next-navigation.mjs"),
    },
    byUrl: {
      [new URL("auth.ts", srcRoot).href]: pilotStub("auth-session-stub.mjs"),
    },
  },
});
