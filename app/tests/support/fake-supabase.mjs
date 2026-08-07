/**
 * Supabase falso, mínimo e verificável — cobre exatamente o subconjunto
 * de query builder que `getWorkspaceContext()` usa:
 *
 *   db.from(tabela).select(cols).eq(col, valor)…            → thenable
 *   db.from(tabela).select(cols).eq(col, valor)….maybeSingle()
 *
 * Registra toda cláusula `eq` em `db.calls` para que o teste possa
 * afirmar o que importa no multi-tenant: a consulta SEMPRE filtra por
 * `institution_id`. Nenhuma conexão de rede é aberta.
 */

class FakeQuery {
  constructor(table, rows, calls) {
    this.table = table;
    this.rows = rows;
    this.filters = [];
    this.calls = calls;
  }

  select() {
    return this;
  }

  eq(column, value) {
    this.filters.push([column, value]);
    return this;
  }

  #result() {
    this.calls.push({ table: this.table, filters: [...this.filters] });
    const data = this.rows.filter((row) =>
      this.filters.every(([column, value]) => row[column] === value),
    );
    return data;
  }

  async maybeSingle() {
    const data = this.#result();
    return { data: data[0] ?? null, error: null };
  }

  then(resolve, reject) {
    return Promise.resolve({ data: this.#result(), error: null }).then(
      resolve,
      reject,
    );
  }
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} tables linhas
 *   por tabela, já em snake_case (como o banco devolveria).
 */
export function createFakeSupabase(tables) {
  const calls = [];
  return {
    calls,
    from(table) {
      return new FakeQuery(table, tables[table] ?? [], calls);
    },
  };
}
