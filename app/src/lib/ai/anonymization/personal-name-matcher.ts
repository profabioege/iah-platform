import type { AnonymizationReplacement, KnownPersonName, PersonRole } from "./types.ts";

/**
 * Camada 1 (nomes conhecidos da instituição) + Camada 2 (padrões de contexto
 * pessoal) da política de anonimização. Puro e determinístico — nunca acessa
 * rede/banco; recebe o cadastro já carregado (`KnownPersonName[]`) de fora.
 */

const ROLE_ALIAS_PREFIX: Record<PersonRole | "pessoa", string> = {
  aluno: "ALUNO",
  professor: "PROFESSOR",
  responsavel: "RESPONSAVEL",
  equipe: "PESSOA",
  pessoa: "PESSOA",
};

const ACCENT_CLASS: Record<string, string> = {
  a: "[aàáâãä]",
  e: "[eèéêë]",
  i: "[iìíîï]",
  o: "[oòóôõö]",
  u: "[uùúûü]",
  c: "[cç]",
};

/** Mapa reverso — a letra acentuada em si (ex.: "é") também precisa resolver para a mesma classe da base ("e"), senão um nome cadastrado JÁ acentuado não bate contra a mesma palavra sem acento. */
const BASE_LETTER_OF: Record<string, string> = Object.fromEntries(
  Object.entries(ACCENT_CLASS).flatMap(([base, cls]) => cls.slice(1, -1).split("").map((variant) => [variant, base])),
);

function escapeRegExpChar(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Regex tolerante a acento e caixa, com \s+ entre palavras (tolera espaços duplicados) — evita normalizar/reindexar o texto original. */
function buildFlexibleNamePattern(name: string): RegExp {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const pattern = words
    .map((word) =>
      word
        .split("")
        .map((ch) => {
          const lower = ch.toLowerCase();
          const base = BASE_LETTER_OF[lower] ?? lower;
          return ACCENT_CLASS[base] ?? escapeRegExpChar(ch);
        })
        .join(""),
    )
    .join("\\s+");
  return new RegExp(`\\b${pattern}\\b`, "gi");
}

function wordCount(name: string): number {
  return name.trim().split(/\s+/).filter(Boolean).length;
}

interface AliasAssigner {
  aliasFor(fullNameKey: string, role: PersonRole | "pessoa"): string;
}

function createAliasAssigner(): AliasAssigner {
  const counters: Partial<Record<PersonRole | "pessoa", number>> = {};
  const assigned = new Map<string, string>();
  return {
    aliasFor(fullNameKey, role) {
      const cacheKey = `${role}:${fullNameKey.toLowerCase()}`;
      const existing = assigned.get(cacheKey);
      if (existing) return existing;
      const next = (counters[role] ?? 0) + 1;
      counters[role] = next;
      const alias = `[${ROLE_ALIAS_PREFIX[role]}_${next}]`;
      assigned.set(cacheKey, alias);
      return alias;
    },
  };
}

export interface KnownNameMatchOptions {
  /** Item 7 — só liga correspondência por primeiro nome isolado quando não houver ambiguidade e o modo estrito estiver ligado. Desligado por padrão. */
  strictFirstNameMatching?: boolean;
}

export interface KnownNameMatchResult {
  text: string;
  replacements: AnonymizationReplacement[];
}

/** Camada 1 — substitui ocorrências de nomes cadastrados na instituição por aliases. */
export function maskKnownNames(text: string, knownNames: KnownPersonName[], options: KnownNameMatchOptions = {}): KnownNameMatchResult {
  const replacements: AnonymizationReplacement[] = [];
  const aliasAssigner = createAliasAssigner();
  let result = text;

  const fullNameEntries = knownNames.filter((entry) => wordCount(entry.fullName) >= 2);
  // Nome completo primeiro (item 6), do mais longo para o mais curto, para não deixar um nome menor "roubar" parte de um nome maior.
  fullNameEntries.sort((a, b) => b.fullName.length - a.fullName.length);

  for (const entry of fullNameEntries) {
    const pattern = buildFlexibleNamePattern(entry.fullName);
    if (!pattern.test(result)) continue;
    pattern.lastIndex = 0;
    const alias = aliasAssigner.aliasFor(entry.fullName, entry.role);
    result = result.replace(pattern, alias);
    replacements.push({ alias, role: entry.role, matchedVia: "known_name" });
  }

  if (options.strictFirstNameMatching) {
    const firstNameEntries = knownNames.filter((entry) => wordCount(entry.fullName) === 1 && entry.fullName.trim().length >= 3);
    const firstNameCounts = new Map<string, number>();
    for (const entry of firstNameEntries) {
      const key = entry.fullName.trim().toLowerCase();
      firstNameCounts.set(key, (firstNameCounts.get(key) ?? 0) + 1);
    }
    for (const entry of firstNameEntries) {
      const key = entry.fullName.trim().toLowerCase();
      if ((firstNameCounts.get(key) ?? 0) > 1) continue; // item 5 — colisão: mais de uma pessoa com o mesmo primeiro nome, não arrisca.
      const pattern = buildFlexibleNamePattern(entry.fullName);
      if (!pattern.test(result)) continue;
      pattern.lastIndex = 0;
      const alias = aliasAssigner.aliasFor(entry.fullName, entry.role);
      result = result.replace(pattern, alias);
      replacements.push({ alias, role: entry.role, matchedVia: "known_name" });
    }
  }

  return { text: result, replacements };
}

/**
 * Constrói um padrão case-insensitive SEM usar a flag `i` do regex — a flag
 * `i` aplicaria case-insensitivity também a `NAME_TOKEN` (`[A-ZÀ-Ý]`),
 * fazendo qualquer palavra minúscula (ex.: "precisa", "de", "apoio") passar
 * por "início de nome próprio" e capturar a frase inteira por engano. Cada
 * letra vira uma classe `[Aa]`, preservando a exigência de maiúscula só
 * onde o padrão pede `[A-ZÀ-Ý]` literalmente.
 */
function caseInsensitiveLiteral(word: string): string {
  return word
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      const upper = ch.toUpperCase();
      return lower === upper ? escapeRegExpChar(ch) : `[${escapeRegExpChar(lower)}${escapeRegExpChar(upper)}]`;
    })
    .join("");
}

