import {
  EXPERIMENTAL_PLAN_KEY,
  type PlanKey,
} from '@/modules/payments/plans'

export const EXPERIMENTAL_PLAN_DAYS = 5
export const ANNUAL_PLAN_DAYS = 365

const ACTIVE_STATUSES = new Set(['active', 'trialing'])

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function addDaysIso(from: Date, days: number) {
  const next = new Date(from)
  next.setDate(next.getDate() + days)
  return next.toISOString()
}

export function planAccessEndIso(planKey: PlanKey, from = new Date()) {
  return addDaysIso(
    from,
    planKey === EXPERIMENTAL_PLAN_KEY ? EXPERIMENTAL_PLAN_DAYS : ANNUAL_PLAN_DAYS
  )
}

export function isPeriodExpired(
  currentPeriodEnd: string | null | undefined,
  now = new Date()
) {
  const periodEnd = parseTime(currentPeriodEnd)
  if (periodEnd === null) return false
  return periodEnd <= now.getTime()
}

export function hasUsableSubscription(input: {
  status: string | null | undefined
  currentPeriodEnd: string | null | undefined
}) {
  return (
    ACTIVE_STATUSES.has(input.status ?? '') &&
    !isPeriodExpired(input.currentPeriodEnd)
  )
}

export function isExpiredExperimentalSubscription(input: {
  planKey: string | null | undefined
  status: string | null | undefined
  currentPeriodEnd: string | null | undefined
}) {
  return (
    input.planKey === EXPERIMENTAL_PLAN_KEY &&
    ACTIVE_STATUSES.has(input.status ?? '') &&
    isPeriodExpired(input.currentPeriodEnd)
  )
}
