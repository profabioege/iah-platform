/**
 * Carga do Enem no CATÁLOGO IAH (D-050) — biblioteca usada pelo script
 * `scripts/catalogo-enem-carga.mjs` e pelos testes.
 *
 * Entrada:
 *  - `itens.json` gerado por `tools/enem-extracao` (enunciado e
 *    alternativas em marcação mínima, figuras em PNG, gabarito oficial);
 *  - linhas do `ITENS_PROVA_<ano>.csv` dos microdados do INEP (código do
 *    item, habilidade da Matriz, parâmetros TRI oficiais);
 *  - sugestões BNCC (arquivo `*-bncc-sugerida.json`).
 *
 * O que a carga FAZ: cria, por item não anulado, a questão do catálogo
 * (habilidade oficial = Matriz do Enem), a versão 1 em RASCUNHO com
 * gabarito e SEM resolução, as figuras e as correspondências BNCC como
 * `sugerida`. Uma fonte `licenciado` por edição, com direitos PENDENTES.
 *
 * O que a carga NÃO faz: aprovar, verificar direitos, escrever resolução,
 * inventar dificuldade. Nada daqui chega a escola ou aluno até a equipe
 * IAH escrever a resolução, a revisão aprovar (autor ≠ revisor) e a
 * gestão IAH verificar a licença — regras conferidas pelo banco (0017/0018).
 * Parâmetro TRI fica em `external_ref.tri`, com procedência; nunca vira
 * `editorial_difficulty`.
 *
 * Idempotente: ids determinísticos pelo código do item no INEP; rodar de
 * novo só cria o que falta.
 *
 * Imports de runtime com extensão `.ts` explícita (como em `knowledge/`):
 * roda direto no Node com --experimental-strip-types.
 */

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuestionOption } from "../domain/entities";
import { figureRefs, MARKUP_TAGS } from "../domain/markup.ts";

// ---------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------

export interface ExtractedFigure {
  n: number;
  arquivo: string;
  pagina: number;
}

export interface ExtractedItem {
  numero: number;
  area: "CN" | "MT" | "LC" | "CH";
  enunciado: string;
  alternativas: QuestionOption[];
  figuras: ExtractedFigure[];
  paginas: number[];
  alertas: string[];
  gabarito: string | null;
  anulada: boolean;
}

export interface Extraction {
  meta: { ano: number; dia: number; caderno: number; arquivo_prova: string; arquivo_gabarito: string };
  itens: ExtractedItem[];
}

export interface MicrodadosRow {
  posicao: number;
  area: string;
  coItem: string;
  gabarito: string;
  habilidade: number | null;
  paramA: number | null;
  paramB: number | null;
  paramC: number | null;
  cor: string | null;
  coProva: string;
  abandonado: boolean;
}

export interface BnccSuggestionFile {
  origem: string;
  aviso: string;
  sugestoes: Array<{ numero: number; bncc: string; confianca: "alta" | "media" | "baixa"; motivo: string }>;
}

export interface BnccReference {
  fonte: string;
  licenca: string;
  documento: string;
  habilidades: Array<{ codigo: string; area: string; componente: string | null; texto: string; localizador: string }>;
}

export interface MatrizReference {
  documento: string;
  fonte: string;
  areas: Record<string, {
    sigla_enem: string;
    competencias: Record<string, string>;
    habilidades: Array<{ codigo: string; numero: number; competencia: number; texto: string }>;
  }>;
}

// ---------------------------------------------------------------------
// Identificadores e constantes
// ---------------------------------------------------------------------

/** Componentes de referência usados pelo catálogo (mesmos ids do recorte). */
export const CATALOG_COMPONENTS = [
  { id: "comp-lgg-lingua-portuguesa", area_id: "lgg", name: "Língua Portuguesa" },
  { id: "comp-mat-matematica", area_id: "mat", name: "Matemática" },
  // A prova de CN não separa Biologia/Física/Química nos microdados.
  { id: "comp-cnt-area", area_id: "cnt", name: "Ciências da Natureza (área)" },
  // Itens por área do acervo autoral IAH (D-052).
  { id: "comp-lgg-area", area_id: "lgg", name: "Linguagens (área)" },
  { id: "comp-chs-area", area_id: "chs", name: "Ciências Humanas (área)" },
] as const;

