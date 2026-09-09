import { ImageResponse } from "next/og";

import {
  PATH_LETTERS,
  PATH_TRIANGLE,
  PATH_WORDMARK,
  VIEWBOX_LOCKUP,
} from "@/components/brand/official-paths";
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
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Marca IAH — mesmos paths do master (brand/logo.tsx); não redesenhar
              aqui. Cores literais porque o next/og não resolve variáveis CSS. */}
          <svg width="233" height="140" viewBox={VIEWBOX_LOCKUP}>
            <path fill="#ffffff" fillRule="evenodd" d={PATH_LETTERS} />
            <path
              fill="#0093b0"
              fillRule="evenodd"
              d={`${PATH_TRIANGLE} ${PATH_WORDMARK}`}
            />
          </svg>
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
