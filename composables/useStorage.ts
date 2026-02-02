import { openDB, type IDBPDatabase } from 'idb'
import type { Idea } from '~/types'

const DB_NAME = 'breakitdown-db'
const DB_VERSION = 2 // Increment version to trigger migration
const STORE_NAME = 'ideas'
const OLD_STORE_NAME = 'projects' // Old store name for migration

let db: IDBPDatabase | null = null

const getDB = async (): Promise<IDBPDatabase> => {
  if (db) return db

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      // Create new 'ideas' store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
      
      // If migrating from version 1, migrate data from 'projects' to 'ideas'
      if (oldVersion === 1 && database.objectStoreNames.contains(OLD_STORE_NAME)) {
        // Keep both stores temporarily - we'll migrate data in getAllIdeas
        // Don't delete old store yet to preserve data
      }
    }
  })

  // Migrate any remaining data from the legacy 'projects' store if it still exists
  await migrateOldProjectsStore(db)

  return db
}

/** When user is present, use server API; otherwise IndexedDB. */
function useStorageBackend() {
  const { user } = useUser()
  return {
    async getAllIdeasFromBackend(): Promise<Idea[]> {
      if (user.value) {
        return $fetch<Idea[]>('/api/ideas')
      }
      const database = await getDB()
      const result = await database.getAll(STORE_NAME)
      return result
    },
    async getIdeaFromBackend(id: string): Promise<Idea | undefined> {
      if (user.value) {
        try {
          return await $fetch<Idea>(`/api/ideas/${id}`)
        } catch {
          return undefined
        }
      }
      const database = await getDB()
      return database.get(STORE_NAME, id)
    },
    async saveIdeaToBackend(idea: Idea): Promise<void> {
      if (user.value) {
        await $fetch('/api/ideas', {
          method: 'POST',
          body: {
            ...idea,
            concepts: JSON.parse(JSON.stringify(idea.concepts)),
            tokenUsage: idea.tokenUsage ? JSON.parse(JSON.stringify(idea.tokenUsage)) : []
          }
        })
        return
      }
      const database = await getDB()
      const ideaCopy: Idea = {
        id: idea.id,
        name: idea.name,
        rootIdea: idea.rootIdea,
        concepts: JSON.parse(JSON.stringify(idea.concepts)),
        createdAt: idea.createdAt,
        updatedAt: Date.now(),
        tokenUsage: idea.tokenUsage ? JSON.parse(JSON.stringify(idea.tokenUsage)) : []
      }
      await database.put(STORE_NAME, ideaCopy)
    },
    async deleteIdeaFromBackend(id: string): Promise<void> {
      if (user.value) {
        await $fetch(`/api/ideas/${id}`, { method: 'DELETE' })
        return
      }
      const database = await getDB()
      const tx = database.transaction(STORE_NAME, 'readwrite')
      await tx.objectStore(STORE_NAME).delete(id)
      await tx.done
    }
  }
}

// Force a fresh database connection (useful for debugging)
const resetDB = () => {
  db = null
}

// Copy data from the legacy 'projects' store into the current 'ideas' store, then clear the old store
const migrateOldProjectsStore = async (database: IDBPDatabase) => {
  if (!database.objectStoreNames.contains(OLD_STORE_NAME)) {
    return
  }

  const legacyTx = database.transaction(OLD_STORE_NAME, 'readonly')
  const legacyStore = legacyTx.objectStore(OLD_STORE_NAME)
  const legacyIdeas = await legacyStore.getAll()
  await legacyTx.done

  if (!legacyIdeas || legacyIdeas.length === 0) {
    return
  }

  const ideasTx = database.transaction(STORE_NAME, 'readwrite')
  const ideasStore = ideasTx.objectStore(STORE_NAME)
  const existingIdeas = await ideasStore.getAll()
  const existingIds = new Set(existingIdeas.map((idea: any) => idea.id))

  for (const legacyIdea of legacyIdeas as any[]) {
    if (legacyIdea && !existingIds.has(legacyIdea.id)) {
      const migratedIdea: Idea = {
        id: legacyIdea.id || crypto.randomUUID(),
        name: legacyIdea.name || 'Untitled Idea',
        rootIdea: legacyIdea.rootIdea || '',
        concepts: legacyIdea.concepts || [],
        createdAt: legacyIdea.createdAt || Date.now(),
        updatedAt: Date.now(),
        tokenUsage: legacyIdea.tokenUsage || []
      }
      await ideasStore.put(migratedIdea)
    }
  }

  await ideasTx.done

  // Clear the old store so we don't repeatedly attempt migration
  const clearTx = database.transaction(OLD_STORE_NAME, 'readwrite')
  await clearTx.objectStore(OLD_STORE_NAME).clear()
  await clearTx.done
}

export const useStorage = () => {
  const backend = useStorageBackend()

  const saveIdea = async (idea: Idea): Promise<void> => {
    await backend.saveIdeaToBackend(idea)
  }

  const getIdea = async (id: string): Promise<Idea | undefined> => {
    return backend.getIdeaFromBackend(id)
  }

  const getAllIdeas = async (): Promise<Idea[]> => {
    return backend.getAllIdeasFromBackend()
  }

  const deleteIdea = async (id: string): Promise<void> => {
    await backend.deleteIdeaFromBackend(id)
  }

  const exportIdea = (idea: Idea): string => {
    return JSON.stringify(idea, null, 2)
  }

  const importIdea = (json: string): Idea => {
    const idea = JSON.parse(json) as Idea
    // Validate and ensure required fields
    if (!idea.id) {
      idea.id = crypto.randomUUID()
    }
    if (!idea.createdAt) {
      idea.createdAt = Date.now()
    }
    idea.updatedAt = Date.now()
    return idea
  }

  return {
    saveIdea,
    getIdea,
    getAllIdeas,
    deleteIdea,
    exportIdea,
    importIdea
  }
}
