/**
 * Carga do PLANEJAMENTO CURRICULAR REAL da escola (D-055) — substitui o
 * recorte provisório (D-049) sem apagar nada.
 *
 * Entrada: planilha CSV preenchida pela escola (modelo em
 * `db/reference/modelo-planejamento-escolar.csv`), uma linha por
 * habilidade × componente × série × período:
 *
 *   serie;periodo;rotulo_periodo;componente;habilidade;observacao
 *   1ª;1;1º bimestre;Geografia;EM13CHS106;
 *
 * O que a carga confere ANTES de gravar (nada é gravado se houver
 * problema):
 *  - série 1ª, 2ª ou 3ª (aceita "1", "1ª série", "em1");
 *  - período inteiro de 1 a 12; rótulo opcional;
 *  - componente da lista de referência (nome ou id);
 *  - código da habilidade presente na BNCC de referência do projeto e da
 *    MESMA ÁREA do componente (Língua Portuguesa para EM13LP…);
 *  - linha repetida e linha de exemplo do modelo.
 *
 * Status: `approved` só quando a escola VALIDOU o planejamento (o
 * operador declara isso explicitamente); senão `provisional`. Ao aplicar
 * com `retireProvisional`, as linhas provisórias da mesma escola, ano
 * letivo e série que não estão na nova planilha passam a `retired`
 * (status — nada é apagado; o banco não dá DELETE ao app).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CurriculumPlanStatus, GradeCode } from "../domain/entities";
import { REFERENCE_COMPONENTS } from "./recorte-provisorio.ts";

export interface SchoolPlanRow {
  line: number;
  serie: string;
  periodo: string;
  rotuloPeriodo: string;
  componente: string;
  habilidade: string;
  observacao: string;
}

export interface SchoolPlanEntry {
  line: number;
  gradeCode: GradeCode;
  periodOrder: number;
  periodLabel: string;
  componentId: string;
  componentName: string;
  skillId: string;
  skillCode: string;
  notes: string | null;
}

export interface SchoolPlanProblem {
  line: number | null;
  problem: string;
}

export interface SchoolPlanImport {
  entries: SchoolPlanEntry[];
  problems: SchoolPlanProblem[];
  summary: Array<{ gradeCode: GradeCode; periods: number; skills: number; components: string[] }>;
}

/** Habilidade da BNCC de referência: código → área (e componente fixo, se houver). */
export interface BnccIndexEntry {
  code: string;
  area: "lgg" | "mat" | "cnt" | "chs";
  componente: string | null;
}

const HEADER = ["serie", "periodo", "rotulo_periodo", "componente", "habilidade", "observacao"] as const;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const schoolPlanSkillId = (code: string) => `bncc-${code.toLowerCase()}`;

/** CSV com `;` (padrão do Excel em pt-BR) ou `,`; aceita campos entre aspas. */
export function parseSchoolPlanCsv(text: string): { rows: SchoolPlanRow[]; problems: SchoolPlanProblem[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim() !== "");
  if (first < 0) return { rows: [], problems: [{ line: null, problem: "Planilha vazia." }] };
  const sep = (lines[first].match(/;/g) ?? []).length >= (lines[first].match(/,/g) ?? []).length ? ";" : ",";
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === sep && !quoted) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };
  const header = split(lines[first]).map(normalize);
  const missing = HEADER.filter((h) => h !== "observacao" && h !== "rotulo_periodo" && !header.includes(h));
  if (missing.length) {
    return { rows: [], problems: [{ line: first + 1, problem: `Cabeçalho sem as colunas: ${missing.join(", ")}.` }] };
  }
  const col = (cells: string[], name: string) => {
    const i = header.indexOf(name);
    return i >= 0 ? (cells[i] ?? "") : "";
  };
  const rows: SchoolPlanRow[] = [];
  for (let i = first + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    const cells = split(lines[i]);
    rows.push({
      line: i + 1,
      serie: col(cells, "serie"),
      periodo: col(cells, "periodo"),
      rotuloPeriodo: col(cells, "rotulo_periodo"),
      componente: col(cells, "componente"),
      habilidade: col(cells, "habilidade"),
      observacao: col(cells, "observacao"),
    });
  }
  return { rows, problems: [] };
}

