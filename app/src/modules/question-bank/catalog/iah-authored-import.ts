/**
 * Carga do ACERVO AUTORAL IAH no Catálogo IAH (D-052) — biblioteca usada
 * por `scripts/catalogo-iah-autoral-carga.mjs` e pelos testes.
 *
 * Entrada: arquivos .md no formato dos acervos "Aprova Enem — 40 questões"
 * (acervo 01: `## Questão NN — Área` + `**ID:**`; acervo 02:
 * `## IAH-EM-XX-NNN — Título` + `**Área:** … · **Série sugerida:** …`),
 * com alternativas A–E, gabarito, devolutiva por alternativa e, quando
 * houver, BNCC, habilidade da Matriz e referências históricas.
 *
 * O que a carga faz: por item, questão do catálogo, versão 1 com
 * enunciado em `marcacao_v2` (tabelas preservadas), gabarito, resolução
 * (a devolutiva da correta) e devolutiva por alternativa; envia à
 * REVISÃO. Habilidade oficial = BNCC do autor (acervo 02) ou BNCC
 * PROPOSTA por IA (acervo 01, arquivo de classificação), sempre marcada
 * em `external_ref.classificacao`. Matriz do Enem entra como sugestão a
 * confirmar. Fonte `autoral_iah` única, com direitos PENDENTES até a
 * gestão IAH verificar.
 *
 * O que NÃO faz: aprovar, verificar direitos, inventar dificuldade.
 * Idempotente pelo código IAH do item.
 *
 * Imports de runtime com extensão `.ts` explícita: roda direto no Node
 * com --experimental-strip-types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuestionOption } from "../domain/entities";
import { markdownToMarkupV2 } from "../domain/markup.ts";
import { bnccSkillId, matrizSkillId } from "./enem-import.ts";

export type AuthoredArea = "LC" | "CH" | "CN" | "MT";

export interface AuthoredItem {
  codigo: string;
  area: AuthoredArea;
  titulo: string | null;
  serie: string | null;
  versaoAutor: string | null;
  stem: string;
  options: QuestionOption[];
  gabarito: string;
  feedback: Record<string, string>;
  bncc: { codigo: string; associacao: string | null } | null;
  matriz: { codigo: string; texto: string | null } | null;
  referencias: Array<{ titulo: string; url: string; nota: string }>;
}

export interface ClassificationProposal {
  codigo: string;
  bncc: string;
  confianca_bncc: "alta" | "media" | "baixa";
  matriz: string;
  confianca_matriz: "alta" | "media" | "baixa";
  serie: string;
  motivo: string;
}

const AREA_COMPONENT: Record<AuthoredArea, string> = {
  LC: "comp-lgg-area",
  CH: "comp-chs-area",
  CN: "comp-cnt-area",
  MT: "comp-mat-matematica",
};

const SKILL_LINE = /\s*Habilidade trabalhada \(([A-Z]{2}-H\d+)\):\s*([^\n]*)$/;

/** Divide o arquivo em itens e lê cada um. Problemas de formato voltam em `problems`, sem derrubar o resto. */
export function parseAuthoredMarkdown(text: string, arquivo: string): {
  items: AuthoredItem[];
  problems: Array<{ codigo: string | null; problema: string }>;
} {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n(?=## (?:Questão \d+|IAH-EM-[A-Z]{2}-\d{3}))/).slice(1);
  const items: AuthoredItem[] = [];
  const problems: Array<{ codigo: string | null; problema: string }> = [];
  for (const raw of blocks) {
    const block = raw.replace(/\n---\s*$/, "");
    const codigo = block.match(/IAH-EM-(LC|CH|CN|MT)-\d{3}/)?.[0] ?? null;
    if (!codigo) {
      problems.push({ codigo: null, problema: `item sem código IAH em ${arquivo}` });
      continue;
    }
    const area = codigo.slice(7, 9) as AuthoredArea;
    const lines = block.split("\n");
    const titulo = lines[0].startsWith("## IAH-EM-") ? lines[0].split(" — ").slice(1).join(" — ").trim() || null : null;
    const meta = block.match(/\*\*Área:\*\*[^\n]*/)?.[0] ?? "";
    const serie = meta.match(/Série sugerida:\*\*\s*([^·\n]+)/)?.[1]?.trim() ?? null;
    const versaoAutor = meta.match(/Versão:\*\*\s*([^·\n]+)/)?.[1]?.trim() ?? null;

    // Enunciado: depois da linha de identificação/metadados, até a alternativa A.
    const afterHeader = block.split(/\n\*\*(?:ID|Área):\*\*[^\n]*\n/)[1] ?? "";
    const stem = afterHeader.split(/\n\*\*A\)\*\*/)[0].trim();

    const options: QuestionOption[] = [];
    for (const letter of ["A", "B", "C", "D", "E"]) {
      const m = block.match(new RegExp(`\\n\\*\\*${letter}\\)\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*[A-E]\\)\\*\\*|\\n\\*\\*Gabarito)`));
      if (m) options.push({ key: letter, text: m[1].trim() });
    }
    const gabarito = block.match(/\*\*Gabarito:\s*([A-E])\.?\*\*/)?.[1] ?? "";

    const devolutivas = block.split(/\n### Devolutivas[^\n]*\n/)[1] ?? "";
    const feedback: Record<string, string> = {};
    let matriz: AuthoredItem["matriz"] = null;
    for (const m of devolutivas.matchAll(
      /\*\*([A-E]) — (?:correta|incorreta):\*\*\s*([\s\S]*?)(?=\n\*\*[A-E] — |\n\*\*BNCC:|\n\*\*Referência histórica:|$)/g,
    )) {
      let textValue = m[2].trim();
      const skill = textValue.match(SKILL_LINE);
      if (skill) {
        matriz = { codigo: skill[1], texto: skill[2].trim() || null };
        textValue = textValue.replace(SKILL_LINE, "").trim();
      }
      feedback[m[1]] = textValue;
    }
    const correctLetter = devolutivas.match(/\*\*([A-E]) — correta:\*\*/)?.[1] ?? null;

    const bnccMatch = block.match(/\*\*BNCC:\*\*\s*(EM13[A-Z]+\d+)\.?\s*([^\n]*)/);
    const bncc = bnccMatch
      ? { codigo: bnccMatch[1], associacao: bnccMatch[2].replace(/^Associação editorial por recorte:\s*/, "").trim() || null }
      : null;
    const referencias = [...block.matchAll(/\*\*Referência histórica:\*\*\s*\[([^\]]+)\]\(([^)]+)\)\s*—?\s*([^\n]*)/g)].map(
      (m) => ({ titulo: m[1].trim(), url: m[2].trim(), nota: m[3].trim() }),
    );

    const issues: string[] = [];
    if (!stem) issues.push("enunciado vazio");
    if (options.length !== 5 || options.some((o) => !o.text)) issues.push(`${options.length} alternativas com texto`);
    if (!gabarito) issues.push("sem gabarito");
    if (Object.keys(feedback).length !== 5) issues.push(`${Object.keys(feedback).length} devolutivas`);
    if (gabarito && correctLetter !== gabarito) issues.push(`devolutiva "correta" (${correctLetter}) ≠ gabarito (${gabarito})`);
    if (issues.length) {
      problems.push(...issues.map((problema) => ({ codigo, problema })));
      continue;
    }
    items.push({ codigo, area, titulo, serie, versaoAutor, stem, options, gabarito, feedback, bncc, matriz, referencias });
  }
  return { items, problems };
}

