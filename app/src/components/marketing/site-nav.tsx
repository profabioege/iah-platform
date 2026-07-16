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
          <Logo variant="dark" className="h-6 w-auto" title="IAH" />
          <small>Educacional</small>
        </Link>

        <div className="nav-links">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        <Link className="nav-cta" href="/contato">
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
            <Link
              className="button button-primary"
              href="/contato"
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
