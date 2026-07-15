import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/** Sitemap do site. Rotas públicas indexáveis. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
