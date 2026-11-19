import { query } from "@/lib/db";
import type { GalleryRow, GalleryVideoRow } from "@/lib/gallery";
import type { WebsiteMessageRow } from "@/lib/message-unlock";
import type { NewsRow } from "@/lib/news";

type DbError = { message: string; code?: string };
// The fluent adapter validates identifiers, while selected columns remain table-specific.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;
type DbResult<T = DbRow[]> =
  | { data: T; error: null; count?: number | null }
  | { data: null; error: DbError; count?: number | null };
type IdRow = DbRow & { id: string; deleted_at?: string | null };
type AdminProfileRow = IdRow & {
  display_name: string;
  username: string;
  contact_email: string | null;
  role_title: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  deleted_at: string | null;
  must_change_password: boolean;
  must_change_username: boolean;
  avatar_path: string | null;
};
type FaqGroupRow = IdRow & { title: string; sort_order: number; deleted_at?: string | null };
type FaqItemRow = IdRow & { group_id: string; question: string; answer: string; sort_order: number; deleted_at?: string | null };
type SiteSettingRow = { key: string; value: unknown; status?: string; updated_at?: string | null; updated_by?: string | null };
type ActivityRow = IdRow & {
  action: string;
  entity_type: string | null;
  metadata: Record<string, unknown> | null;
};
type StaffRequestRow = IdRow & {
  status: string;
  user_id: string;
  kind: "username" | "password";
  requested_username: string | null;
  reason: string | null;
  created_at: string;
};
type OrganizationSettingsRow = IdRow & {
  chart_download_id: string | null;
  intro_kicker: string | null;
  intro_title: string | null;
  intro_body: string | null;
  chart: unknown;
  board_sections: unknown;
  board_groups: unknown;
  milestones_title: string | null;
  milestones_lead: string | null;
};
type TableRows = {
  admin_profiles: AdminProfileRow;
  admin_module_permissions: { profile_id: string; module_key: string; can_publish: boolean };
  staff_sessions: { user_id: string; session_key: string; seen_at: string; expires_at: string; client_label: string | null };
  staff_account_requests: StaffRequestRow;
  activity_log: ActivityRow;
  login_attempts: IdRow & { created_at: string };
  website_messages: WebsiteMessageRow;
  news_items: NewsRow;
  gallery_photos: GalleryRow & { deleted_at?: string | null };
  gallery_videos: GalleryVideoRow & { deleted_at?: string | null };
  faq_groups: FaqGroupRow;
  faq_items: FaqItemRow;
  site_settings: SiteSettingRow;
  site_image_overrides: { slot_id: string; source: string; public_url: string | null; storage_path: string | null; media: unknown };
  organization_settings: OrganizationSettingsRow;
  service_status_log: { id: number; service: string; state: string; latency_ms: number; checked_at: string };
};
type IdTables =
  | "news_items" | "event_items"
  | "service_items" | "career_listings" | "download_items" | "organization_leadership"
  | "organization_yards" | "organization_board_members" | "organization_milestones"
  | "press_assets" | "products" | "projects" | "csr_projects" | "website_messages"
  | "content_drafts" | "draft_returns" | "staff_invites";
type RowFor<Table extends string> =
  Table extends keyof TableRows ? TableRows[Table] :
  Table extends IdTables ? IdRow :
  Table extends "services_settings" | "careers_settings" | "downloads_settings" |
    "press_settings" | "products_settings" | "projects_settings" |
    "csr_settings" ? IdRow :
  Table extends "faq_groups" ? FaqGroupRow :
  Table extends "faq_items" ? FaqItemRow :
  DbRow;
type RowOf<Result> = Result extends (infer Row)[] ? Row : DbRow;
type Filter = { column: string; operator: string; value: unknown };
type Relation = { table: string; parentColumn: string; childColumn: string; many: boolean };