export const AREAS = [
  { id: "lgg", code: "LGG", name: "Linguagens e suas Tecnologias" },
  { id: "mat", code: "MAT", name: "Matemática e suas Tecnologias" },
  { id: "cnt", code: "CNT", name: "Ciências da Natureza e suas Tecnologias" },
  { id: "chs", code: "CHS", name: "Ciências Humanas e Sociais Aplicadas" },
] as const;

const ENEM_AREA: Record<string, { areaId: string; componentId: string; sigla: string }> = {
  CN: { areaId: "cnt", componentId: "comp-cnt-area", sigla: "CN" },
  MT: { areaId: "mat", componentId: "comp-mat-matematica", sigla: "MT" },
};

export const bnccSkillId = (code: string) => `bncc-${code.toLowerCase()}`;
export const matrizSkillId = (sigla: string, n: number) => `enem-${sigla.toLowerCase()}-h${n}`;
export const sourceIdFor = (catalogId: string, ano: number) => `src:${catalogId}:enem-${ano}`;
export const questionIdFor = (catalogId: string, coItem: string) => `q:${catalogId}:enem-item-${coItem}`;
export const versionIdFor = (catalogId: string, coItem: string) => `qv:${catalogId}:enem-item-${coItem}:1`;

// ---------------------------------------------------------------------
// Microdados
// ---------------------------------------------------------------------

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(field); field = ""; }
    else field += ch;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

