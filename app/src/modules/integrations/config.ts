/**
 * Único ponto que decide se o Google Workspace está configurado nesta
 * instância — hoje sempre falso, pois nenhuma credencial existe. Quando as
 * variáveis de ambiente reais forem definidas (ver docs/GOOGLE_WORKSPACE.md),
 * esta função passa a refletir isso, sem que quem a consome precise mudar.
 */
export function isGoogleWorkspaceConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
