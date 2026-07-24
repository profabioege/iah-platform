import type { Classroom } from "../../../modules/platform/domain/entities.ts";
import type { PlatformRepositories } from "../../../modules/platform/domain/repositories.ts";
import type { KnownPersonName } from "./types.ts";

/**
 * Camada 1 — busca, só no servidor, os nomes vinculados à instituição
 * atual (professores da instituição + alunos das turmas do Workspace).
 * Nunca sai desta função crua — só o `KnownPersonName[]` (nome + papel)
 * que `dataAnonymizer.analyze` usa e descarta ao final da requisição.
 *
 * Responsáveis ("responsavel") e equipe institucional ("equipe") ainda
 * não têm cadastro neste produto (gap real, não este arquivo) — a lista
 * retornada nunca inclui esses papéis. Um texto que mencione um
 * responsável/funcionário por nome em contexto pessoal ("o responsável
 * Fulano") não tem como ser confirmado contra um cadastro que não
 * existe — cai no caminho seguro (`unresolvedPersonalNames`, bloqueia o
 * envio) em vez de arriscar liberar por engano.
 */
export async function fetchInstitutionalRoster(
  institutionId: string,
  classrooms: Classroom[],
  repositoriesOverride?: PlatformRepositories,
): Promise<KnownPersonName[]> {
  // Import dinâmico de propósito: só carrega a factory real (que puxa a
  // cadeia de infraestrutura do módulo Platform) quando nenhum override é
  // passado — em teste, o override sempre é passado, então essa cadeia
  // nunca precisa ser resolvida fora do bundler do Next.js.
  const repositories =
    repositoriesOverride ??
    (await import("../../../modules/platform/infrastructure/repository-factory.ts")).getDefaultRepositories();
  const [teachers, studentsByClassroom] = await Promise.all([
    repositories.teachers.listByInstitution(institutionId),
    Promise.all(classrooms.map((classroom) => repositories.students.listByClassroom(institutionId, classroom.id))),
  ]);

  const roster: KnownPersonName[] = teachers.map((teacher) => ({ fullName: teacher.name, role: "professor" as const }));
  for (const students of studentsByClassroom) {
    for (const student of students) {
      roster.push({ fullName: student.name, role: "aluno" as const });
    }
  }
  return roster;
}