export interface PlannedAuthoredItem {
  codigo: string;
  questionId: string;
  versionId: string;
  question: Record<string, unknown>;
  version: Record<string, unknown>;
  key: Record<string, unknown>;
  suggestion: Record<string, unknown> | null;
}

export interface AuthoredImportPlan {
  source: Record<string, unknown>;
  items: PlannedAuthoredItem[];
  problems: Array<{ codigo: string | null; problema: string }>;
}

export const AUTHORED_SOURCE_SUFFIX = "iah-autoral";

export function buildAuthoredImportPlan(input: {
  files: Array<{ arquivo: string; items: AuthoredItem[] }>;
  proposals: ClassificationProposal[];
  catalogInstitutionId: string;
  authorUserId: string;
  knownSkillIds: Set<string>;
}): AuthoredImportPlan {
  const cat = input.catalogInstitutionId;
  const sourceId = `src:${cat}:${AUTHORED_SOURCE_SUFFIX}`;
  const proposalByCode = new Map(input.proposals.map((p) => [p.codigo, p]));
  const problems: AuthoredImportPlan["problems"] = [];
  const items: PlannedAuthoredItem[] = [];
  const seen = new Set<string>();

  for (const { arquivo, items: fileItems } of input.files) {
    for (const item of fileItems) {
      if (seen.has(item.codigo)) {
        problems.push({ codigo: item.codigo, problema: "código repetido entre os arquivos" });
        continue;
      }
      seen.add(item.codigo);
      const proposal = proposalByCode.get(item.codigo);
      const fromAuthor = item.bncc !== null;
      const bnccCode = item.bncc?.codigo ?? proposal?.bncc ?? null;
      const matrizCode = item.matriz?.codigo ?? proposal?.matriz ?? null; // ex.: "LC-H21"
      if (!bnccCode) {
        problems.push({ codigo: item.codigo, problema: "sem BNCC do autor nem proposta de classificação" });
        continue;
      }
      const skillId = bnccSkillId(bnccCode);
      if (!input.knownSkillIds.has(skillId)) {
        problems.push({ codigo: item.codigo, problema: `BNCC ${bnccCode} fora da referência carregada` });
        continue;
      }
      let matrizSkill: string | null = null;
      if (matrizCode) {
        const [sigla, h] = matrizCode.split("-H");
        matrizSkill = matrizSkillId(sigla, Number(h));
        if (!input.knownSkillIds.has(matrizSkill)) {
          problems.push({ codigo: item.codigo, problema: `Matriz ${matrizCode} fora da referência carregada` });
          continue;
        }
        if (sigla !== item.area) {
          problems.push({ codigo: item.codigo, problema: `Matriz ${matrizCode} de outra área (${item.area})` });
          continue;
        }
      }

      const questionId = `q:${cat}:${item.codigo}`;
      const versionId = `qv:${cat}:${item.codigo}:1`;
      items.push({
        codigo: item.codigo,
        questionId,
        versionId,
        question: {
          id: questionId,
          institution_id: cat,
          // Na BNCC do EM, só Língua Portuguesa (EM13LP…) é presa a componente.
          component_id: /^EM13LP\d/.test(bnccCode) ? "comp-lgg-lingua-portuguesa" : AREA_COMPONENT[item.area],
          skill_id: skillId,
          created_by: input.authorUserId,
          external_ref: {
            chave: `iah:${item.codigo}`,
            origem: "iah_autoral",
            codigo: item.codigo,
            titulo: item.titulo,
            arquivo,
            area: item.area,
            serie_sugerida: item.serie ?? proposal?.serie ?? null,
            serie_origem: item.serie ? "autor" : proposal ? "ia" : null,
            versao_autor: item.versaoAutor,
            classificacao: fromAuthor
              ? { origem: "autor", bncc: bnccCode, matriz: matrizCode, associacao: item.bncc?.associacao ?? null }
              : {
                  origem: "ia",
                  bncc: bnccCode,
                  matriz: matrizCode,
                  confianca_bncc: proposal?.confianca_bncc,
                  confianca_matriz: proposal?.confianca_matriz,
                  motivo: proposal?.motivo,
                  aviso: "Proposta por IA — conferir na revisão (item 'habilidade').",
                },
            habilidade_trabalhada: item.matriz?.texto ?? null,
            referencias: item.referencias,
          },
        },
        version: {
          id: versionId,
          institution_id: cat,
          question_id: questionId,
          version: 1,
          stem: markdownToMarkupV2(item.stem),
          options: item.options.map((o) => ({ key: o.key, text: markdownToMarkupV2(o.text) })),
          editorial_difficulty: null,
          source_id: sourceId,
          authorship: `IAH Educacional — ${item.codigo} (${arquivo}${item.versaoAutor ? `, versão ${item.versaoAutor}` : ""})`,
          created_by: input.authorUserId,
          content_format: "marcacao_v2",
        },
        key: {
          version_id: versionId,
          institution_id: cat,
          answer_key: item.gabarito,
          resolution: item.feedback[item.gabarito],
          option_feedback: item.feedback,
        },
        suggestion: matrizSkill
          ? {
              id: `sug:${questionId}:${matrizSkill}`,
              institution_id: cat,
              question_id: questionId,
              skill_id: matrizSkill,
              origin: fromAuthor ? "equipe" : "ia",
              confidence: fromAuthor ? "alta" : proposal?.confianca_matriz ?? "media",
              rationale: fromAuthor
                ? `Associação do autor${item.matriz?.texto ? `: ${item.matriz.texto}` : ""}`
                : proposal?.motivo ?? "Proposta por IA",
            }
          : null,
      });
    }
  }

  const source = {
    id: sourceId,
    institution_id: cat,
    kind: "autoral_iah",
    title: "Acervo autoral IAH Educacional — questões inéditas estilo Enem/vestibular",
    rights_holder: "IAH Educacional",
    license: "Itens originais da IAH Educacional para uso nas escolas parceiras e nos produtos IAH (inclui o Aprova ENEM).",
    evidence: `Autoria IAH declarada pelo Founder em 04/10/2026. Arquivos de origem: ${input.files.map((f) => f.arquivo).join("; ")}.`,
    created_by: input.authorUserId,
  };
  return { source, items, problems };
}

