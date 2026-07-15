import type { Metadata } from "next";

import { ContactForm } from "@/components/marketing/contact-form";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Solicite uma demonstração do IAH para a sua escola. Fale com a equipe pelos e-mails institucionais.",
  alternates: { canonical: "/contato" },
};

export default function ContatoPage() {
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

            <p className="eyebrow">CONTATO</p>
            <h2>Vamos levar o IAH para a sua escola?</h2>
            <p>
              Conte um pouco sobre a sua instituição e nossa equipe entra em
              contato para agendar uma demonstração da plataforma — sem
              compromisso.
            </p>

            <ContactForm />

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
