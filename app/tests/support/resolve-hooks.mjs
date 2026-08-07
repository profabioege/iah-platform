/**
 * Hooks de resolução de módulo (`node:module`) usados pelos testes.
 *
 * Rodam na thread de hooks do Node, isolados do teste — por isso só
 * trocam ENDEREÇOS de módulo, nunca objetos. Duas responsabilidades:
 *
 *  1. resolver o alias `@/…` do tsconfig para `src/…` (o Node não lê
 *     `paths` do TypeScript, e sem isso quase nada da Plataforma é
 *     importável em `node --test`);
 *  2. substituir por stubs os módulos que só existem dentro do runtime
 *     do Next.js (`next/server`, `next/cache`, `next/headers`) e as três
 *     bordas de infraestrutura (`@/auth`, cliente Supabase admin,
 *     factory de repositórios).
 *
 * A substituição é feita pelo endereço JÁ RESOLVIDO, não pelo texto do
 * import: assim o stub vale tanto para `@/modules/platform/...` quanto
 * para o mesmo arquivo alcançado por caminho relativo a partir de um
 * barrel — que é como as Server Actions chegam à factory.
 */

import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** @type {{ srcRoot: string, bare: Record<string,string>, byUrl: Record<string,string> }} */
let config;

export async function initialize(data) {
  config = data;
}

const isFile = (path) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

/** Acrescenta a extensão que o TypeScript deixa implícita no import. */
function withExtension(url) {
  const path = fileURLToPath(url);
  if (isFile(path)) return url;
  for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (isFile(path + suffix)) return url + suffix;
  }
  return url;
}

/**
 * Endereço final do especificador, já com a extensão que o TypeScript
 * omite — tanto no alias `@/…` quanto no caminho relativo entre
 * arquivos `.ts` (`./institution-seed`, `../domain/workspace-context`).
 */
function target(specifier, context) {
  if (specifier.startsWith("@/")) {
    return withExtension(new URL(specifier.slice(2), config.srcRoot).href);
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parent = context.parentURL;
    if (parent?.startsWith("file:")) {
      return withExtension(new URL(specifier, parent).href);
    }
  }
  return specifier;
}

export async function resolve(specifier, context, nextResolve) {
  const bare = config.bare[specifier];
  if (bare) return { url: bare, shortCircuit: true };

  const resolved = await nextResolve(target(specifier, context), context);

  const override = config.byUrl[resolved.url];
  return override ? { url: override, shortCircuit: true } : resolved;
}
