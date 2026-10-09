/**
 * Carga do LOTE PILOTO IAH (40 itens originais, 10 por área) no Catálogo
 * IAH — D-053. Reaproveita a carga do acervo autoral (D-052): mesma
 * questão/versão/gabarito/devolutiva por alternativa, mesmo envio à
 * REVISÃO, mesma idempotência pelo código IAH do item.
 *
 * Entrada: o arquivo consolidado `banco_piloto_40_v1.1_aprovado.json`
 * (lote produzido em 05/10/2026 e aprovado pela coordenação editorial
 * em 06/10/2026). O arquivo fica FORA do repositório, como os acervos:
 * o repositório guarda o importador e testes com itens sintéticos.
 *
 * Diferenças para o acervo autoral:
 *  - habilidade BNCC e da Matriz conferidas na fonte oficial (não
 *    propostas por IA) — vão como `classificacao.origem = "autor"`;
 *  - dificuldade editorial vem do lote (rótulo, não TRI);
 *  - fonte própria (`…:iah-lote-piloto`), com a decisão da coordenação e
 *    a verificação de originalidade registradas em `external_ref`.
 *
 * O que NÃO faz: aprovar no sistema nem verificar direitos. A aprovação
 * da coordenação fica registrada como contexto para quem revisa; a
 * aprovação no catálogo continua exigindo revisor ≠ autor e fonte
 * verificada pela gestão (regras da 0017/0018, impostas pelo banco).
 */

import type { QuestionOption } from "../domain/entities";
import {
  buildAuthoredImportPlan,
  type AuthoredArea,
  type AuthoredImportPlan,
  type AuthoredItem,
} from "./iah-authored-import.ts";

export const LOTE_PILOTO_SOURCE_SUFFIX = "iah-lote-piloto";

const DIFFICULTY: Record<string, "facil" | "media" | "dificil"> = {
  "fácil": "facil",
  "média": "media",
  "difícil": "dificil",
};

interface LoteItem {
  id: string;
  versao: string;
  area: AuthoredArea;
  tema: string;
  serie_sugerida: string;
  habilidade_enem: { codigo: string; texto: string };
  habilidade_bncc: { codigo: string; texto: string };
  texto_base: string;
  comando: string;
  alternativas: Record<string, string>;
  gabarito: string;
  resolucao_comentada: string;
  analise_distratores: Record<string, string>;
  dificuldade_estimada: string;
  status_editorial: string;
  decisao_docente?: Record<string, unknown>;
  verificacao_originalidade?: Record<string, unknown>;
  fonte_texto_base?: string;
}

