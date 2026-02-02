import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Idea } from '~/types'

const DATA_DIR = join(process.cwd(), 'data', 'ideas')

async function getFilePath(userId: string): Promise<string> {
  await mkdir(DATA_DIR, { recursive: true })
  return join(DATA_DIR, `${userId}.json`)
}

export async function getByUserId(userId: string): Promise<Idea[]> {
  const filePath = await getFilePath(userId)
  try {
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch (_) {
    return []
  }
}

export async function getById(userId: string, ideaId: string): Promise<Idea | undefined> {
  const ideas = await getByUserId(userId)
  return ideas.find((i) => i.id === ideaId)
}

export async function save(userId: string, idea: Idea): Promise<void> {
  const ideas = await getByUserId(userId)
  const index = ideas.findIndex((i) => i.id === idea.id)
  const ideaCopy: Idea = {
    id: idea.id,
    name: idea.name,
    rootIdea: idea.rootIdea,
    concepts: JSON.parse(JSON.stringify(idea.concepts || [])),
    createdAt: idea.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    tokenUsage: idea.tokenUsage ? JSON.parse(JSON.stringify(idea.tokenUsage)) : []
  }
  if (index >= 0) {
    ideas[index] = ideaCopy
  } else {
    ideas.push(ideaCopy)
  }
  const filePath = await getFilePath(userId)
  await writeFile(filePath, JSON.stringify(ideas, null, 2), 'utf-8')
}

export async function remove(userId: string, ideaId: string): Promise<boolean> {
  const ideas = await getByUserId(userId)
  const filtered = ideas.filter((i) => i.id !== ideaId)
  if (filtered.length === ideas.length) return false
  const filePath = await getFilePath(userId)
  await writeFile(filePath, JSON.stringify(filtered, null, 2), 'utf-8')
  return true
}
