import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | undefined;

function databasePool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const parsed = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  }

  const max = Number(process.env.DATABASE_POOL_MAX ?? "10");
  if (!Number.isInteger(max) || max < 1 || max > 50) {
    throw new Error("DATABASE_POOL_MAX must be an integer between 1 and 50");
  }
  const sslMode = process.env.DATABASE_SSL ?? "disable";
  if (sslMode !== "disable" && sslMode !== "verify-full") {
    throw new Error("DATABASE_SSL must be either disable or verify-full");
  }

  pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: "ksl-staff-portal",
    ssl: sslMode === "verify-full"
      ? { rejectUnauthorized: true }
      : undefined,
  });
  pool.on("error", (error: NodeJS.ErrnoException) => {
    console.error("Unexpected idle PostgreSQL client error", error.code ?? "unknown");
  });
  return pool;
}

export function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<QueryResult<Row>> {
  return databasePool().query<Row>(text, [...values]);
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await databasePool().connect();
  let started = false;
  try {
    await client.query("BEGIN");
    started = true;
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    if (started) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("PostgreSQL transaction rollback failed", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabasePool() {
  const current = pool;
  pool = undefined;
  if (current) await current.end();
}
