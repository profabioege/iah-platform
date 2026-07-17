import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";
import { DemonstracaoForm } from "@/components/marketing/demonstracao-form";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

const title = "Solicitar demonstração";
const description =
  "Tecnologia sozinha não ensina IA. Metodologia sim. Solicite uma demonstração personalizada do IAH para a sua escola.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/demonstracao" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: `${siteConfig.url}/demonstracao`,
    siteName: siteConfig.name,
    title: `${title} | ${siteConfig.name}`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${siteConfig.name}`,
    description,
  },
};

/**
 * Página de conversão comercial do IAH — funil principal da Landing.
 * Todos os CTAs "Solicitar Demonstração" do site apontam para cá.
 */
export default function DemonstracaoPage() {
  return (
    <div className="site">
      <SiteNav />

      <main>
        <section className="section final-section">
          <div className="container final-panel final-panel-form">
            <div className="final-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <p className="eyebrow">SOLICITAR DEMONSTRAÇÃO</p>
            <h2>
              Tecnologia sozinha não ensina IA.
              <br />
              Metodologia sim.
            </h2>
            <p>Solicite uma demonstração personalizada do IAH para sua escola.</p>

            <DemonstracaoForm />

            <div className="contact-emails">
              <a href="mailto:contato@iaheducacional.com.br">
                <small>Contato geral</small>
                contato@iaheducacional.com.br
              </a>
              <a href="mailto:comercial@iaheducacional.com.br">
                <small>Comercial e demonstrações</small>
                comercial@iaheducacional.com.br
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
