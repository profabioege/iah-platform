import { ImageResponse } from "next/og";

import {
  PATH_LETTER_A,
  PATH_TRIANGLE,
  VIEWBOX_SYMBOL,
} from "@/components/brand/official-paths";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple touch icon (PNG 180×180, gerado no build) — Núcleo IAH sobre
 * navy, com os mesmos paths do master `components/brand/logo.tsx`.
 * Cores literais porque o next/og não resolve variáveis CSS.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#031d43",
        }}
      >
        <svg width="130" height="129" viewBox={VIEWBOX_SYMBOL}>
          <path fill="#ffffff" fillRule="evenodd" d={PATH_LETTER_A} />
          <path fill="#0093b0" fillRule="evenodd" d={PATH_TRIANGLE} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