function check(step: string, error: { message: string } | null) {
  if (error) throw new Error(`${step}: ${error.message}`);
}

/** Grava o plano (cliente service_role) e envia cada item novo à revisão. Idempotente. */
export async function applyAuthoredImport(
  admin: SupabaseClient,
  plan: AuthoredImportPlan,
): Promise<{ created: number; alreadyPresent: number; suggestions: number }> {
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

  const result = { created: 0, alreadyPresent: 0, suggestions: 0 };
  for (const item of plan.items) {
    const { data: version } = await admin
      .from("question_versions").select("id").eq("id", item.versionId).maybeSingle();
    if (version) {
      result.alreadyPresent += 1;
    } else {
      check(`questão ${item.codigo}`, (await admin.from("questions")
        .upsert(item.question, { onConflict: "id", ignoreDuplicates: true })).error);
      check(`versão ${item.codigo}`, (await admin.from("question_versions").insert(item.version)).error);
      check(`gabarito ${item.codigo}`, (await admin.from("question_version_keys").insert(item.key)).error);
      check(`envio ${item.codigo}`, (await admin.from("question_versions")
        .update({ status: "em_revisao" }).eq("id", item.versionId)).error);
      result.created += 1;
    }
    if (item.suggestion) {
      const { data, error } = await admin.from("question_skill_suggestions")
        .upsert(item.suggestion, { onConflict: "question_id,skill_id", ignoreDuplicates: true })
        .select("id");
      check(`sugestão ${item.codigo}`, error);
      result.suggestions += data?.length ?? 0;
    }
  }
  return result;
}
