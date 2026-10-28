"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * "Sair" do modo real pelo endpoint do Auth.js (`POST /api/auth/signout`,
 * com o token CSRF), que fica fora do middleware.
 *
 * Por que não uma Server Action: ela é enviada para a própria página
 * privada, onde o middleware renova o cookie da sessão na MESMA resposta
 * em que o `signOut` o apaga. No Cloud Run a renovação prevaleceu e a
 * sessão continuou ativa depois do "Sair" — inaceitável em computador
 * compartilhado da escola. Pelo endpoint, a resposta só apaga o cookie;
 * em seguida o navegador recarrega `/entrar`.
 */
export function SignOutButton() {
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    try {
      await signOut({ redirectTo: "/entrar" });
    } catch {
      setSaindo(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title="Sair da plataforma"
      data-sair="auth-endpoint"
      disabled={saindo}
      onClick={sair}
    >
      <LogOut className="size-4" />
      Sair
    </Button>
  );
}
