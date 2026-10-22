/**
 * Títulos das páginas: o layout raiz aplica o modelo "%s | IAH Educacional";
 * cada página define só o próprio título. Uma página que repita o sufixo
 * sai na aba como "X | IAH Educacional | IAH Educacional" (registro do
 * ensaio, seção 19, P1).
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const APP = fileURLToPath(new URL("../src/app/", import.meta.url));

function arquivosDeRota(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeRota(caminho);
    return /^(page|layout)\.tsx$/.test(nome) ? [caminho] : [];
  });
}

test("o layout raiz acrescenta 'IAH Educacional' uma única vez", () => {
  const raiz = readFileSync(join(APP, "layout.tsx"), "utf8");
  assert.match(raiz, /template: "%s \| IAH Educacional"/);
});

test("nenhuma página repete o sufixo que o layout já aplica", () => {
  const repetidos = arquivosDeRota(APP)
    .filter((arquivo) => arquivo !== join(APP, "layout.tsx"))
    .filter((arquivo) => /title:\s*"[^"]*\|\s*IAH Educacional"/.test(readFileSync(arquivo, "utf8")));
  assert.deepEqual(repetidos, []);
});

test("páginas de senha definem só o próprio título", () => {
  const titulo = (rota) =>
    readFileSync(join(APP, rota, "page.tsx"), "utf8").match(/title:\s*"([^"]+)"/)?.[1];
  assert.equal(titulo("entrar/esqueci-senha"), "Esqueci minha senha");
  assert.equal(titulo("entrar/nova-senha"), "Trocar senha");
});
