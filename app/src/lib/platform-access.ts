import { redirect } from "next/navigation";

import { getAuthMode } from "@/lib/auth-flags";

/**
 * Porta de entrada SERVER-SIDE das telas privadas da Plataforma.
 *
 * Existe para que nenhuma tela privada dependa exclusivamente do
 * middleware. O middleware continua sendo a primeira barreira, mas ele
 * é configuração (`matcher`): uma rota movida, um prefixo novo ou um
 * componente reaproveitado por outra rota sairiam da cobertura sem que
 * nada falhasse. Aqui a própria página se recusa a produzir conteúdo.
 *
 * Também substitui a decisão binária `isAuthConfigured() ? real : seed`,
 * que confundia "demonstração" com "indisponível" e fazia uma instância
 * mal configurada servir dados fictícios.
 *
 * NÃO importar de componente com "use client": o módulo depende de
 * `next/navigation` e da leitura de `process.env` no servidor. Decisão
 * de autorização nunca é tomada no navegador — `isRealModeClient()`
 * (espelho público) serve só para escolher fonte de dados na UI.
 */

/** Os dois únicos modos em que uma tela privada pode produzir conteúdo. */
export type PlatformDataMode = "demo" | "supabase";

/**
 * Devolve o modo de dados da instância ou interrompe o render.
 *
 * No estado indisponível não há repositório a consultar — nem real nem
 * seed —, então a tela é abandonada antes de qualquer acesso a dados,
 * com o mesmo destino que o middleware usa (`/entrar`, que mostra a
 * mensagem neutra). Nenhuma informação de configuração chega ao
 * usuário.
 */
export function requirePlatformDataMode(): PlatformDataMode {
  const mode = getAuthMode();
  if (mode === "unavailable") redirect("/entrar");
  return mode;
}
