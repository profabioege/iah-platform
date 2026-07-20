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
          {/* Marca IAH — cópia da geometria master (brand/logo.tsx, M18.3); não redesenhar aqui */}
          <svg width="165" height="78" viewBox="0 0 1100 520">
            <rect x="20" y="20" width="90" height="480" rx="25" fill="#f4f8fc" />
            <path
              d="M435 22 L205 498 M435 22 L665 498"
              fill="none"
              stroke="#f4f8fc"
              strokeWidth="86"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M435 315 L530 500 L340 500 Z" fill="#00a9c6" />
            <rect x="730" y="20" width="90" height="480" rx="25" fill="#f4f8fc" />
            <rect x="990" y="20" width="90" height="480" rx="25" fill="#f4f8fc" />
            <rect x="775" y="200" width="260" height="95" fill="#f4f8fc" />
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
