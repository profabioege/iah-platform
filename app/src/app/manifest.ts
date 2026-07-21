import type { MetadataRoute } from "next";

/**
 * Web App Manifest (M18.3) — ícones institucionais e cores da marca
 * para instalação/atalho em dispositivos. Os ícones apontam para os
 * ativos oficiais derivados do master (favicon + apple-icon); nenhum
 * desenho novo é declarado aqui.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IAH Educacional",
    short_name: "IAH",
    description:
      "Plataforma da disciplina Inteligência Artificial & Humanidades.",
    start_url: "/",
    display: "standalone",
    background_color: "#07101d",
    theme_color: "#07101d",
    icons: [
      {
        src: "/brand/favicon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
