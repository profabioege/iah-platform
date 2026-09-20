/**
 * Dados do ambiente de homologação para as suítes HTTP.
 *
 * O arranque (`scripts/run-pilot-homologation.mjs`) grava um arquivo com
 * a URL do servidor, as contas criadas pelo provisionamento e os
 * identificadores das Server Actions do build. Os testes leem daqui e
 * não sabem nada além disso — nenhum módulo da aplicação é importado.
 */

import { readFileSync } from "node:fs";

const caminho = process.env.E2E_AMBIENTE;
if (!caminho) {
  throw new Error(
    "E2E_AMBIENTE não está definido — rode as suítes por " +
      "`npm run test:homologacao`, que sobe o ambiente antes.",
  );
}

export const ambiente = JSON.parse(readFileSync(caminho, "utf8"));
export const BASE_URL = ambiente.baseUrl;

const turmaPor = (prefixo) => ambiente.turmas.find((t) => t.prefixo === prefixo);

export const TURMA = turmaPor("beryon");
export const OUTRA_TURMA = turmaPor("outra");
export const MISSAO_ID = ambiente.missionId;

/** Conta pelo papel e pela posição na lista do provisionamento. */
export function conta(turma, perfil, indice = 0) {
  const candidatas = turma.contas.filter((c) => c.perfil === perfil);
  const escolhida = candidatas[indice];
  if (!escolhida) {
    throw new Error(`Sem conta ${perfil}[${indice}] na turma ${turma.prefixo}.`);
  }
  return escolhida;
}

export function acao(nome) {
  const id = ambiente.actions[nome];
  if (!id) {
    throw new Error(
      `A Server Action "${nome}" não foi encontrada no build. ` +
        `Conhecidas: ${Object.keys(ambiente.actions).join(", ")}`,
    );
  }
  return id;
}

/** Como `acao`, mas devolve null quando a ação não está no build. */
export function acaoTalvez(nome) {
  return ambiente.actions[nome] ?? null;
}

/** Conexão direta ao Postgres para conferir o que ficou gravado. */
export async function consultarBanco(sql, parametros = []) {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: ambiente.databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(sql, parametros);
    return rows;
  } finally {
    await client.end();
  }
}
