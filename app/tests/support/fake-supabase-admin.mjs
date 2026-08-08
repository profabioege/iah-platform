/**
 * Supabase falso para exercitar `db/seed/reset-demo.mjs` — cobre o
 * subconjunto que o script usa e NADA além:
 *
 *   db.from(t).select("cols").eq(c, v).maybeSingle()
 *   db.from(t).select("id", { count: "exact", head: true }).eq(c, v)
 *   db.from(t).delete().eq(c, v)
 *
 * Mantém as linhas em memória e registra toda operação em `db.ops`, para
 * que o teste possa afirmar o que importa num script destrutivo: todo
 * DELETE saiu com filtro `institution_id`, e nenhuma tabela estrutural
 * foi tocada. Nenhuma conexão de rede é aberta.
 *
 * Deliberadamente separado de `fake-supabase.mjs` (que serve aos testes
 * de contexto/escopo): aquele não conhece delete nem count, e misturar
 * as duas responsabilidades num só dublê tornaria os dois mais frouxos.
 */

/**
 * CONTRATO DE COLUNAS — a autoridade é o SQL das migrations, não este
 * arquivo. Contém apenas as colunas que o reset realmente usa; não é (e
 * não deve virar) um modelo completo do schema.
 *
 * Existe por causa de um defeito real: `institutions` foi consultada por
 * `institution_id`, coluna que ela não tem — ela é a raiz do tenant e se
 * identifica pelo próprio `id`. Um dublê permissivo devolvia 0 em
 * silêncio e o erro só apareceria contra o Postgres. Agora, filtrar por
 * coluna fora do contrato quebra o teste.
 *
 * Fontes:
 *   0001_initial_schema.sql      institutions, mission_progress,
 *                                productions, reflections, students,
 *                                classrooms, enrollments, teachers
 *   0002_classroom_sync_state.sql classroom_sync_states
 *   0003_identity.sql             users, profiles
 *   0005_production_foundation.sql lessons, mission_assignments,
 *                                  mission_reviews
 */
export const TABLE_CONTRACT = Object.freeze({
  // Raiz do tenant: NÃO tem institution_id.
  institutions: ["id", "name", "domain"],
  // Descendentes: escopo pelo institution_id.
  users: ["id", "institution_id"],
  profiles: ["id", "institution_id"],
  teachers: ["id", "institution_id"],
  students: ["id", "institution_id"],
  classrooms: ["id", "institution_id"],
  classroom_teachers: ["institution_id", "classroom_id", "teacher_id"],
  enrollments: ["id", "institution_id"],
  academic_years: ["id", "institution_id"],
  subjects: ["id", "institution_id"],
  lessons: ["id", "institution_id"],
  mission_progress: ["id", "institution_id"],
  productions: ["id", "institution_id"],
  reflections: ["id", "institution_id"],
  mission_assignments: ["id", "institution_id"],
  mission_reviews: ["id", "institution_id"],
  classroom_sync_states: ["id", "institution_id"],
  // Catálogo GLOBAL do IAH — sem institution_id, por decisão (D-023).
  missions: ["id"],
});

/** Erro de contrato: a query pediu algo que o schema real não tem. */
export class ContractViolation extends Error {}

function assertColumn(table, column) {
  const contrato = TABLE_CONTRACT[table];
  if (!contrato) {
    throw new ContractViolation(
      `Tabela fora do contrato conhecido: "${table}". ` +
        "Se ela passou a ser usada pelo reset, declare suas colunas em " +
        "TABLE_CONTRACT a partir do SQL da migration.",
    );
  }
  if (!contrato.includes(column)) {
    throw new ContractViolation(
      `Coluna "${column}" não existe em "${table}" segundo o schema real ` +
        `(colunas conhecidas: ${contrato.join(", ")}).`,
    );
  }
}

class FakeAdminQuery {
  constructor(table, store, ops) {
    this.table = table;
    this.store = store;
    this.ops = ops;
    this.filters = [];
    this.mode = "select";
    this.countMode = false;
    if (!TABLE_CONTRACT[table]) {
      throw new ContractViolation(
        `Tabela fora do contrato conhecido: "${table}".`,
      );
    }
  }