const relations: Record<string, Record<string, Relation>> = {
  admin_profiles: {
    admin_module_permissions: {
      table: "admin_module_permissions",
      parentColumn: "id",
      childColumn: "profile_id",
      many: true,
    },
  },
  activity_log: {
    admin_profiles: {
      table: "admin_profiles",
      parentColumn: "actor_id",
      childColumn: "id",
      many: false,
    },
  },
};

function identifier(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error(`Invalid database identifier: ${value}`);
  return `"${value}"`;
}

function splitSelection(selection: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < selection.length; index += 1) {
    if (selection[index] === "(") depth += 1;
    if (selection[index] === ")") depth -= 1;
    if (selection[index] === "," && depth === 0) {
      parts.push(selection.slice(start, index).trim());
      start = index + 1;
    }
    if (depth < 0) throw new Error("Invalid select expression");
  }
  if (depth !== 0) throw new Error("Invalid select expression");
  const last = selection.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

function plainProjection(selection: string, source = "src") {
  const prefix = source ? `${source}.` : "";
  return splitSelection(selection).map((part) => {
    const aliasMatch = /^([a-z_][a-z0-9_]*):([a-z_][a-z0-9_]*)$/i.exec(part);
    if (aliasMatch) return `${prefix}${identifier(aliasMatch[2])} AS ${identifier(aliasMatch[1])}`;
    if (part === "*") return `${prefix}*`;
    return `${prefix}${identifier(part)}`;
  }).join(", ");
}

