import { initDb, isDbEnabled, query } from '~/server/utils/db'

export interface Entitlements {
  userId: string
  trialStartedAt: number
  trialEndsAt: number
  status: 'trial' | 'active' | 'expired'
  plan: string
}

function getTrialDays(): number {
  const raw = process.env.TRIAL_DAYS
  const parsed = raw ? Number(raw) : 14
  if (!Number.isFinite(parsed) || parsed <= 0) return 14
  return Math.floor(parsed)
}

export async function getOrCreateEntitlements(userId: string): Promise<Entitlements> {
  if (!isDbEnabled()) {
    const now = Date.now()
    return {
      userId,
      trialStartedAt: now,
      trialEndsAt: now + 1000 * 60 * 60 * 24 * 365 * 100,
      status: 'active',
      plan: 'no-db'
    }
  }

  await initDb()
  const now = Date.now()

  const existing = await query<{
    user_id: string
    trial_started_at: string
    trial_ends_at: string
    plan: string
    status: string
  }>(
    `SELECT user_id, trial_started_at, trial_ends_at, plan, status FROM user_entitlements WHERE user_id = $1`,
    [userId]
  )

  if (existing.rowCount && existing.rows[0]) {
    const row = existing.rows[0]
    const trialStartedAt = Number(row.trial_started_at)
    const trialEndsAt = Number(row.trial_ends_at)
    const status = now <= trialEndsAt ? (row.status as any) : 'expired'
    return {
      userId: row.user_id,
      trialStartedAt,
      trialEndsAt,
      status,
      plan: row.plan || 'free'
    }
  }

  const trialDays = getTrialDays()
  const trialStartedAt = now
  const trialEndsAt = now + trialDays * 24 * 60 * 60 * 1000

  await query(
    `INSERT INTO user_entitlements (user_id, trial_started_at, trial_ends_at, plan, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'free', 'trial', $4, $4)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, trialStartedAt, trialEndsAt, now]
  )

  return {
    userId,
    trialStartedAt,
    trialEndsAt,
    status: 'trial',
    plan: 'free'
  }
}

export async function requireAiAccess(event: any): Promise<Entitlements> {
  // In mock mode, allow anonymous AI calls for demos/tests.
  if (process.env.USE_MOCK_LLM === 'true') {
    const now = Date.now()
    return {
      userId: 'mock',
      trialStartedAt: now,
      trialEndsAt: now + 1000 * 60 * 60 * 24 * 365 * 100,
      status: 'active',
      plan: 'mock'
    }
  }

  // If no DB is configured, we don't enforce trials/plans (local/dev mode).
  if (!isDbEnabled()) {
    const user = event.context.user
    const now = Date.now()
    return {
      userId: user?.id || 'anon',
      trialStartedAt: now,
      trialEndsAt: now + 1000 * 60 * 60 * 24 * 365 * 100,
      status: 'active',
      plan: 'no-db'
    }
  }

  const allowAnonAi = process.env.ALLOW_ANON_AI !== 'false'
  const user = event.context.user
  if (!user) {
    if (allowAnonAi) {
      const now = Date.now()
      return {
        userId: 'anon',
        trialStartedAt: now,
        trialEndsAt: now + 1000 * 60 * 60 * 24 * 365 * 100,
        status: 'active',
        plan: 'anon'
      }
    }
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated',
      message: 'Log in to use AI features.'
    })
  }

  const entitlements = await getOrCreateEntitlements(user.id)
  const now = Date.now()
  const isTrialValid = now <= entitlements.trialEndsAt
  const isPaid = entitlements.status === 'active' && entitlements.plan !== 'free'

  if (!isTrialValid && !isPaid) {
    throw createError({
      statusCode: 402,
      statusMessage: 'Trial expired',
      message: 'Your trial has expired. Upgrade to continue using AI features.'
    })
  }

  return entitlements
}
