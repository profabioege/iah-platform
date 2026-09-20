/**
 * Trava de destino das operações de banco do piloto.
 *
 * Regra, em ordem:
 *
 *  1. Banco local e descartável (127.0.0.1, localhost, ::1) passa: é o
 *     ambiente efêmero dos testes, que nasce e morre na execução.
 *  2. Destino remoto exige o identificador do projeto de homologação
 *     confirmado por DUAS fontes independentes: o argumento
 *     `--confirm-project=<ref>` (quem digitou o comando) e a variável
 *     `IAH_HOMOLOGATION_PROJECT_REF` (quem preparou o ambiente). As duas
 *     precisam bater com o ref que está na própria URL do banco.
 *  3. Qualquer ref listado em `IAH_PROTECTED_PROJECT_REFS` é recusado
 *     sempre, mesmo que confirmado — é onde entram produção e o projeto
 *     do site.
 *
 * Um argumento sozinho não basta de propósito: digitar o ref errado no
 * terminal é o erro mais fácil de cometer, e é exatamente o que apaga a
 * escola errada.
 */

/** `https://abcdefghijklmnop.supabase.co` → `abcdefghijklmnop`. */
export function projectRefFromUrl(databaseUrl) {
  const host = new URL(databaseUrl).hostname.toLowerCase();
  if (host === "127.0.0.1" || host === "localhost" || host === "::1") return null;
  const [ref] = host.split(".");
  return ref || null;
}

export function isLocalTarget(databaseUrl) {
  const host = new URL(databaseUrl).hostname.toLowerCase();
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

/**
 * Lança quando o destino não está autorizado. Devolve uma descrição do
 * alvo para o script registrar antes de escrever.
 */
export function assertAuthorizedTarget(databaseUrl, options = {}) {
  const { confirmProject = null, operation = "esta operação" } = options;

  if (isLocalTarget(databaseUrl)) {
    return { escopo: "local", ref: null, descricao: "banco local descartável" };
  }

  const ref = projectRefFromUrl(databaseUrl);
  if (!ref) {
    throw new Error(
      `Destino não reconhecido para ${operation}. A URL do banco não tem um ` +
        "identificador de projeto legível.",
    );
  }

  const protegidos = (process.env.IAH_PROTECTED_PROJECT_REFS ?? "")
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (protegidos.includes(ref.toLowerCase())) {
    throw new Error(
      `Destino PROTEGIDO recusado (${ref}). Este projeto está na lista de ` +
        "projetos que nunca recebem operações do piloto.",
    );
  }

  const doAmbiente = (process.env.IAH_HOMOLOGATION_PROJECT_REF ?? "").trim();
  if (!doAmbiente) {
    throw new Error(
      `Destino remoto (${ref}) sem IAH_HOMOLOGATION_PROJECT_REF no ambiente. ` +
        "Exporte o identificador do projeto de homologação antes de " +
        `${operation}.`,
    );
  }
  if (doAmbiente.toLowerCase() !== ref.toLowerCase()) {
    throw new Error(
      `O ambiente aponta para o projeto ${doAmbiente}, mas a URL do banco é do ` +
        `projeto ${ref}. Recuso ${operation} com essa divergência.`,
    );
  }
  if (!confirmProject) {
    throw new Error(
      `Destino remoto (${ref}) exige --confirm-project=${ref} para ${operation}.`,
    );
  }
  if (String(confirmProject).toLowerCase() !== ref.toLowerCase()) {
    throw new Error(
      `--confirm-project=${confirmProject} não corresponde ao projeto da URL ` +
        `(${ref}). Recuso ${operation}.`,
    );
  }

  return { escopo: "homologacao", ref, descricao: `projeto ${ref}` };
}
