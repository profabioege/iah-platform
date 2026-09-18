/**
 * Stub do ator da requisição (`request-actor.ts`).
 *
 * No modo real o ator é reconferido contra o banco (conta ativa, perfil
 * ativo, versão da credencial, vínculos). Aqui, o teste unitário fornece
 * a sessão e o banco falso; este stub reproduz só a parte que interessa
 * ao escopo — papel, instituição e os ids pedagógicos — lendo as mesmas
 * tabelas falsas (`teachers`, `students`) que o código real lê.
 *
 * A conferência completa (status, versão da credencial) é exercitada nos
 * testes do piloto, contra banco real.
 */

import { testEnv } from "../test-env.mjs";

const PAPEIS = ["aluno", "professor", "administrador", "admin_iah"];

export async function getDatabaseActor() {
  const user = testEnv.session?.user;
  if (!user?.platformUserId || !user.institutionId || !user.role) return null;
  if (!PAPEIS.includes(user.role)) return null;
  if (!testEnv.db) return null;

  const [{ data: teacher }, { data: student }] = await Promise.all([
    testEnv.db
      .from("teachers")
      .select("id")
      .eq("user_id", user.platformUserId)
      .eq("institution_id", user.institutionId)
      .maybeSingle(),
    testEnv.db
      .from("students")
      .select("id")
      .eq("user_id", user.platformUserId)
      .eq("institution_id", user.institutionId)
      .maybeSingle(),
  ]);

  return {
    institutionId: user.institutionId,
    role: user.role,
    userId: user.platformUserId,
    teacherId: teacher?.id ?? null,
    studentId: student?.id ?? null,
  };
}