const ROLE_WORDS = [
  "aluna", "alunas", "aluno", "alunos",
  "estudante", "estudantes",
  "professora", "professoras", "professor", "professores",
  "responsável", "responsáveis", "responsavel", "responsaveis",
  "mãe", "mae", "pai",
];
const ROLE_WORD_PATTERN = ROLE_WORDS.map(caseInsensitiveLiteral).join("|");
const NAME_TOKEN = "[A-ZÀ-Ý][\\wÀ-ÿ'’-]*";
const CONNECTOR_WORDS = ["da", "das", "de", "des", "do", "dos", "e"];
const CONNECTOR = `(?:${CONNECTOR_WORDS.map(caseInsensitiveLiteral).join("|")})`;
const CONTEXTUAL_NAME_REGEX = new RegExp(
  `\\b(?:${caseInsensitiveLiteral("a")}|${caseInsensitiveLiteral("o")})${caseInsensitiveLiteral("s")}?\\s+(${ROLE_WORD_PATTERN})\\s+((?:${NAME_TOKEN}|${CONNECTOR})(?:\\s+(?:${NAME_TOKEN}|${CONNECTOR})){0,4})`,
  "g",
);

/** Remove tokens conectores ("da", "de", "e"...) do fim da captura — a regex pode incluir um conector à toa antes de parar. */
function trimTrailingConnectors(capturedName: string): string {
  const tokens = capturedName.trim().split(/\s+/);
  while (tokens.length > 0 && new RegExp(`^${CONNECTOR}$`).test(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}

export interface ContextualNameMatchResult {
  text: string;
  replacements: AnonymizationReplacement[];
  unresolvedPersonalNames: string[];
}

/**
 * Camada 2 — encontra "a aluna X", "o professor X" etc. no texto (já passado
 * pela Camada 1, então nomes já mascarados não batem de novo). Se o nome
 * capturado corresponder ao cadastro, mascara; senão, só sinaliza
 * (`unresolvedPersonalNames`) — nunca resolve a ambiguidade adivinhando.
 */
export function detectContextualPersonalNames(text: string, knownNames: KnownPersonName[]): ContextualNameMatchResult {
  const replacements: AnonymizationReplacement[] = [];
  const unresolvedPersonalNames: string[] = [];
  const aliasAssigner = createAliasAssigner();
  let result = text;

  const matches = [...text.matchAll(CONTEXTUAL_NAME_REGEX)];
  for (const match of matches) {
    const rawName = trimTrailingConnectors(match[2]);
    if (!rawName) continue;

    const known = knownNames.find((entry) => buildFlexibleNamePattern(entry.fullName).test(rawName));
    if (known) {
      const alias = aliasAssigner.aliasFor(known.fullName, known.role);
      const pattern = buildFlexibleNamePattern(rawName);
      result = result.replace(pattern, alias);
      replacements.push({ alias, role: known.role, matchedVia: "contextual_pattern" });
    } else if (!unresolvedPersonalNames.includes(rawName)) {
      unresolvedPersonalNames.push(rawName);
    }
  }

  return { text: result, replacements, unresolvedPersonalNames };
}