/** Texto-base com uma linha por parágrafo (tabelas do lote vêm como linhas). */
function paragraphs(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function parseLotePiloto(json: unknown): {
  items: AuthoredItem[];
  extras: Map<string, { difficulty: "facil" | "media" | "dificil" | null; item: LoteItem }>;
  problems: Array<{ codigo: string | null; problema: string }>;
} {
  const problems: Array<{ codigo: string | null; problema: string }> = [];
  const raw = (json as { itens?: LoteItem[] } | null)?.itens;
  if (!Array.isArray(raw)) return { items: [], extras: new Map(), problems: [{ codigo: null, problema: "arquivo sem a lista `itens`" }] };
  const items: AuthoredItem[] = [];
  const extras = new Map<string, { difficulty: "facil" | "media" | "dificil" | null; item: LoteItem }>();
  for (const it of raw) {
    const codigo = it?.id ?? null;
    if (!codigo || !/^IAH-(LC|CH|CN|MT)-\d{3}$/.test(codigo)) {
      problems.push({ codigo, problema: "código fora do padrão IAH-<área>-NNN" });
      continue;
    }
    if (it.status_editorial !== "aprovada") {
      problems.push({ codigo, problema: `status "${it.status_editorial}" — só itens aprovados pela coordenação entram` });
      continue;
    }
    const keys = Object.keys(it.alternativas ?? {}).sort();
    if (keys.join("") !== "ABCDE" || !keys.includes(it.gabarito)) {
      problems.push({ codigo, problema: "alternativas A–E ou gabarito inválidos" });
      continue;
    }
    const wrong = keys.filter((k) => k !== it.gabarito);
    if (wrong.some((k) => !it.analise_distratores?.[k]?.trim())) {
      problems.push({ codigo, problema: "falta a análise de algum distrator" });
      continue;
    }
    const options: QuestionOption[] = keys.map((key) => ({ key, text: it.alternativas[key] }));
    const feedback: Record<string, string> = { [it.gabarito]: it.resolucao_comentada };
    for (const k of wrong) feedback[k] = it.analise_distratores[k];
    items.push({
      codigo,
      area: it.area,
      titulo: it.tema,
      serie: it.serie_sugerida ?? null,
      versaoAutor: it.versao ?? null,
      stem: `${paragraphs(it.texto_base)}\n\n${it.comando}`,
      options,
      gabarito: it.gabarito,
      feedback,
      bncc: { codigo: it.habilidade_bncc.codigo, associacao: "conferida no HTML oficial do MEC (05/10/2026)" },
      matriz: { codigo: `${it.area}-${it.habilidade_enem.codigo}`, texto: it.habilidade_enem.texto },
      referencias: [],
    });
    extras.set(codigo, { difficulty: DIFFICULTY[it.dificuldade_estimada] ?? null, item: it });
  }
  return { items, extras, problems };
}

export function buildLotePilotoPlan(input: {
  json: unknown;
  arquivo: string;
  catalogInstitutionId: string;
  authorUserId: string;
  knownSkillIds: Set<string>;
}): AuthoredImportPlan {
  const parsed = parseLotePiloto(input.json);
  const plan = buildAuthoredImportPlan({
    files: [{ arquivo: input.arquivo, items: parsed.items }],
    proposals: [],
    catalogInstitutionId: input.catalogInstitutionId,
    authorUserId: input.authorUserId,
    knownSkillIds: input.knownSkillIds,
  });
  const sourceId = `src:${input.catalogInstitutionId}:${LOTE_PILOTO_SOURCE_SUFFIX}`;
  for (const item of plan.items) {
    const extra = parsed.extras.get(item.codigo);
    item.version.source_id = sourceId;
    item.version.editorial_difficulty = extra?.difficulty ?? null;
    item.version.authorship =
      `IAH Educacional — ${item.codigo}, lote piloto v${extra?.item.versao ?? "1.0"} ` +
      "(rascunho gerado por IA sob coordenação editorial; aprovado pela coordenação em 06/10/2026)";
    const ref = item.question.external_ref as Record<string, unknown>;
    ref.origem = "iah_lote_piloto";
    ref.classificacao = {
      ...(ref.classificacao as Record<string, unknown>),
      origem: "autor",
      aviso: "Habilidades conferidas nas fontes oficiais (Matriz do Enem/Inep e BNCC/MEC); correspondência com o item validada pela coordenação.",
    };
    ref.decisao_coordenacao = extra?.item.decisao_docente ?? null;
    ref.verificacao_originalidade = extra?.item.verificacao_originalidade ?? null;
    ref.fonte_texto_base = extra?.item.fonte_texto_base ?? null;
  }
  return {
    source: {
      ...plan.source,
      id: sourceId,
      title: "Lote piloto IAH — 40 itens originais (Ensino Médio, quatro áreas)",
      license:
        "Itens originais da IAH Educacional para uso nas escolas parceiras e nos produtos IAH. Não são itens oficiais do Inep.",
      evidence:
        `Lote produzido em 05/10/2026 (rascunho de IA sob coordenação editorial), com verificação de originalidade ` +
        `registrada por item, e aprovado pela coordenação em 06/10/2026. Arquivo de origem: ${input.arquivo}.`,
    },
    items: plan.items,
    problems: [...parsed.problems, ...plan.problems],
  };
}
