import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { isAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth-flags";

/**
 * Autorização por papel — ALLOWLIST explícita, deny by default.
 *
 * Separação estrita de papéis (decisão da M23): administrador NÃO tem
 * acesso implícito à área docente, e professor não tem acesso implícito
 * à jornada do aluno. Privilégio administrativo nunca é bypass das
 * permissões de professor; quem exerce as duas funções precisará de um
 * papel docente explícito ou de troca de contexto — nunca de herança.
 *
 * Os papéis são os PERSISTIDOS em `profiles.role` (migration 0003), não
 * os do Workspace. Acrescentar um papel ao CHECK do banco sem
 * acrescentá-lo aqui é seguro por construção: ele nasce sem acesso.
 */
const AREA_ROLES: Record<string, readonly string[]> = {
  "/gestor": ["administrador", "admin_iah"],
  "/professor": ["professor"],
  "/dashboard": ["aluno"],
  "/missoes": ["aluno"],
  "/diario": ["aluno"],
};

/** Prefixos avaliados, na mesma ordem do `config.matcher` do middleware. */
const PRIVATE_AREAS = Object.keys(AREA_ROLES);

/**
 * Destino do papel quando ele não pode ficar onde está. Papel fora do
 * vocabulário não tem área própria e volta ao login — negar por padrão
 * vale também para o redirecionamento.
 */
function roleHome(role: string): string {
  if (role === "administrador" || role === "admin_iah") return "/gestor";
  if (role === "professor") return "/professor";
  if (role === "aluno") return "/dashboard";
  return "/entrar";
}

/**
 * Configuração EDGE-SAFE do Auth.js — usada pelo middleware.
 *
 * Aqui não entra nada que dependa de Node/banco: o provider Credentials
 * (que consulta o banco) vive só em src/auth.ts; os callbacks jwt/session
 * ficam AQUI porque só copiam campos do token — e o middleware precisa
 * deles para enxergar papel/instituição na sessão (gate por papel, M22).
 * Ver docs/AUTHENTICATION.md.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  providers: isGoogleAuthConfigured()
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          platformUserId?: string;
          institutionId?: string;
          role?: string;
        };
        token.platformUserId = u.platformUserId;
        token.institutionId = u.institutionId;
        token.role = u.role;
      }
      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          platformUserId: token.platformUserId as string | undefined,
          institutionId: token.institutionId as string | undefined,
          role: token.role as string | undefined,
        },
      };
    },

    /**
     * Porta das rotas privadas do modo real: exige sessão E aplica o
     * gate por papel, sempre lido do vínculo persistido (token), nunca
     * do cliente.
     *
     * Fora do modo `supabase` esta porta NEGA. Ela só é alcançada pelo
     * middleware, que hoje invoca o Auth.js apenas nesse modo — mas uma
     * fronteira de autorização não pode ficar permissiva apoiada em
     * quem a chama: `return true` aqui liberaria toda rota privada se
     * um roteamento futuro passasse por ela em demonstração ou com a
     * instância indisponível.
     *
     * A decisão de acesso é uma ALLOWLIST: um papel só entra numa área
     * se estiver escrito em `AREA_ROLES`. Papel ausente, desconhecido,
     * futuro ou malformado não aparece em lista nenhuma e por isso é
     * negado — nunca há fallback permissivo. Isso substitui a denylist
     * de `/professor`, que liberava qualquer papel diferente de "aluno"
     * e teria dado acesso silencioso a papéis administrativos novos.
     */
    authorized({ auth, request }) {
      if (!isAuthConfigured()) return false;
      const user = auth?.user as
        | { role?: string }
        | undefined;
      if (!user) return false;

      // Comparação EXATA, sem normalizar: `trim()`/`toLowerCase()` só
      // ampliariam o conjunto de papéis aceitos. "professor " e
      // "Professor" não são o papel `professor` — são papéis malformados,
      // e papel malformado é negado como qualquer desconhecido.
      const role = typeof user.role === "string" ? user.role : "";
      const { pathname } = request.nextUrl;

      const area = PRIVATE_AREAS.find((prefix) => pathname.startsWith(prefix));
      if (!area) return true; // fora das áreas privadas conhecidas
      if (AREA_ROLES[area].includes(role)) return true;

      // Papel sem área própria (desconhecido/ausente) volta ao login: não
      // há destino seguro que se possa presumir para ele.
      const home = roleHome(role);
      if (pathname.startsWith(home)) return false; // corta laço de redirecionamento
      return Response.redirect(new URL(home, request.nextUrl));
    },
  },
} satisfies NextAuthConfig;
