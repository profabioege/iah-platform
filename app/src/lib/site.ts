/**
 * Configuração base do site, compartilhada por metadata, sitemap e robots.
 * A URL pode ser sobrescrita por NEXT_PUBLIC_SITE_URL (ex.: staging).
 */
export const siteConfig = {
  name: "IAH Educacional",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://iaheducacional.com.br",
  title: "IAH Educacional | Inteligência Artificial & Humanidades",
  description:
    "Sistema de ensino que une metodologia, conteúdo autoral e Inteligência Artificial para escolas de Ensino Fundamental e Médio. Solicite uma demonstração.",
} as const;