export function gradeCodeOf(value: string): GradeCode | null {
  const v = normalize(value).replace(/\s+/g, "");
  if (/^(em)?1(a|o|ª|º)?(serie)?(em)?$/.test(v) || v === "em1") return "em1";
  if (/^(em)?2(a|o|ª|º)?(serie)?(em)?$/.test(v) || v === "em2") return "em2";
  if (/^(em)?3(a|o|ª|º)?(serie)?(em)?$/.test(v) || v === "em3") return "em3";
  return null;
}

const GRADE_LABEL: Record<GradeCode, string> = { em1: "1ª série", em2: "2ª série", em3: "3ª série" };

export function buildSchoolPlanImport(input: {
  rows: SchoolPlanRow[];
  bncc: BnccIndexEntry[];
  components?: ReadonlyArray<{ id: string; area_id: string; name: string }>;
}): SchoolPlanImport {
  const components = input.components ?? REFERENCE_COMPONENTS;
  const byCode = new Map(input.bncc.map((h) => [h.code.toUpperCase(), h]));
  const problems: SchoolPlanProblem[] = [];
  const entries: SchoolPlanEntry[] = [];
  const seen = new Set<string>();

  for (const row of input.rows) {
    if (/^exemplo/i.test(row.observacao)) {
      problems.push({ line: row.line, problem: "Linha de EXEMPLO do modelo — apague-a antes da carga." });
      continue;
    }
    const before = problems.length;
    const gradeCode = gradeCodeOf(row.serie);
    if (!gradeCode) problems.push({ line: row.line, problem: `Série "${row.serie}" inválida (use 1ª, 2ª ou 3ª).` });
    const periodOrder = Number(row.periodo);
    if (!Number.isInteger(periodOrder) || periodOrder < 1 || periodOrder > 12) {
      problems.push({ line: row.line, problem: `Período "${row.periodo}" inválido (inteiro de 1 a 12).` });
    }
    const component = components.find(
      (c) => c.id === row.componente.trim() || normalize(c.name) === normalize(row.componente),
    );
    if (!component) {
      problems.push({
        line: row.line,
        problem: `Componente "${row.componente}" fora da referência (${components.map((c) => c.name).join(", ")}).`,
      });
    }
    const code = row.habilidade.trim().toUpperCase();
    const skill = byCode.get(code);
    if (!skill) {
      problems.push({ line: row.line, problem: `Habilidade "${row.habilidade}" não encontrada na BNCC do Ensino Médio.` });
    } else if (component && component.area_id !== skill.area) {
      problems.push({
        line: row.line,
        problem: `${code} é da área ${skill.area.toUpperCase()}, mas "${component.name}" é de ${component.area_id.toUpperCase()}.`,
      });
    } else if (component && skill.componente === "lp" && component.id !== "comp-lgg-lingua-portuguesa") {
      problems.push({ line: row.line, problem: `${code} é habilidade de Língua Portuguesa.` });
    }
    if (problems.length > before || !gradeCode || !component || !skill) continue;

    const key = `${gradeCode}:${periodOrder}:${component.id}:${code}`;
    if (seen.has(key)) {
      problems.push({ line: row.line, problem: `Linha repetida (${GRADE_LABEL[gradeCode]}, período ${periodOrder}, ${component.name}, ${code}).` });
      continue;
    }
    seen.add(key);
    entries.push({
      line: row.line,
      gradeCode,
      periodOrder,
      periodLabel: row.rotuloPeriodo.trim() || `${periodOrder}º período`,
      componentId: component.id,
      componentName: component.name,
      skillId: schoolPlanSkillId(code),
      skillCode: code,
      notes: row.observacao.trim() || null,
    });
  }
  if (input.rows.length === 0) problems.push({ line: null, problem: "Planilha sem linhas de planejamento." });

  const summary = (["em1", "em2", "em3"] as const)
    .map((gradeCode) => {
      const of = entries.filter((e) => e.gradeCode === gradeCode);
      return {
        gradeCode,
        periods: new Set(of.map((e) => e.periodOrder)).size,
        skills: new Set(of.map((e) => e.skillId)).size,
        components: [...new Set(of.map((e) => e.componentName))].sort(),
      };
    })
    .filter((s) => s.skills > 0);
  return { entries, problems, summary };
}

