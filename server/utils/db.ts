import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null
let initPromise: Promise<void> | null = null

export function isDbEnabled(): boolean {
  return !!process.env.DATABASE_URL
}

export function getPool(): pg.Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    })
  }
  return pool
}

export async function query<T = any>(text: string, values?: any[]): Promise<pg.QueryResult<T>> {
  const p = getPool()
  return p.query<T>(text, values)
}

export async function initDb(): Promise<void> {
  if (!isDbEnabled()) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS user_entitlements (
        user_id TEXT PRIMARY KEY,
        trial_started_at BIGINT NOT NULL,
        trial_ends_at BIGINT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        status TEXT NOT NULL DEFAULT 'trial',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS ideas (
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        root_idea TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'generic',
        concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
        token_usage JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, id)
      );
    `)

    await query(`CREATE INDEX IF NOT EXISTS ideas_user_id_idx ON ideas(user_id);`)
    await query(`CREATE INDEX IF NOT EXISTS ideas_updated_at_idx ON ideas(updated_at);`)
  })()

  return initPromise
}

