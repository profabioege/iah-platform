/**
 * Flag única que decide se a autenticação real (Auth.js + Google) está
 * ativa nesta instância. Sem as três variáveis, a Plataforma opera no
 * modo demonstração (acesso direto, sem login) — exatamente como antes.
 *
 * Edge-safe: só lê process.env, nenhuma dependência. É importada pelo
 * middleware, então NÃO adicionar imports pesados aqui.
 */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.AUTH_SECRET,
  );
}
