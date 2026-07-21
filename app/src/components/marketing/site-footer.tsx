import Link from "next/link";

import { Logo } from "@/components/brand/logo";

/**
 * Rodapé institucional do site. Usado pela Landing e pelas páginas públicas.
 * E-mails oficiais: contato@ (geral) e comercial@ (demonstrações/vendas).
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/#inicio" aria-label="IAH Educacional, início">
            <Logo size="md" variant="dark" className="h-14" />
          </Link>
          <p className="footer-tagline">
            Inteligência Artificial &amp; Humanidades. Um sistema de ensino
            para escolas que formam pensadores, não apenas usuários de
            tecnologia.
          </p>
        </div>

        <nav aria-label="Links institucionais">
          <p className="footer-heading">Navegação</p>
          <div className="footer-links">
            <Link href="/#plataforma">Plataforma</Link>
            <Link href="/#metodo">Metodologia</Link>
            <Link href="/demonstracao">Demonstração</Link>
          </div>
        </nav>

        <div>
          <p className="footer-heading">Fale com a IAH</p>
          <div className="footer-mails">
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
      </div>

      <div className="container footer-base">
        <p>© 2026 IAH Educacional</p>
        <p>Inteligência Artificial &amp; Humanidades</p>
      </div>
    </footer>
  );
}