  select(columns, options = {}) {
    this.mode = "select";
    this.countMode = options.count === "exact";
    if (typeof columns === "string") {
      for (const coluna of columns.split(",").map((c) => c.trim())) {
        if (coluna && coluna !== "*") assertColumn(this.table, coluna);
      }
    }
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(column, value) {
    // O ponto do dublê: filtrar por coluna inexistente é ERRO, não um
    // resultado vazio. Contra o Postgres isso seria 42703
    // (undefined_column); aqui vira falha de teste, que é onde deve doer.
    assertColumn(this.table, column);
    this.filters.push([column, value]);
    return this;
  }

  #matching() {
    const rows = this.store[this.table] ?? [];
    return rows.filter((row) =>
      this.filters.every(([column, value]) => row[column] === value),
    );
  }

  #record() {
    this.ops.push({
      table: this.table,
      mode: this.mode,
      filters: [...this.filters],
    });
  }

  #run() {
    this.#record();
    if (this.mode === "delete") {
      const alvo = new Set(this.#matching());
      this.store[this.table] = (this.store[this.table] ?? []).filter(
        (row) => !alvo.has(row),
      );
      return { data: null, error: null, count: alvo.size };
    }
    const data = this.#matching();
    if (this.countMode) return { data: null, error: null, count: data.length };
    return { data, error: null, count: null };
  }

  async maybeSingle() {
    const { data, error } = this.#run();
    return { data: (data ?? [])[0] ?? null, error };
  }

  then(resolve, reject) {
    return Promise.resolve(this.#run()).then(resolve, reject);
  }
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} tables linhas
 *   por tabela, em snake_case (como o banco devolveria).
 */
export function createFakeAdminSupabase(tables) {
  const store = {};
  for (const [table, rows] of Object.entries(tables)) {
    store[table] = rows.map((row) => ({ ...row }));
  }
  const ops = [];
  return {
    store,
    ops,
    from(table) {
      return new FakeAdminQuery(table, store, ops);
    },
  };
}

/** Cenário padrão: Instituto Horizonte semeado + jornada D1–D5 completa. */
export function createHorizonteScenario() {
  const inst = "inst-horizonte";
  const linhas = (n, extra = {}) =>
    Array.from({ length: n }, (_, i) => ({
      id: `${extra.prefix ?? "row"}-${String(i + 1).padStart(2, "0")}`,
      institution_id: inst,
    }));

  return createFakeAdminSupabase({
    // estrutural (semeado)
    institutions: [
      {
        id: inst,
        name: "Instituto Horizonte",
        domain: "institutohorizonte.edu.br",
      },
    ],
    academic_years: linhas(1, { prefix: "year" }),
    users: linhas(12, { prefix: "user" }),
    profiles: linhas(12, { prefix: "profile" }),
    teachers: linhas(1, { prefix: "teacher" }),
    students: linhas(10, { prefix: "student" }),
    classrooms: linhas(5, { prefix: "class" }),
    classroom_teachers: linhas(5, { prefix: "ct" }),
    enrollments: linhas(10, { prefix: "enroll" }),
    subjects: linhas(1, { prefix: "subject" }),
    lessons: linhas(1, { prefix: "lesson" }),
    missions: [{ id: "01-a-fabrica-de-noticias" }], // catálogo global, sem institution_id
    // dinâmico (produzido pela jornada)
    mission_assignments: linhas(1, { prefix: "assignment" }),
    mission_progress: linhas(2, { prefix: "prog" }),
    productions: linhas(2, { prefix: "production" }),
    reflections: linhas(1, { prefix: "reflection" }),
    mission_reviews: linhas(1, { prefix: "review" }),
    // dinâmico fora da jornada: baseline é vazio, mas o cenário semeia
    // duas linhas para provar que o reset as remove se um dia existirem.
    classroom_sync_states: linhas(2, { prefix: "sync" }),
  });
}
