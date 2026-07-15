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
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 5,
              padding: 12,
              border: "2px solid rgba(105,240,247,0.6)",
              borderRadius: 12,
            }}
          >
            <div style={{ width: 6, height: 16, background: "#42e8f1", borderRadius: 9, opacity: 0.65 }} />
            <div style={{ width: 6, height: 28, background: "#42e8f1", borderRadius: 9 }} />
            <div style={{ width: 6, height: 40, background: "#42e8f1", borderRadius: 9 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>IAH</span>
            <span style={{ fontSize: 18, color: "#95a3b7" }}>Educacional</span>
          </div>
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
