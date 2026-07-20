/**
 * Hash e verificação de senha — scrypt do próprio Node (`node:crypto`),
 * zero dependência nova (regra do CLAUDE.md). Usado pelo provider
 * Credentials do Auth.js (M22) e pelo seed de demonstração
 * (`app/db/seed/seed-demo.mjs`, que replica ESTE formato — mudanças aqui
 * exigem mudança lá).
 *
 * Formato armazenado: `scrypt:1:<salt base64>:<hash base64>`
 *  - "1" é a versão do esquema (N=16384, r=8, p=1, keylen=64);
 *  - migrar parâmetros no futuro = nova versão, verificando as antigas.
 *
 * SÓ código de servidor — nunca importar em componente de cliente.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return `scrypt:1:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "scrypt" || parts[1] !== "1") {
    return false;
  }
  try {
    const salt = Buffer.from(parts[2], "base64");
    const expected = Buffer.from(parts[3], "base64");
    const actual = scryptSync(password, salt, expected.length, SCRYPT_PARAMS);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
