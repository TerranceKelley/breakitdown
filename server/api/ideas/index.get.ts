import { getByUserId } from '~/server/utils/ideaStore'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated',
      message: 'Log in or set DEV_USER for local dev.'
    })
  }
  return getByUserId(user.id)
})
