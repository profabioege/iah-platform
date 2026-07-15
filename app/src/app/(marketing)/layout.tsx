import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

/**
 * Layout do bloco MARKETING (Site Institucional / Landing Page).
 *
 * A landing é pública e traz o próprio header/footer dentro da página.
 * Aqui concentramos os metadados públicos (SEO + Open Graph) do site
 * institucional, sem afetar a Plataforma. Ver docs/ARCHITECTURE.md (ADR-004).
 */
export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
