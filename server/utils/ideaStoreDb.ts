import type { Idea } from '~/types'
import { initDb, isDbEnabled, query } from '~/server/utils/db'
import * as fileStore from '~/server/utils/ideaStoreFile'

function rowToIdea(row: any): Idea {
  return {
    id: String(row.id),
    name: String(row.name),
    rootIdea: String(row.root_idea),
    mode: (row.mode as any) || 'generic',
    concepts: row.concepts || [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    tokenUsage: row.token_usage || []
  }
}

async function maybeMigrateFromFileStore(userId: string): Promise<void> {
  const legacy = await fileStore.getByUserId(userId)
  if (!legacy || legacy.length === 0) return

  for (const idea of legacy) {
    await save(userId, idea)
  }
}

export async function getByUserId(userId: string): Promise<Idea[]> {
  if (!isDbEnabled()) return fileStore.getByUserId(userId)
  await initDb()

  const result = await query(
    `SELECT user_id, id, name, root_idea, mode, concepts, token_usage, created_at, updated_at
     FROM ideas
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  )

  if (result.rowCount === 0) {
    await maybeMigrateFromFileStore(userId)
    const retry = await query(
      `SELECT user_id, id, name, root_idea, mode, concepts, token_usage, created_at, updated_at
       FROM ideas
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    )
    return retry.rows.map(rowToIdea)
  }

  return result.rows.map(rowToIdea)
}

export async function getById(userId: string, ideaId: string): Promise<Idea | undefined> {
  if (!isDbEnabled()) return fileStore.getById(userId, ideaId)
  await initDb()

  const result = await query(
    `SELECT user_id, id, name, root_idea, mode, concepts, token_usage, created_at, updated_at
     FROM ideas
     WHERE user_id = $1 AND id = $2`,
    [userId, ideaId]
  )
  const row = result.rows[0]
  return row ? rowToIdea(row) : undefined
}

export async function save(userId: string, idea: Idea): Promise<void> {
  if (!isDbEnabled()) return fileStore.save(userId, idea)
  await initDb()

  const now = Date.now()
  await query(
    `INSERT INTO ideas (user_id, id, name, root_idea, mode, concepts, token_usage, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
     ON CONFLICT (user_id, id)
     DO UPDATE SET
       name = EXCLUDED.name,
       root_idea = EXCLUDED.root_idea,
       mode = EXCLUDED.mode,
       concepts = EXCLUDED.concepts,
       token_usage = EXCLUDED.token_usage,
       updated_at = EXCLUDED.updated_at`,
    [
      userId,
      idea.id,
      idea.name,
      idea.rootIdea ?? '',
      idea.mode ?? 'generic',
      JSON.stringify(idea.concepts ?? []),
      JSON.stringify(idea.tokenUsage ?? []),
      idea.createdAt ?? now,
      now
    ]
  )
}

export async function remove(userId: string, ideaId: string): Promise<boolean> {
  if (!isDbEnabled()) return fileStore.remove(userId, ideaId)
  await initDb()

  const result = await query(`DELETE FROM ideas WHERE user_id = $1 AND id = $2`, [userId, ideaId])
  return (result.rowCount || 0) > 0
}

