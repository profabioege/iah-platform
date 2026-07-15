/**
 * Resolve a URL pública do site nesta ordem de prioridade:
 * 1. NEXT_PUBLIC_SITE_URL — override explícito, usado para o domínio
 *    definitivo (iaheducacional.com.br) somente após a virada de DNS.
 * 2. VERCEL_URL — injetada automaticamente pela Vercel em cada deploy
 *    (preview ou produção); garante que homologação sempre referencie a
 *    si mesma, nunca um domínio ainda não conectado.
 * 3. http://localhost:3000 — fallback para desenvolvimento local.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Configuração base do site, compartilhada por metadata, sitemap e robots.
 */
export const siteConfig = {
  name: "IAH Educacional",
  url: resolveSiteUrl(),
  title: "IAH Educacional | Inteligência Artificial & Humanidades",
  description:
    "Sistema de ensino que une metodologia, conteúdo autoral e Inteligência Artificial para escolas de Ensino Fundamental e Médio. Solicite uma demonstração.",
} as const;
