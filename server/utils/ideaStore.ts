import { dbIdeaStore } from '~/server/utils/ideaStoreDb'

export const getByUserId = dbIdeaStore.getByUserId
export const getById = dbIdeaStore.getById
export const save = dbIdeaStore.save
export const remove = dbIdeaStore.remove