const num = (v: string | undefined) => {
  if (v === undefined || v === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/**
 * `ITENS_PROVA_<ano>.csv` (INEP). Separador `;` (ou `,`), cabeçalho com os
 * nomes do dicionário. Colunas exigidas: CO_POSICAO, SG_AREA, CO_ITEM,
 * TX_GABARITO, CO_HABILIDADE, CO_PROVA. Opcionais: NU_PARAM_A/B/C,
 * TX_COR, IN_ITEM_ABAN.
 */
export function parseItensProvaCsv(text: string): MicrodadosRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("ITENS_PROVA vazio.");
  const sep = lines[0].includes(";") ? ";" : ",";
  const header = splitCsvLine(lines[0], sep).map((h) => h.toUpperCase());
  const col = (name: string, required = true) => {
    const i = header.indexOf(name);
    if (i < 0 && required) throw new Error(`ITENS_PROVA sem a coluna ${name}.`);
    return i;
  };
  const c = {
    posicao: col("CO_POSICAO"), area: col("SG_AREA"), item: col("CO_ITEM"), gabarito: col("TX_GABARITO"),
    habilidade: col("CO_HABILIDADE"), prova: col("CO_PROVA"),
    a: col("NU_PARAM_A", false), b: col("NU_PARAM_B", false), cc: col("NU_PARAM_C", false),
    cor: col("TX_COR", false), aban: col("IN_ITEM_ABAN", false),
  };
  return lines.slice(1).map((line) => {
    const f = splitCsvLine(line, sep);
    const at = (i: number) => (i >= 0 ? f[i] : undefined);
    return {
      posicao: Number(f[c.posicao]),
      area: f[c.area].toUpperCase(),
      coItem: f[c.item],
      gabarito: (f[c.gabarito] ?? "").toUpperCase(),
      habilidade: num(f[c.habilidade]),
      paramA: num(at(c.a)),
      paramB: num(at(c.b)),
      paramC: num(at(c.cc)),
      cor: at(c.cor) || null,
      coProva: f[c.prova],
      abandonado: at(c.aban) === "1",
    };
  });
}

/**
 * Descobre o CO_PROVA do caderno extraído comparando a sequência de
 * gabaritos (posição → letra) — o número do caderno não está nos
 * microdados. Exige concordância em TODAS as posições não anuladas; se
 * mais de uma prova concordar, elas precisam ter os mesmos itens nas
 * mesmas posições (caso contrário, recusa por ambiguidade).
 */
export function matchProva(rows: MicrodadosRow[], items: ExtractedItem[]): {
  coProvas: string[];
  cor: string | null;
  byPosition: Map<number, MicrodadosRow>;
} {
  const valid = items.filter((i) => !i.anulada && i.gabarito);
  if (valid.length === 0) throw new Error("Nenhum item com gabarito para casar com os microdados.");
  const areas = new Set(items.map((i) => i.area));
  const byProva = new Map<string, Map<number, MicrodadosRow>>();
  for (const row of rows) {
    if (!areas.has(row.area as ExtractedItem["area"])) continue;
    const m = byProva.get(row.coProva) ?? new Map<number, MicrodadosRow>();
    m.set(row.posicao, row);
    byProva.set(row.coProva, m);
  }
  const matches = [...byProva.entries()].filter(([, m]) =>
    valid.every((i) => m.get(i.numero)?.gabarito === i.gabarito && m.get(i.numero)?.area === i.area),
  );
  if (matches.length === 0) {
    throw new Error("Nenhuma prova dos microdados tem a mesma sequência de gabaritos deste caderno.");
  }
  const [first, ...rest] = matches;
  for (const [coProva, m] of rest) {
    const differs = items.some((i) => m.get(i.numero)?.coItem !== first[1].get(i.numero)?.coItem);
    if (differs) throw new Error(`Casamento ambíguo: provas ${first[0]} e ${coProva} diferem nos itens.`);
  }
  return {
    coProvas: matches.map(([id]) => id),
    cor: first[1].get(valid[0].numero)?.cor ?? null,
    byPosition: first[1],
  };
}

// ---------------------------------------------------------------------
// Plano de carga (função pura — testável sem banco)
// ---------------------------------------------------------------------

export interface PlannedItem {
  numero: number;
  questionId: string;
  versionId: string;
  question: Record<string, unknown>;
  version: Record<string, unknown>;
  key: { version_id: string; institution_id: string; answer_key: string; resolution: null };
  figures: Array<{ n: number; arquivo: string }>;
  suggestion: Record<string, unknown> | null;
}

export interface CatalogImportPlan {
  source: Record<string, unknown>;
  items: PlannedItem[];
  skipped: Array<{ numero: number; motivo: string }>;
  problems: Array<{ numero: number; problema: string }>;
}

const ALLOWED_TAG = new RegExp(`</?(?:${MARKUP_TAGS.join("|")})>`, "g");

function markupProblems(text: string, figures: Set<number>): string[] {
  const out: string[] = [];
  const stray = text.replace(ALLOWED_TAG, "").match(/<[^>]*>/g);
  if (stray) out.push(`marcação fora da lista: ${[...new Set(stray)].join(" ")}`);
  for (const n of figureRefs(text)) if (!figures.has(n)) out.push(`{{figura:${n}}} sem arquivo`);
  return out;
}

export function buildCatalogImportPlan(input: {
  extraction: Extraction;
  microdados: MicrodadosRow[];
  suggestions: BnccSuggestionFile | null;
  catalogInstitutionId: string;
  authorUserId: string;
}): CatalogImportPlan {
  const { extraction, catalogInstitutionId: cat, authorUserId } = input;
  const { ano, dia, caderno, arquivo_prova } = extraction.meta;
  const match = matchProva(input.microdados, extraction.itens);
  const sourceId = sourceIdFor(cat, ano);
  const suggestionByNumber = new Map((input.suggestions?.sugestoes ?? []).map((s) => [s.numero, s]));

  const source = {
    id: sourceId,
    institution_id: cat,
    kind: "licenciado",
    title: `Enem ${ano} — provas e gabaritos oficiais (INEP)`,
    rights_holder: "INEP/MEC; textos e imagens citados nos itens pertencem aos respectivos titulares",
    license: "A verificar pela gestão IAH: base legal para uso dos itens e do conteúdo de terceiros neles citado",
    license_url: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos",
    evidence: null,
    created_by: authorUserId,
  };

  const items: PlannedItem[] = [];
  const skipped: CatalogImportPlan["skipped"] = [];
  const problems: CatalogImportPlan["problems"] = [];

  for (const item of extraction.itens) {
    if (item.anulada || !item.gabarito) {
      skipped.push({ numero: item.numero, motivo: "anulada no gabarito oficial" });
      continue;
    }
    const area = ENEM_AREA[item.area];
    if (!area) {
      skipped.push({ numero: item.numero, motivo: `área ${item.area} ainda sem Matriz carregada` });
      continue;
    }
    const row = match.byPosition.get(item.numero)!;
    if (row.abandonado) {
      skipped.push({ numero: item.numero, motivo: "item abandonado nos microdados" });
      continue;
    }
    if (row.habilidade === null) {
      problems.push({ numero: item.numero, problema: "microdados sem CO_HABILIDADE" });
      continue;
    }
    const figureNumbers = new Set(item.figuras.map((f) => f.n));
    const issues = [
      ...markupProblems(item.enunciado, figureNumbers),
      ...item.alternativas.flatMap((o) => markupProblems(o.text, figureNumbers)),
    ];
    if (item.alternativas.length !== 5) issues.push(`${item.alternativas.length} alternativas`);
    if (!item.alternativas.some((o) => o.key === item.gabarito)) issues.push("gabarito fora das alternativas");
    if (issues.length) {
      problems.push(...issues.map((problema) => ({ numero: item.numero, problema })));
      continue;
    }

    const questionId = questionIdFor(cat, row.coItem);
    const versionId = versionIdFor(cat, row.coItem);
    const habilidade = matrizSkillId(area.sigla, row.habilidade);
    const suggestion = suggestionByNumber.get(item.numero);
    items.push({
      numero: item.numero,
      questionId,
      versionId,
      question: {
        id: questionId,
        institution_id: cat,
        component_id: area.componentId,
        skill_id: habilidade,
        created_by: authorUserId,
        external_ref: {
          chave: `enem-item:${row.coItem}`,
          origem: "inep_enem",
          ano,
          dia,
          aplicacao: "regular_impressa",
          caderno,
          cor: match.cor,
          co_prova: match.coProvas,
          posicao: item.numero,
          co_item: row.coItem,
          area: item.area,
          habilidade_matriz: `H${row.habilidade}`,
          tri:
            row.paramB === null
              ? null
              : {
                  a: row.paramA,
                  b: row.paramB,
                  c: row.paramC,
                  procedencia: `Parâmetro oficial INEP (microdados ITENS_PROVA_${ano}); não é dificuldade editorial e não gera proficiência em lista curta`,
                },
          arquivo_prova,
          paginas: item.paginas,
          alertas_extracao: item.alertas,
        },
      },
      version: {
        id: versionId,
        institution_id: cat,
        question_id: questionId,
        version: 1,
        stem: item.enunciado,
        options: item.alternativas.map((o) => ({ key: o.key, text: o.text })),
        editorial_difficulty: null,
        source_id: sourceId,
        authorship: `INEP — Enem ${ano}, ${dia}º dia, caderno ${caderno}, questão ${item.numero}. Texto extraído do PDF oficial; conferência humana pendente.`,
        created_by: authorUserId,
        content_format: "marcacao_v1",
      },
      key: { version_id: versionId, institution_id: cat, answer_key: item.gabarito, resolution: null },
      figures: item.figuras.map((f) => ({ n: f.n, arquivo: f.arquivo })),
      suggestion: suggestion
        ? {
            id: `sug:${questionId}:${bnccSkillId(suggestion.bncc)}`,
            institution_id: cat,
            question_id: questionId,
            skill_id: bnccSkillId(suggestion.bncc),
            origin: "ia",
            confidence: suggestion.confianca,
            rationale: suggestion.motivo,
          }
        : null,
    });
  }
  return { source, items, skipped, problems };
}

// ---------------------------------------------------------------------
// Gravação (cliente service_role — o catálogo e a referência comum não
// são graváveis pelo papel da aplicação a partir de uma escola)
// ---------------------------------------------------------------------

function check(step: string, error: { message: string } | null) {
  if (error) throw new Error(`${step}: ${error.message}`);
}

/** Áreas, componentes do catálogo, BNCC EM completa e Matriz do Enem. Idempotente. */
export async function loadCatalogReferences(
  admin: SupabaseClient,
  refs: { bncc: BnccReference; matriz: MatrizReference | MatrizReference[] },
): Promise<{ bncc: number; matriz: number }> {
  check("áreas", (await admin.from("curriculum_areas").upsert([...AREAS], { onConflict: "id" })).error);
  check("componentes", (await admin.from("curriculum_components").upsert(
    CATALOG_COMPONENTS.map((c) => ({ ...c, institution_id: null })), { onConflict: "id" },
  )).error);

  const bnccRows = refs.bncc.habilidades.map((h) => ({
    id: bnccSkillId(h.codigo),
    institution_id: null,
    framework: "bncc",
    area_id: h.area,
    component_id: h.componente === "lp" ? "comp-lgg-lingua-portuguesa" : null,
    code: h.codigo,
    description: h.texto,
    source_reference: `${refs.bncc.documento}, ${h.localizador}. Texto via bncc.dev (CC BY 4.0, mantido pela Profy).`,
  }));
  check("BNCC", (await admin.from("curriculum_skills").upsert(bnccRows, { onConflict: "id" })).error);

  const matrizes = Array.isArray(refs.matriz) ? refs.matriz : [refs.matriz];
  const matrizRows = matrizes.flatMap((matriz) => Object.entries(matriz.areas).flatMap(([areaId, area]) =>
    area.habilidades.map((h) => ({
      id: matrizSkillId(area.sigla_enem, h.numero),
      institution_id: null,
      framework: "enem_matriz",
      area_id: areaId,
      component_id: null,
      code: h.codigo,
      competency_code: `C${h.competencia}`,
      description: h.texto,
      source_reference: `${matriz.documento} — transcrição a conferir com o PDF oficial do INEP.`,
    })),
  ));
  check("Matriz", (await admin.from("curriculum_skills").upsert(matrizRows, { onConflict: "id" })).error);
  return { bncc: bnccRows.length, matriz: matrizRows.length };
}

/** Largura e altura do cabeçalho IHDR de um PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || sig.some((b, i) => bytes[i] !== b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

const toBytea = (bytes: Uint8Array) => `\\x${Buffer.from(bytes).toString("hex")}`;

export interface CatalogImportResult {
  created: number;
  alreadyPresent: number;
  figures: number;
  suggestions: number;
}

/**
 * Grava o plano. Exige que o inquilino seja `kind = 'catalogo'` e que o
 * autor pertença a ele. Versão já existente (em qualquer status) não é
 * tocada — corrigir é criar nova versão pelo fluxo editorial.
 */
export async function applyCatalogImport(
  admin: SupabaseClient,
  plan: CatalogImportPlan,
  readFigure: (arquivo: string) => Promise<Uint8Array>,
): Promise<CatalogImportResult> {
  const cat = String(plan.source.institution_id);
  const { data: inst, error: instError } = await admin
    .from("institutions").select("id, kind").eq("id", cat).maybeSingle();
  check("catálogo", instError);
  if (!inst || inst.kind !== "catalogo") {
    throw new Error(`A instituição ${cat} não existe ou não é o Catálogo IAH (kind = 'catalogo').`);
  }

  const { data: existingSource } = await admin
    .from("content_sources").select("id").eq("id", String(plan.source.id)).maybeSingle();
  if (!existingSource) check("fonte", (await admin.from("content_sources").insert(plan.source)).error);

  const result: CatalogImportResult = { created: 0, alreadyPresent: 0, figures: 0, suggestions: 0 };
  for (const item of plan.items) {
    const { data: version } = await admin
      .from("question_versions").select("id").eq("id", item.versionId).maybeSingle();
    if (version) {
      result.alreadyPresent += 1;
    } else {
      check(`questão ${item.numero}`, (await admin.from("questions")
        .upsert(item.question, { onConflict: "id", ignoreDuplicates: true })).error);
      check(`versão ${item.numero}`, (await admin.from("question_versions").insert(item.version)).error);
      check(`gabarito ${item.numero}`, (await admin.from("question_version_keys").insert(item.key)).error);
      for (const figure of item.figures) {
        const bytes = await readFigure(figure.arquivo);
        const size = pngSize(bytes);
        if (!size) throw new Error(`Figura ${figure.arquivo} não é PNG.`);
        check(`figura ${item.numero}.${figure.n}`, (await admin.from("question_assets").insert({
          id: `qa:${item.versionId}:${figure.n}`,
          institution_id: cat,
          version_id: item.versionId,
          n: figure.n,
          mime: "image/png",
          content: toBytea(bytes),
          width: size.width,
          height: size.height,
          alt_text: null,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        })).error);
        result.figures += 1;
      }
      result.created += 1;
    }
    if (item.suggestion) {
      const { data, error } = await admin.from("question_skill_suggestions")
        .upsert(item.suggestion, { onConflict: "question_id,skill_id", ignoreDuplicates: true })
        .select("id");
      check(`sugestão ${item.numero}`, error);
      result.suggestions += data?.length ?? 0;
    }
  }
  return result;
}
