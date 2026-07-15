/**
 * Resolve a URL pública do site nesta ordem de prioridade:
 * 1. NEXT_PUBLIC_SITE_URL — override explícito, usado para o domínio
 *    definitivo (iaheducacional.com.br) somente após a virada de DNS.
 * 2. VERCEL_PROJECT_PRODUCTION_URL — domínio de produção estável do projeto
 *    na Vercel (ex.: iah-platform.vercel.app). Preferido para canonical/OG
 *    por não mudar a cada deploy.
 * 3. VERCEL_URL — URL específica do deployment (muda a cada build); usada
 *    como último recurso em ambientes Vercel sem produção definida.
 * 4. http://localhost:3000 — fallback para desenvolvimento local.
 *
 * Todas as variáveis VERCEL_* são injetadas automaticamente pela Vercel.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
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
