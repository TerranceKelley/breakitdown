import { save } from '~/server/utils/ideaStore'
import type { Idea } from '~/types'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated',
      message: 'Log in or set DEV_USER for local dev.'
    })
  }
  const body = await readBody<Idea>(event)
  if (!body?.id || !body.name || !Array.isArray(body.concepts)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid idea: id, name, and concepts required.'
    })
  }
  const idea: Idea = {
    id: body.id,
    name: body.name,
    rootIdea: body.rootIdea ?? '',
    concepts: body.concepts,
    createdAt: body.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    tokenUsage: body.tokenUsage ?? []
  }
  await save(user.id, idea)
  return idea
})