function projection(table: string, selection: string, count: boolean) {
  const fields = splitSelection(selection);
  const expressions = fields.map((field) => {
    const relationMatch = /^([a-z_][a-z0-9_]*)\((.*)\)$/i.exec(field);
    if (relationMatch) {
      const name = relationMatch[1];
      const nested = relationMatch[2];
      const relation = relations[table]?.[name];
      if (!relation) throw new Error(`Unknown relation ${table}.${name}`);
      const alias = identifier(name);
      const child = identifier(relation.table);
      const columns = splitSelection(nested);
      const jsonValue = columns.length === 1 && columns[0] === "*"
        ? `to_jsonb(${alias})`
        : `jsonb_build_object(${columns.map((column) => {
            const [key, value] = column.includes(":") ? column.split(":", 2).reverse() : [column, column];
            return `'${key.replace(/'/g, "''")}', ${alias}.${identifier(value)}`;
          }).join(", ")})`;
      const selected = relation.many
        ? `COALESCE((SELECT jsonb_agg(${jsonValue}) FROM ${child} AS ${alias} WHERE ${alias}.${identifier(relation.childColumn)} = src.${identifier(relation.parentColumn)}), '[]'::jsonb)`
        : `(SELECT ${jsonValue} FROM ${child} AS ${alias} WHERE ${alias}.${identifier(relation.childColumn)} = src.${identifier(relation.parentColumn)} LIMIT 1)`;
      return `${selected} AS ${identifier(name)}`;
    }
    const aliasMatch = /^([a-z_][a-z0-9_]*):([a-z_][a-z0-9_]*)$/i.exec(field);
    if (aliasMatch) return `src.${identifier(aliasMatch[2])} AS ${identifier(aliasMatch[1])}`;
    if (field === "*") return "src.*";
    return `src.${identifier(field)}`;
  });
  if (count) expressions.push("count(*) OVER() AS \"__db_count\"");
  return expressions.join(", ");
}

class TableQuery<T = DbRow[]> implements PromiseLike<DbResult<T>> {
  private readonly table: string;
  private operation: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private values: Record<string, unknown> | Record<string, unknown>[] = {};
  private filters: Filter[] = [];
  private alternatives: Filter[][] = [];
  private orders: { column: string; ascending: boolean; nullsFirst?: boolean }[] = [];
  private selection = "*";
  private returning = false;
  private singleMode: "single" | "maybeSingle" | null = null;
  private maxRows: number | null = null;
  private offset = 0;
  private countMode = false;
  private headOnly = false;
  private conflictColumns: string[] = [];

  constructor(table: string) {
    identifier(table);
    this.table = table;
  }

  select(selection: string, options: { count?: "exact"; head: true }): TableQuery<null>;
  select(selection?: string, options?: { count?: "exact"; head?: boolean }): this;
  select(
    selection = "*",
    options: { count?: "exact"; head?: boolean } = {},
  ): TableQuery<T> | TableQuery<null> {
    this.selection = selection;
    this.returning = this.operation !== "select";
    this.countMode = options.count === "exact";
    this.headOnly = options.head === true;
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = "insert";
    this.values = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.operation = "update";
    this.values = values;
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[], options: { onConflict?: string } = {}) {
    this.operation = "upsert";
    this.values = values;
    const columns = options.onConflict?.split(",").map((column) => column.trim()).filter(Boolean) ?? [];
    // Postgres requires an inference target for ON CONFLICT DO UPDATE. Default to id
    // (content tables). Callers with other keys must pass onConflict explicitly.
    this.conflictColumns = columns.length ? columns : ["id"];
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown) { return this.addFilter(column, value == null ? "IS NULL" : "=", value); }
  neq(column: string, value: unknown) { return this.addFilter(column, value == null ? "IS NOT NULL" : "<>", value); }
  gt(column: string, value: unknown) { return this.addFilter(column, ">", value); }
  gte(column: string, value: unknown) { return this.addFilter(column, ">=", value); }
  lt(column: string, value: unknown) { return this.addFilter(column, "<", value); }
  lte(column: string, value: unknown) { return this.addFilter(column, "<=", value); }
  is(column: string, value: unknown) {
    if (value !== null && typeof value !== "boolean") throw new Error("The is filter accepts null or boolean");
    return this.addFilter(column, value === null ? "IS NULL" : "IS", value);
  }
  in(column: string, values: readonly unknown[]) {
    this.filters.push({ column, operator: "IN", value: [...values] });
    return this;
  }
  ilike(column: string, value: string) { return this.addFilter(column, "ILIKE", value); }
  contains(column: string, value: unknown) { return this.addFilter(column, "@>", value); }
  or(expression: string) {
    const filters = expression.split(",").map((part) => {
      const match = /^([a-z_][a-z0-9_]*)\.(ilike|eq|is|gte|lte|gt|lt)\.(.*)$/i.exec(part);
      if (!match) throw new Error("Unsupported OR filter");
      const [, column, operator, raw] = match;
      identifier(column);
      const value = operator === "is" && raw === "null" ? null : raw;
      const sqlOperator: Record<string, string> = {
        ilike: "ILIKE", eq: value === null ? "IS NULL" : "=", is: value === null ? "IS NULL" : "IS",
        gte: ">=", lte: "<=", gt: ">", lt: "<",
      };
      return { column, operator: sqlOperator[operator], value };
    });
    if (!filters.length) throw new Error("Empty OR filter");
    this.alternatives.push(filters);
    return this;
  }
  not(column: string, operator: string, value: unknown) {
    const operators: Record<string, string> = { is: value === null ? "IS NOT NULL" : "IS NOT", eq: "<>", neq: "=", in: "NOT IN" };
    const sqlOperator = operators[operator];
    if (!sqlOperator) throw new Error(`Unsupported not filter operator: ${operator}`);
    return this.addFilter(column, sqlOperator, value);
  }

  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.orders.push({ column, ascending: options.ascending !== false, nullsFirst: options.nullsFirst });
    return this;
  }

  limit(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 10_000) throw new Error("Invalid query limit");
    this.maxRows = value;
    return this;
  }

  range(from: number, to: number) {
    if (!Number.isInteger(from) || from < 0 || !Number.isInteger(to) || to < from) throw new Error("Invalid query range");
    this.offset = from;
    this.maxRows = Math.min(to - from + 1, 10_000);
    return this;
  }

  single(): TableQuery<RowOf<T> | null> {
    this.singleMode = "single";
    return this as unknown as TableQuery<RowOf<T> | null>;
  }
  maybeSingle(): TableQuery<RowOf<T> | null> {
    this.singleMode = "maybeSingle";
    return this as unknown as TableQuery<RowOf<T> | null>;
  }

  private result(data: unknown, error: DbError | null, count: number | null = null): DbResult<T> {
    if (error) return { data: null, error, count };
    return { data: data as T, error: null, count };
  }

  private addFilter(column: string, operator: string, value: unknown) {
    identifier(column);
    this.filters.push({ column, operator, value });
    return this;
  }

  private buildWhere(params: unknown[], source = "src") {
    const expression = ({ column, operator, value }: Filter) => {
      const name = `${source}.${identifier(column)}`;
      if (operator === "IS NULL" || operator === "IS NOT NULL") return `${name} ${operator}`;
      if (operator === "IS") return `${name} IS ${value ? "TRUE" : "FALSE"}`;
      if (operator === "IN" || operator === "NOT IN") {
        const values = value as unknown[];
        if (!values.length) return operator === "IN" ? "FALSE" : "TRUE";
        params.push(values);
        return operator === "IN" ? `${name} = ANY($${params.length})` : `NOT (${name} = ANY($${params.length}))`;
      }
      params.push(operator === "@>" ? JSON.stringify(value) : value);
      const cast = operator === "@>" ? "::jsonb" : "";
      return `${name} ${operator} $${params.length}${cast}`;
    };
    const groups = [
      ...this.filters.map(expression),
      ...this.alternatives.map((filters) => `(${filters.map(expression).join(" OR ")})`),
    ];
    return groups.join(" AND ");
  }

  private async execute(): Promise<DbResult<T>> {
    try {
      const table = identifier(this.table);
      const params: unknown[] = [];
      let sql: string;
      let rows: DbRow[] = [];
      let rowCount = 0;

      if (this.operation === "select") {
        const where = this.buildWhere(params);
        const order = this.orders.length
          ? ` ORDER BY ${this.orders.map(({ column, ascending, nullsFirst }) => `src.${identifier(column)} ${ascending ? "ASC" : "DESC"}${nullsFirst === undefined ? "" : nullsFirst ? " NULLS FIRST" : " NULLS LAST"}`).join(", ")}`
          : "";
        const paging = `${this.maxRows === null ? "" : ` LIMIT ${this.maxRows}`} OFFSET ${this.offset}`;
        if (this.headOnly) {
          sql = `SELECT count(*)::int AS "__db_count" FROM ${table} AS src${where ? ` WHERE ${where}` : ""}`;
        } else {
          sql = `SELECT ${projection(this.table, this.selection, this.countMode)} FROM ${table} AS src${where ? ` WHERE ${where}` : ""}${order}${paging}`;
        }
        const result = await query<DbRow>(sql, params);
        rows = result.rows;
        rowCount = this.countMode || this.headOnly ? Number(rows[0]?.__db_count ?? 0) : result.rowCount ?? rows.length;
      } else {
        // insert/upsert are row writes (ON CONFLICT for upsert); only update/delete need a WHERE.
        if ((this.operation === "update" || this.operation === "delete") && !this.filters.length) {
          throw new Error("Refusing to run an unfiltered database mutation");
        }
        const sourceRows = Array.isArray(this.values) ? this.values : [this.values];
        if (this.operation === "insert" || this.operation === "upsert") {
          if (!sourceRows.length) return this.result([], null, 0);
          const columns = [...new Set(sourceRows.flatMap((row) => Object.keys(row)))];
          if (!columns.length) throw new Error("Cannot insert an empty row");
          const valuesSql = sourceRows.map((row) => {
            const placeholders = columns.map((column) => {
              identifier(column);
              params.push(row[column] ?? null);
              return `$${params.length}`;
            });
            return `(${placeholders.join(", ")})`;
          }).join(", ");
          const names = columns.map(identifier).join(", ");
          let conflict = "";
          if (this.operation === "upsert") {
            const updateColumns = columns.filter((column) => !this.conflictColumns.includes(column));
            const target = this.conflictColumns.length ? ` (${this.conflictColumns.map(identifier).join(", ")})` : "";
            conflict = updateColumns.length
              ? ` ON CONFLICT${target} DO UPDATE SET ${updateColumns.map((column) => `${identifier(column)} = EXCLUDED.${identifier(column)}`).join(", ")}`
              : ` ON CONFLICT${target} DO NOTHING`;
          }
          const returning = this.returning ? ` RETURNING ${plainProjection(this.selection, "")}` : "";
          sql = `INSERT INTO ${table} (${names}) VALUES ${valuesSql}${conflict}${returning}`;
        } else if (this.operation === "update") {
          const updates = Object.entries(this.values as Record<string, unknown>);
          if (!updates.length) throw new Error("Cannot update an empty row");
          const set = updates.map(([column, value]) => {
            params.push(value);
            return `${identifier(column)} = $${params.length}`;
          }).join(", ");
          const where = this.buildWhere(params);
          const returning = this.returning ? ` RETURNING ${plainProjection(this.selection)}` : "";
          sql = `UPDATE ${table} AS src SET ${set} WHERE ${where}${returning}`;
        } else {
          const where = this.buildWhere(params);
          const returning = this.returning ? ` RETURNING ${plainProjection(this.selection)}` : "";
          sql = `DELETE FROM ${table} AS src WHERE ${where}${returning}`;
        }
        const result = await query<DbRow>(sql, params);
        rows = result.rows;
        rowCount = result.rowCount ?? rows.length;
      }
      if (this.countMode || this.headOnly) {
        rows = rows.map((row) => {
          delete row.__db_count;
          return row;
        });
        if (this.headOnly) return this.result(null, null, rowCount);
      }
      if (this.singleMode === "single") {
        if (rows.length !== 1) return this.result(null, { code: "PGRST116", message: "Expected exactly one row" }, rowCount);
        return this.result(rows[0], null, rowCount);
      }
      if (this.singleMode === "maybeSingle") {
        if (rows.length > 1) return this.result(null, { code: "PGRST116", message: "Expected at most one row" }, rowCount);
        return this.result(rows[0] ?? null, null, rowCount);
      }
      return this.result(rows, null, rowCount);
    } catch (error) {
      const pgError = error as { message?: string; code?: string };
      return this.result(null, {
        message: pgError.message ?? "Database operation failed",
        ...(pgError.code ? { code: pgError.code } : {}),
      });
    }
  }

  then<TResult1 = DbResult<T>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function createDatabaseClient() {
  return {
    from<Table extends string>(table: Table): TableQuery<RowFor<Table>[]> {
      return new TableQuery(table) as unknown as TableQuery<RowFor<Table>[]>;
    },
    async rpc(name: string, params: Record<string, unknown> = {}) {
      try {
        switch (name) {
          case "database_size_bytes": {
            const result = await query<{ size: string }>("SELECT pg_database_size(current_database())::text AS size");
            return { data: Number(result.rows[0]?.size ?? 0), error: null };
          }
          case "auth_email_for_username": {
            const username = String(params.p_username ?? "");
            const result = await query<{ email: string }>(
              "SELECT COALESCE(contact_email, lower(username) || '@staff.ksl.internal') AS email FROM admin_profiles WHERE username = $1 AND is_active AND deleted_at IS NULL",
              [username],
            );
            return { data: result.rows[0]?.email ?? null, error: null };
          }
          case "storage_usage": {
            const result = await query<{ bucket_id: string; bytes: string }>(
              "SELECT bucket_id, COALESCE(sum(size_bytes), 0)::text AS bytes FROM stored_files GROUP BY bucket_id ORDER BY bucket_id",
            );
            return { data: result.rows, error: null };
          }
          case "storage_objects": {
            const result = await query(
              "SELECT bucket_id, name, size_bytes AS bytes, content_type, created_at FROM stored_files ORDER BY created_at DESC",
            );
            return { data: result.rows, error: null };
          }
          default:
            throw new Error(`Unsupported database function: ${name}`);
        }
      } catch (error) {
        const pgError = error as { message?: string; code?: string };
        return { data: null, error: { message: pgError.message ?? "Database operation failed", code: pgError.code } };
      }
    },
  };
}
