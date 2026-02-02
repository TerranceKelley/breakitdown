import { getById } from '~/server/utils/ideaStore'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated',
      message: 'Log in or set DEV_USER for local dev.'
    })
  }
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing idea id' })
  }
  const idea = await getById(user.id, id)
  if (!idea) {
    throw createError({ statusCode: 404, message: 'Idea not found' })
  }
  return idea
})
