"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";

const LINKS = [
  { href: "/#plataforma", label: "Plataforma" },
  { href: "/#metodo", label: "Metodologia" },
  { href: "/#recursos", label: "Recursos" },
];

/**
 * Navegação do site institucional.
 * Desktop: links + CTA. Mobile: botão hambúrguer que abre um menu.
 */
export function SiteNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="site-header">
      <nav className="container nav" aria-label="Navegação principal">
        <Link className="brand" href="/#inicio" aria-label="IAH Educacional, início">
          {/* M18.3: reduzido no mobile, completo do tablet em diante — nunca abaixo do mínimo legível (BRAND_GUIDELINES.md) */}
          <Logo
            variant="reverse"
            wordmark
            className="h-10 w-auto md:h-12"
            title="IAH Educacional"
          />
        </Link>

        <div className="nav-links">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        <Link className="nav-entrar" href="/entrar">
          Entrar
        </Link>

        <Link className="nav-cta" href="/demonstracao">
          Solicitar demonstração
          <ArrowRight aria-hidden="true" />
        </Link>

        <button
          className="nav-toggle"
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </nav>

      {open ? (
        <div className="mobile-menu">
          <div className="container">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/entrar" onClick={() => setOpen(false)}>
              Entrar na plataforma
            </Link>
            <Link
              className="button button-primary"
              href="/demonstracao"
              onClick={() => setOpen(false)}
            >
              Solicitar demonstração
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
