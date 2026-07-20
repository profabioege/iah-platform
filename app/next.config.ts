import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aplicação Next.js com servidor (Node.js/Vercel): hospeda o site
  // institucional e a Plataforma IAH, com rotas de API (ex.: formulário
  // de demonstração via Resend), SSR e futura autenticação. Ver ADR-005.

  env: {
    // Espelho PÚBLICO (só um booleano, nenhum segredo) de isAuthConfigured()
    // (src/lib/auth-flags.ts), calculado em build time — os componentes
    // "use client" que precisam saber real×demonstração (ex.: Lesson,
    // modules/lesson) não têm acesso a AUTH_SECRET/SUPABASE_SERVICE_ROLE_KEY
    // (não prefixados com NEXT_PUBLIC_, corretamente fora do bundle).
    NEXT_PUBLIC_IAH_REAL_MODE: String(
      Boolean(process.env.AUTH_SECRET) &&
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    ),
  },
};

export default nextConfig;
