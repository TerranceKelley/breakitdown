import { remove } from '~/server/utils/ideaStore'

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
  const deleted = await remove(user.id, id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Idea not found' })
  }
  return { ok: true }
})
