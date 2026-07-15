import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/**
 * Regras de rastreamento. A área da Plataforma (/dashboard) é privada e
 * fica fora do índice; o site institucional é liberado.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
