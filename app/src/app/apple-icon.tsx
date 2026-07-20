import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple touch icon (PNG 180×180, gerado no build) — Núcleo IAH sobre
 * navy, mesmo path do master `components/brand/symbol.tsx` (M18.3),
 * apenas escalado com margem. Não redesenhar: alterar sempre via master.
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
          backgroundColor: "#07101d",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 520 520">
          <path
            d="M260 22 L30 498 M260 22 L490 498"
            fill="none"
            stroke="#ffffff"
            strokeWidth="86"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M260 315 L355 500 L165 500 Z" fill="#00a9c6" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
