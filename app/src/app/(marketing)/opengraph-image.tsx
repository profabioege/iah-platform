import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem de compartilhamento (WhatsApp, LinkedIn, etc.) com a marca IAH. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#07101d",
          backgroundImage:
            "radial-gradient(circle at 78% 18%, rgba(66,232,241,0.18), transparent 42%)",
          color: "#f4f8fc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Marca IAH — mesmo desenho do componente Logo */}
          <svg width="150" height="53" viewBox="0 0 340 120">
            <rect x="8" y="8" width="34" height="104" rx="9" fill="#f4f8fc" />
            <path
              d="M70 112 L120 14 L170 112"
              fill="none"
              stroke="#f4f8fc"
              strokeWidth="34"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M120 66 L142 108 L98 108 Z" fill="#42e8f1" />
            <rect x="206" y="8" width="34" height="104" rx="9" fill="#f4f8fc" />
            <rect x="298" y="8" width="34" height="104" rx="9" fill="#f4f8fc" />
            <rect x="206" y="45" width="126" height="30" rx="9" fill="#f4f8fc" />
          </svg>
          <span style={{ fontSize: 22, letterSpacing: 6, color: "#42e8f1" }}>
            EDUCACIONAL
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span style={{ fontSize: 20, letterSpacing: 4, color: "#7eeff5" }}>
            INTELIGÊNCIA ARTIFICIAL &amp; HUMANIDADES
          </span>
          <span style={{ fontSize: 62, fontWeight: 600, letterSpacing: -2, lineHeight: 1.1, maxWidth: 940 }}>
            Ensinar Inteligência Artificial exige método.
          </span>
          <span style={{ fontSize: 26, color: "#aab7c8", maxWidth: 900 }}>
            Sistema de ensino com metodologia, conteúdo autoral e IA para escolas.
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