export interface ApplySchoolPlanResult {
  written: number;
  retired: number;
}

/**
 * Grava (service_role, mesma trava de destino dos scripts). Upsert pela
 * chave natural (escola × ano × série × período × componente ×
 * habilidade): uma linha provisória igual passa a `status` novo, sem
 * duplicar. Com `retireProvisional`, aposenta as provisórias restantes
 * das séries presentes na planilha.
 */
export async function applySchoolPlanImport(
  admin: SupabaseClient,
  plan: SchoolPlanImport,
  target: {
    institutionId: string;
    academicYearId: string;
    status: Exclude<CurriculumPlanStatus, "retired">;
    authorUserId: string | null;
    retireProvisional: boolean;
    sourceLabel: string;
  },
): Promise<ApplySchoolPlanResult> {
  if (plan.problems.length) throw new Error("A planilha tem problemas; corrija antes de gravar.");
  const { institutionId, academicYearId } = target;
  const rows = plan.entries.map((e) => ({
    id: `plan:${institutionId}:${academicYearId}:${e.gradeCode}:${e.periodOrder}:${e.componentId}:${e.skillId}`,
    institution_id: institutionId,
    academic_year_id: academicYearId,
    grade_code: e.gradeCode,
    period_order: e.periodOrder,
    period_label: e.periodLabel,
    component_id: e.componentId,
    skill_id: e.skillId,
    status: target.status,
    notes: [target.sourceLabel, e.notes].filter(Boolean).join(" — "),
    created_by: target.authorUserId,
  }));
  // Upsert pela chave natural: a linha que já existe mantém o próprio id.
  const existing = await admin
    .from("school_curriculum_plans")
    .select("id, grade_code, period_order, component_id, skill_id")
    .eq("institution_id", institutionId)
    .eq("academic_year_id", academicYearId);
  if (existing.error) throw new Error(`planejamento atual: ${existing.error.message}`);
  const idByKey = new Map(
    (existing.data ?? []).map((r) => [`${r.grade_code}:${r.period_order}:${r.component_id}:${r.skill_id}`, r.id as string]),
  );
  // Linhas novas levam o autor; as que já existiam mantêm o id e o autor.
  const fresh: typeof rows = [];
  const updates: Array<Omit<(typeof rows)[number], "created_by">> = [];
  for (const r of rows) {
    const id = idByKey.get(`${r.grade_code}:${r.period_order}:${r.component_id}:${r.skill_id}`);
    if (id) {
      const { created_by: _keep, ...rest } = r;
      void _keep;
      updates.push({ ...rest, id });
    } else fresh.push(r);
  }
  for (const [batch, label] of [
    [fresh, "planejamento (novas)"],
    [updates, "planejamento (atualizadas)"],
  ] as const) {
    if (!batch.length) continue;
    const { error } = await admin.from("school_curriculum_plans").upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`${label}: ${error.message}`);
  }
  const toWrite = [...fresh, ...updates];

  let retired = 0;
  if (target.retireProvisional) {
    const keep = new Set(toWrite.map((r) => r.id));
    const grades = [...new Set(plan.entries.map((e) => e.gradeCode))];
    const { data, error: listError } = await admin
      .from("school_curriculum_plans")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId)
      .eq("status", "provisional")
      .in("grade_code", grades);
    if (listError) throw new Error(`provisórias: ${listError.message}`);
    const ids = (data ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
    if (ids.length) {
      const { error: retireError } = await admin
        .from("school_curriculum_plans")
        .update({ status: "retired" })
        .in("id", ids);
      if (retireError) throw new Error(`aposentar provisórias: ${retireError.message}`);
    }
    retired = ids.length;
  }
  return { written: toWrite.length, retired };
}
