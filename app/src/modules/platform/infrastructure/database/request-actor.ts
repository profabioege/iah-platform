import { cache } from "react";
import { headers } from "next/headers";

import type { DatabaseActor, DatabaseActorRole } from "./scoped-client";

/**
 * Quem é o ator DESTA requisição, conferido contra o banco.
 *
 * A sessão do Auth.js diz quem alega ser; aqui o servidor confirma, a
 * cada requisição protegida:
 *
 *  - a conta existe e está `active` (conta desativada perde acesso na
 *    hora, sem esperar a sessão expirar);
 *  - o perfil na instituição está `active`;
 *  - a versão da credencial da sessão ainda é a do banco (uma
 *    recuperação assistida invalida as sessões anteriores);
 *  - quais são os ids pedagógicos (professor/aluno) do ator.
 *
 * Uma conferência por REQUISIÇÃO (não por chamada). `cache` do React só
 * deduplica durante a renderização de Server Components; numa Server
 * Action ele não age, e a mesma conferência rodava 5 vezes por gravação
 * (trace de 30/09: 20 de 31 chamadas ao banco — ver
 * docs/operations/retomada-homologacao.md). Por isso a conferência é
 * memorizada num `WeakMap` indexado pelo objeto de cabeçalhos DESTA
 * requisição (`await headers()`, criado pelo Next para cada requisição):
 *  - nada é compartilhado entre requisições nem entre usuários — outra
 *    requisição tem outro objeto e confere de novo, do zero;
 *  - a entrada some com a requisição (WeakMap, sem limpeza manual);
 *  - toda requisição continua conferindo conta ativa, perfil ativo,
 *    papel, instituição e versão da credencial contra o banco.
 * Nenhum fluxo altera a conta e reconfere o ator na mesma requisição
 * (troca de senha e signOut terminam em redirecionamento).
 */

const ROLES: DatabaseActorRole[] = [
  "aluno",
  "professor",
  "administrador",
  "admin_iah",
];

interface SessionClaims {
  platformUserId?: string;
  institutionId?: string;
  role?: string;
  credentialsVersion?: number;
}

const conferenciaPorRequisicao = new WeakMap<object, Promise<DatabaseActor | null>>();

export const getDatabaseActor = cache(async (): Promise<DatabaseActor | null> => {
  const requisicao: object = await headers();
  const emAndamento = conferenciaPorRequisicao.get(requisicao);
  if (emAndamento) return emAndamento;
  const conferencia = conferirAtor();
  conferenciaPorRequisicao.set(requisicao, conferencia);
  return conferencia;
});

async function conferirAtor(): Promise<DatabaseActor | null> {
  const { auth } = await import("@/auth");
  const session = await auth();
  const claims = session?.user as SessionClaims | undefined;
  if (!claims?.platformUserId || !claims.institutionId || !claims.role) {
    return null;
  }
  const role = ROLES.find((item) => item === claims.role);
  if (!role) return null;

  const { getSupabaseAdminClient } = await import("./admin-client");
  const db = getSupabaseAdminClient();

  // As 4 consultas sao independentes entre si (nenhuma depende do
  // resultado de outra) -- so a DECISAO de aceitar o ator depende dos
  // valores de user/profile, nao a BUSCA de teacher/student. Buscar tudo
  // em paralelo poupa uma rodada redonda ao banco hospedado por
  // requisicao (a rechecagem de conta/perfil ativos abaixo continua
  // igual, sobre os MESMOS dados -- nada de seguranca foi afrouxado; ver
  // investigacao de latencia de 27/09 em
  // docs/operations/retomada-homologacao.md).
  const [{ data: user }, { data: profile }, { data: teacher }, { data: student }] =
    await Promise.all([
      db
        .from("users")
        .select("id, status, credentials_version")
        .eq("id", claims.platformUserId)
        .maybeSingle(),
      db
        .from("profiles")
        .select("role, status")
        .eq("user_id", claims.platformUserId)
        .eq("institution_id", claims.institutionId)
        .eq("status", "active")
        .maybeSingle(),
      db
        .from("teachers")
        .select("id")
        .eq("user_id", claims.platformUserId)
        .eq("institution_id", claims.institutionId)
        .maybeSingle(),
      db
        .from("students")
        .select("id")
        .eq("user_id", claims.platformUserId)
        .eq("institution_id", claims.institutionId)
        .maybeSingle(),
    ]);

  if (!user || user.status !== "active") return null;
  if (!profile || profile.role !== role) return null;

  // Sessão emitida antes de uma redefinição de credencial não vale mais.
  const sessionVersion = Number(claims.credentialsVersion ?? 0);
  const currentVersion = Number(user.credentials_version ?? 1);
  if (sessionVersion !== currentVersion) return null;

  return {
    institutionId: claims.institutionId,
    role,
    userId: claims.platformUserId,
    teacherId: (teacher?.id as string | undefined) ?? null,
    studentId: (student?.id as string | undefined) ?? null,
  };
}
