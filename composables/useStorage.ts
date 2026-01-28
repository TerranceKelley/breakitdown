import { openDB, type IDBPDatabase } from 'idb'
import type { Idea, Concept } from '~/types'

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
  const saveIdea = async (idea: Idea): Promise<void> => {
    const database = await getDB()
    // Create a plain object copy to avoid Vue reactive proxy issues with IndexedDB
    const ideaCopy: Idea = {
      id: idea.id,
      name: idea.name,
      rootIdea: idea.rootIdea,
      concepts: JSON.parse(JSON.stringify(idea.concepts)), // Deep clone to remove reactivity
      createdAt: idea.createdAt,
      updatedAt: Date.now(),
      tokenUsage: idea.tokenUsage ? JSON.parse(JSON.stringify(idea.tokenUsage)) : []
    }
    await database.put(STORE_NAME, ideaCopy)
  }

  const getIdea = async (id: string): Promise<Idea | undefined> => {
    const database = await getDB()
    return database.get(STORE_NAME, id)
  }

  const getAllIdeas = async (): Promise<Idea[]> => {
    const database = await getDB()
    console.log('[DEBUG] Storage getAllIdeas: Fetching all ideas')
    
    // Always return from the new 'ideas' store, not the old 'projects' store
    // Migration should have already happened, so we only read from 'ideas'
    const result = await database.getAll(STORE_NAME)
    console.log('[DEBUG] Storage getAllIdeas: Returning', result.length, 'ideas from', STORE_NAME)
    console.log('[DEBUG] Storage getAllIdeas: Idea IDs:', result.map(i => ({ id: i.id, name: i.name })))
    return result
  }

  const deleteIdea = async (id: string): Promise<void> => {
    const database = await getDB()
    console.log('[DEBUG] Storage deleteIdea: Deleting id', id)
    console.log('[DEBUG] Storage deleteIdea: Store name:', STORE_NAME)
    
    // Check what's in the store before delete
    const beforeDelete = await database.getAll(STORE_NAME)
    console.log('[DEBUG] Storage deleteIdea: Ideas before delete:', beforeDelete.map(i => ({ id: i.id, name: i.name })))
    
    // Perform the delete
    const tx = database.transaction(STORE_NAME, 'readwrite')
    const deleteResult = await tx.objectStore(STORE_NAME).delete(id)
    await tx.done
    console.log('[DEBUG] Storage deleteIdea: Delete transaction completed, result:', deleteResult)
    
    // Verify deletion immediately after
    const verify = await database.get(STORE_NAME, id)
    if (verify) {
      console.error('[DEBUG] Storage deleteIdea: WARNING - Idea still exists after delete!', verify)
    } else {
      console.log('[DEBUG] Storage deleteIdea: Verified - Idea successfully deleted')
    }
    
    // Check what's in the store after delete
    const afterDelete = await database.getAll(STORE_NAME)
    console.log('[DEBUG] Storage deleteIdea: Ideas after delete:', afterDelete.map(i => ({ id: i.id, name: i.name })))
    
    // Also check old store if it exists
    if (database.objectStoreNames.contains(OLD_STORE_NAME)) {
      const oldStoreData = await database.getAll(OLD_STORE_NAME)
      console.log('[DEBUG] Storage deleteIdea: Old store still has', oldStoreData.length, 'items')
    }
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
