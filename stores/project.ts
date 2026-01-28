import { defineStore } from 'pinia'
import type { Idea, Concept } from '~/types'
import { useStorage } from '~/composables/useStorage'
import { useAI } from '~/composables/useAI'

export const useIdeaStore = defineStore('idea', () => {
  const storage = useStorage()
  const ai = useAI()

  const currentIdea = ref<Idea | null>(null)
  const ideas = ref<Idea[]>([])
  let saveQueue: Promise<void> = Promise.resolve()

  const enqueueSave = (task: () => Promise<void>) => {
    saveQueue = saveQueue.then(task).catch(error => {
      console.error('[DEBUG] Save queue error:', error)
      throw error
    })
    return saveQueue
  }

  const createIdea = (name: string, rootIdea: string): Idea => {
    const idea: Idea = {
      id: crypto.randomUUID(),
      name,
      rootIdea,
      concepts: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tokenUsage: []
    }
    currentIdea.value = idea
    return idea
  }

  const loadIdea = async (id: string) => {
    const idea = await storage.getIdea(id)
    if (idea) {
      currentIdea.value = idea
    }
    return idea
  }

  const saveCurrentIdea = async () => enqueueSave(async () => {
    if (currentIdea.value) {
      // Verify data integrity before saving
      const allConcepts = getAllConcepts()
      const conceptsWithParentId = allConcepts.filter(c => c.parentId)
      const rootConceptsWithParent = currentIdea.value.concepts.filter(c => c.parentId)
      
      if (rootConceptsWithParent.length > 0) {
        console.error(`[DEBUG] ERROR: Found ${rootConceptsWithParent.length} concepts in root array that have a parentId!`)
        console.error(`[DEBUG] These should not be at root level:`, rootConceptsWithParent.map(c => ({ title: c.title, parentId: c.parentId })))
        // Remove them from root - they should be in their parent's children
        rootConceptsWithParent.forEach(concept => {
          const rootIndex = currentIdea.value!.concepts.findIndex(c => c.id === concept.id)
          if (rootIndex !== -1) {
            console.log(`[DEBUG] Removing "${concept.title}" from root level (it has parentId: ${concept.parentId})`)
            currentIdea.value!.concepts.splice(rootIndex, 1)
          }
        })
      }
      
      await storage.saveIdea(currentIdea.value)
      await loadIdeas()
    }
  })

  const loadIdeas = async () => {
    console.log('[DEBUG] loadIdeas: Loading ideas from storage')
    const loadedIdeas = await storage.getAllIdeas()
    console.log('[DEBUG] loadIdeas: Received', loadedIdeas.length, 'ideas')
    console.log('[DEBUG] loadIdeas: Idea IDs:', loadedIdeas.map(i => ({ id: i.id, name: i.name })))
    ideas.value = loadedIdeas
    console.log('[DEBUG] loadIdeas: Updated ideas.value, now has', ideas.value.length, 'ideas')
  }

  const deleteIdea = async (id: string) => {
    console.log('[DEBUG] deleteIdea called with id:', id)
    console.log('[DEBUG] Current ideas before delete:', ideas.value.map(i => ({ id: i.id, name: i.name })))
    
    try {
      await storage.deleteIdea(id)
      console.log('[DEBUG] Storage delete successful')
      
      if (currentIdea.value?.id === id) {
        console.log('[DEBUG] Clearing current idea')
        currentIdea.value = null
      }
      
      // Small delay to ensure IndexedDB transaction is fully committed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await loadIdeas()
      console.log('[DEBUG] Ideas after delete:', ideas.value.map(i => ({ id: i.id, name: i.name })))
      
      // Force reactivity update
      ideas.value = [...ideas.value]
    } catch (error) {
      console.error('[DEBUG] Error in deleteIdea:', error)
      throw error
    }
  }

  const addConcept = async (concept: Omit<Concept, 'id' | 'children' | 'createdAt' | 'updatedAt'>, parentId?: string, parentConcept?: Concept) => {
    if (!currentIdea.value) return

    console.log(`[DEBUG] addConcept called with parentId: ${parentId || 'undefined (will add to root)'}`)
    console.log(`[DEBUG] parentConcept provided: ${parentConcept ? `Yes - "${parentConcept.title}"` : 'No'}`)

    const newConcept: Concept = {
      id: crypto.randomUUID(),
      ...concept,
      children: [],
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    if (parentId) {
      // Always re-find the parent from the tree to ensure we have the correct reference
      // This is critical because Vue reactivity might have updated the structure
      const parent = findConceptById(currentIdea.value.concepts, parentId)
      
      if (!parent) {
        console.error(`[DEBUG] ERROR: Parent concept with id ${parentId} not found when adding "${newConcept.title}"`)
        console.error(`[DEBUG] Available concepts:`, getAllConcepts().map(c => ({ id: c.id, title: c.title, parentId: c.parentId })))
        throw new Error(`Parent concept ${parentId} not found`)
      }
      
      // Verify parentConcept matches if provided
      if (parentConcept && parent !== parentConcept) {
        console.warn(`[DEBUG] WARNING: Provided parentConcept differs from found parent. Using found parent.`)
      }
      
      const parentDepth = getConceptDepth(parentId)
      console.log(`[DEBUG] Adding concept "${newConcept.title}" to parent "${parent.title}" (ID: ${parentId}, depth: ${parentDepth})`)
      console.log(`[DEBUG] Parent concept object:`, parent)
      console.log(`[DEBUG] Parent children array reference:`, parent.children)
      console.log(`[DEBUG] Parent had ${parent.children.length} children before`)
      console.log(`[DEBUG] New concept parentId will be: ${parentId}`)
      
      // CRITICAL CHECK: Verify parent.children is not pointing to root concepts array
      if (parent.children === currentIdea.value.concepts) {
        console.error(`[DEBUG] CRITICAL ERROR: parent.children is pointing to root concepts array!`)
        console.error(`[DEBUG] This would cause concepts to be added to root instead of parent`)
        // Fix it by creating a new children array
        parent.children = [...(parent.children || [])]
        console.log(`[DEBUG] Fixed: Created new children array for parent`)
      }
      
      // Add to parent's children array
        parent.children.push(newConcept)
      
      console.log(`[DEBUG] Successfully added. Parent now has ${parent.children.length} children`)
      console.log(`[DEBUG] New concept parentId is: ${newConcept.parentId}`)
      console.log(`[DEBUG] Verify: Last child in parent.children has parentId: ${parent.children[parent.children.length - 1].parentId}`)
      console.log(`[DEBUG] Verify: Last child title: "${parent.children[parent.children.length - 1].title}"`)
      
      // Verify the parent is correct
      if (newConcept.parentId !== parentId) {
        console.error(`[DEBUG] ERROR: parentId mismatch! Expected ${parentId}, got ${newConcept.parentId}`)
      }
      
      // Verify it's actually in the parent's children
      const isInParent = parent.children.some(child => child.id === newConcept.id)
      if (!isInParent) {
        console.error(`[DEBUG] ERROR: Concept was not added to parent's children array!`)
      }
      
      // CRITICAL: Ensure the concept is NOT in the root concepts array
      const isInRoot = currentIdea.value.concepts.some(c => c.id === newConcept.id)
      if (isInRoot) {
        console.error(`[DEBUG] ERROR: Concept "${newConcept.title}" with parentId ${parentId} is ALSO in root concepts array!`)
        console.error(`[DEBUG] This is a bug - removing from root`)
        const rootIndex = currentIdea.value.concepts.findIndex(c => c.id === newConcept.id)
        if (rootIndex !== -1) {
          currentIdea.value.concepts.splice(rootIndex, 1)
          console.log(`[DEBUG] Removed concept from root level`)
        }
      }
      
      // Verify parent.children is still separate from root
      if (parent.children === currentIdea.value.concepts) {
        console.error(`[DEBUG] CRITICAL ERROR: After push, parent.children still points to root concepts!`)
      }
    } else {
      // Add to root level
      console.log(`[DEBUG] No parentId provided, adding "${newConcept.title}" to root level`)
      // Ensure root concepts don't have a parentId
      if (newConcept.parentId) {
        console.error(`[DEBUG] ERROR: Trying to add concept with parentId ${newConcept.parentId} to root level!`)
        newConcept.parentId = undefined
      }
      currentIdea.value.concepts.push(newConcept)
    }

    await saveCurrentIdea()
  }

  const updateConcept = async (id: string, updates: Partial<Concept>) => {
    if (!currentIdea.value) {
      console.error('[DEBUG] updateConcept: No current idea')
      return
    }

    const concept = findConceptById(currentIdea.value.concepts, id)
    if (!concept) {
      console.error('[DEBUG] updateConcept: Concept not found:', id)
      return
    }
    
    console.log('[DEBUG] updateConcept: Updating concept', id)
    console.log('[DEBUG] updateConcept: Current concept:', { title: concept.title, description: concept.description })
    console.log('[DEBUG] updateConcept: Updates to apply:', updates)
    
    // Update properties individually to ensure Vue reactivity
    if (updates.title !== undefined) {
      concept.title = updates.title
    }
    if (updates.description !== undefined) {
      concept.description = updates.description
    }
    if (updates.completed !== undefined) {
      concept.completed = updates.completed
    }
    concept.updatedAt = Date.now()
    
    console.log('[DEBUG] updateConcept: After update:', { title: concept.title, description: concept.description })
    
    try {
      await saveCurrentIdea()
      console.log('[DEBUG] updateConcept: Successfully saved')
      
      // Verify the update persisted
      const verifyConcept = findConceptById(currentIdea.value.concepts, id)
      if (verifyConcept) {
        console.log('[DEBUG] updateConcept: Verified after save:', { title: verifyConcept.title, description: verifyConcept.description })
      }
    } catch (error) {
      console.error('[DEBUG] updateConcept: Error saving:', error)
      throw error
    }
  }

  const deleteConcept = async (id: string) => {
    if (!currentIdea.value) return

    const removeFromArray = (concepts: Concept[]): boolean => {
      for (let i = 0; i < concepts.length; i++) {
        if (concepts[i].id === id) {
          concepts.splice(i, 1)
          return true
        }
        if (removeFromArray(concepts[i].children)) {
          return true
        }
      }
      return false
    }

    removeFromArray(currentIdea.value.concepts)
    await saveCurrentIdea()
  }

  const findConceptById = (concepts: Concept[], id: string): Concept | null => {
    for (const concept of concepts) {
      if (concept.id === id) {
        return concept
      }
      // Recursively search in children
      const found = findConceptById(concept.children, id)
      if (found) {
        return found
      }
    }
    return null
  }

  // Helper function to get the parent chain (breadcrumb) for a concept
  // Returns array from root to immediate parent (excludes the concept itself)
  const getParentChain = (conceptId: string): Concept[] => {
    const chain: Concept[] = []
    const concept = findConceptById(currentIdea.value?.concepts || [], conceptId)
    if (!concept) return chain
    
    // Start from the concept's parent and walk up to root
    let currentId: string | undefined = concept.parentId
    
    while (currentId) {
      const parentConcept = findConceptById(currentIdea.value?.concepts || [], currentId)
      if (!parentConcept) break
      
      chain.unshift(parentConcept) // Add to beginning to maintain order from root to parent
      currentId = parentConcept.parentId
    }
    
    return chain
  }

  // Track ongoing breakdowns to prevent duplicates - use a Map to track promises
  const breakdownInProgress = new Map<string, Promise<void>>()

  const breakDownConcept = async (conceptId: string) => {
    if (!currentIdea.value) return

    // Prevent duplicate breakdowns - if one is already in progress, return that promise
    if (breakdownInProgress.has(conceptId)) {
      console.warn(`[DEBUG] Breakdown already in progress for concept ${conceptId}, returning existing promise`)
      return breakdownInProgress.get(conceptId)
    }

    // Create the breakdown promise and store it immediately
    const breakdownPromise = (async () => {

      console.log(`[DEBUG] breakDownConcept called with conceptId: ${conceptId}`)
      console.log(`[DEBUG] Current idea concepts count: ${currentIdea.value.concepts.length}`)

      // Find the concept to break down (searches recursively through all levels)
      const concept = findConceptById(currentIdea.value.concepts, conceptId)
      if (!concept) {
        console.error(`[DEBUG] Concept with id ${conceptId} not found`)
        console.log(`[DEBUG] Available concept IDs:`, getAllConcepts().map(c => ({ id: c.id, title: c.title, parentId: c.parentId })))
        return
      }

      // Verify we found the right concept
      const depth = getConceptDepth(conceptId)
      console.log(`[DEBUG] Found concept: "${concept.title}" (ID: ${conceptId})`)
      console.log(`[DEBUG] Concept depth: ${depth}`)
      console.log(`[DEBUG] Concept has ${concept.children.length} existing children`)
      console.log(`[DEBUG] Concept parentId: ${concept.parentId || 'none (root level)'}`)

      // Build structured context for the breakdown
      const parentChain = getParentChain(conceptId)
      
      const breakdownRequest = {
        concept: {
          title: concept.title,
          description: concept.description
        },
        context: {
          ideaName: currentIdea.value.name,
          rootIdea: currentIdea.value.rootIdea,
          parentChain: parentChain.length > 0 ? parentChain.map(c => ({
            title: c.title,
            description: c.description
          })) : undefined,
          depth: depth
        }
      }
      
      console.log(`[DEBUG] Breakdown request (JSON format):`, JSON.stringify(breakdownRequest, null, 2))
      const response = await ai.breakDownIdea(breakdownRequest)
    if (response) {
        // Track token usage
        if (response.usage && currentIdea.value) {
          if (!currentIdea.value.tokenUsage) {
            currentIdea.value.tokenUsage = []
          }
          currentIdea.value.tokenUsage.push(response.usage)
        }
        
        console.log(`[DEBUG] AI returned ${response.concepts.length} new concepts`)
        console.log(`[DEBUG] Concept object reference:`, concept)
        console.log(`[DEBUG] Concept children array reference:`, concept.children)
        console.log(`[DEBUG] Concept children count before adding: ${concept.children.length}`)
        
        // Verify the concept is still in the tree structure
        const verifyConcept = findConceptById(currentIdea.value.concepts, conceptId)
        if (verifyConcept !== concept) {
          console.error(`[DEBUG] WARNING: Concept reference mismatch! Found concept differs from original`)
        }
        
        // Re-find the concept to ensure we have the latest reference from the tree
        // This is important because Vue reactivity might have updated the structure
        const currentConcept = findConceptById(currentIdea.value.concepts, conceptId)
        if (!currentConcept) {
          console.error(`[DEBUG] ERROR: Concept ${conceptId} not found when trying to add children`)
          return
        }
        
        console.log(`[DEBUG] Current concept reference check:`)
        console.log(`[DEBUG]   Original concept ID: ${concept.id}, Title: "${concept.title}"`)
        console.log(`[DEBUG]   Found concept ID: ${currentConcept.id}, Title: "${currentConcept.title}"`)
        console.log(`[DEBUG]   Same reference? ${concept === currentConcept}`)
        console.log(`[DEBUG]   Original children count: ${concept.children.length}`)
        console.log(`[DEBUG]   Found children count: ${currentConcept.children.length}`)
        
        if (currentConcept !== concept) {
          console.warn(`[DEBUG] WARNING: Concept reference changed, using fresh reference`)
        }
        
        // Add each new concept as a child of the concept being broken down
        // Always re-find the parent to ensure we have the correct reference
        for (const [index, c] of response.concepts.entries()) {
          console.log(`[DEBUG] Adding concept ${index + 1}/${response.concepts.length}: "${c.title}" to parent "${currentConcept.title}" (ID: ${conceptId})`)
          console.log(`[DEBUG] Parent concept children before: ${currentConcept.children.length}`)
          
          // Re-find parent for each addition to ensure fresh reference
          const freshParent = findConceptById(currentIdea.value.concepts, conceptId)
          if (!freshParent) {
            console.error(`[DEBUG] ERROR: Could not find parent ${conceptId} for concept "${c.title}"`)
            return
          }
          
          // Verify we're adding to the right parent
          if (freshParent.id !== conceptId) {
            console.error(`[DEBUG] ERROR: Found parent has wrong ID! Expected ${conceptId}, got ${freshParent.id}`)
            return
          }
          
          console.log(`[DEBUG] Verified parent: "${freshParent.title}" (ID: ${freshParent.id})`)
          console.log(`[DEBUG] Parent's children array before push:`, freshParent.children.map(ch => ch.title))
          
          await addConcept(c, conceptId, freshParent)
          
          console.log(`[DEBUG] Parent concept children after: ${freshParent.children.length}`)
          console.log(`[DEBUG] Parent's children array after push:`, freshParent.children.map(ch => ch.title))
          
          // Verify it was added correctly by checking the actual parent's children
          const verifyParent = findConceptById(currentIdea.value.concepts, conceptId)
          const addedConcept = verifyParent?.children.find(child => child.title === c.title)
          if (!addedConcept) {
            console.error(`[DEBUG] ERROR: Concept "${c.title}" was not found in parent "${verifyParent?.title}" children`)
            console.error(`[DEBUG] Parent children:`, verifyParent?.children.map(ch => ({ title: ch.title, parentId: ch.parentId })))
          } else {
            console.log(`[DEBUG] Verified: Concept "${c.title}" added with parentId: ${addedConcept.parentId}`)
            if (addedConcept.parentId !== conceptId) {
              console.error(`[DEBUG] ERROR: parentId mismatch! Expected ${conceptId}, got ${addedConcept.parentId}`)
            }
          }
        }
        
        // Final verification
        const finalConcept = findConceptById(currentIdea.value.concepts, conceptId)
        console.log(`[DEBUG] Final verification:`)
        console.log(`[DEBUG]   Concept "${finalConcept?.title}" now has ${finalConcept?.children.length} children`)
        console.log(`[DEBUG]   Children:`, finalConcept?.children.map(c => ({ title: c.title, parentId: c.parentId, id: c.id })))
        
        // Verify none of the children ended up at root level
        const rootConcepts = currentIdea.value.concepts.filter(c => !c.parentId)
        const misplacedConcepts = rootConcepts.filter(c => response.concepts.some(rc => rc.title === c.title))
        if (misplacedConcepts.length > 0) {
          console.error(`[DEBUG] ERROR: Found ${misplacedConcepts.length} concepts at root level that should be children!`)
          console.error(`[DEBUG] Misplaced:`, misplacedConcepts.map(c => c.title))
        }
      } else {
        console.error(`[DEBUG] No response from AI`)
      }
    })()

    // Store the promise immediately
    breakdownInProgress.set(conceptId, breakdownPromise)

    // Clean up after completion
    breakdownPromise.finally(() => {
      setTimeout(() => {
        breakdownInProgress.delete(conceptId)
      }, 500)
    })

    return breakdownPromise
  }

  // Helper function to get the depth of a concept in the tree
  const getConceptDepth = (conceptId: string, concepts: Concept[] = currentIdea.value?.concepts || [], currentDepth: number = 0): number => {
    for (const concept of concepts) {
      if (concept.id === conceptId) {
        return currentDepth
      }
      const found = getConceptDepth(conceptId, concept.children, currentDepth + 1)
      if (found !== -1) {
        return found
      }
    }
    return -1
  }

  const breakDownIdea = async (idea: string) => {
    if (!currentIdea.value) return

    // Use structured format with idea context
    const breakdownRequest = {
      concept: {
        title: idea,
        description: idea
      },
      context: {
        ideaName: currentIdea.value.name,
        rootIdea: currentIdea.value.rootIdea,
        depth: 0
      }
    }

    const response = await ai.breakDownIdea(breakdownRequest)
    if (response) {
      // Track token usage
      if (response.usage && currentIdea.value) {
        if (!currentIdea.value.tokenUsage) {
          currentIdea.value.tokenUsage = []
        }
        currentIdea.value.tokenUsage.push(response.usage)
      }
      
      for (const c of response.concepts) {
        await addConcept(c)
      }
    }
  }

  const getAllConcepts = (): Concept[] => {
    if (!currentIdea.value) return []

    const flatten = (concepts: Concept[]): Concept[] => {
      const result: Concept[] = []
      concepts.forEach(c => {
        result.push(c)
        result.push(...flatten(c.children))
      })
      return result
    }

    return flatten(currentIdea.value.concepts)
  }

  const isIdeaComplete = (): boolean => {
    if (!currentIdea.value) return false
    const allConcepts = getAllConcepts()
    return allConcepts.length > 0 && allConcepts.every(c => c.completed)
  }

  const getIncompleteConcepts = (): Concept[] => {
    if (!currentIdea.value) return []
    const allConcepts = getAllConcepts()
    return allConcepts.filter(c => !c.completed)
  }

  const resetIdea = () => {
    currentIdea.value = null
  }

  return {
    currentIdea,
    ideas,
    createIdea,
    loadIdea,
    saveCurrentIdea,
    loadIdeas,
    deleteIdea,
    addConcept,
    updateConcept,
    deleteConcept,
    breakDownConcept,
    breakDownIdea,
    getAllConcepts,
    isIdeaComplete,
    getIncompleteConcepts,
    resetIdea,
    findConceptById: (concepts: Concept[], id: string) => findConceptById(concepts, id),
    getConceptDepth: (conceptId: string) => getConceptDepth(conceptId),
    getParentChain: (conceptId: string) => getParentChain(conceptId)
  }
})
