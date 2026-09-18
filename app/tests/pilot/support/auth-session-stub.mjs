/**
 * Sessão do Auth.js nos testes do piloto.
 *
 * O que este arquivo representa é apenas o COOKIE de sessão já emitido:
 * o conteúdo que o Auth.js assina depois de um login bem-sucedido. Quem
 * produz esse conteúdo nos testes é o `authorize` real do provider
 * Credentials (senha conferida contra o banco) — ver `pilot-session.mjs`.
 *
 * Trocar a sessão aqui equivale a "estar logado como fulano" no
 * navegador. Nada além disso é simulado: a partir daqui, toda conferência
 * (conta ativa, perfil ativo, versão da credencial, papel, instituição,
 * turma) acontece no código real, contra o banco real.
 */

let current = null;

export function setPilotSession(session) {
  current = session;
}

export function clearPilotSession() {
  current = null;
}

export async function auth() {
  return current;
}

export const handlers = {};
export const signIn = async () => {
  throw new Error("signIn não é usado nos testes do piloto.");
};
export const signOut = async () => {
  current = null;
};
