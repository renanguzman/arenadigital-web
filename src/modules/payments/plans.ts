import z from 'zod'

// PlanKey e planKeySchema são usados para validação de input nas API routes.
// Os dados dos planos (label, preço, maxSpaces, gateway price id) vivem na tabela
// subscription_plans no banco — consulte via subscription-plans.repository.ts.

export const userSelectablePlanKeySchema = z.enum([
  'experimental',
  'starter',
  'max',
  'pro'
])
export const planKeySchema = z.enum([
  'experimental',
  'starter',
  'max',
  'pro',
  'parceiro'
])

export type PlanKey = z.infer<typeof planKeySchema>
export type UserSelectablePlanKey = z.infer<typeof userSelectablePlanKeySchema>

export const EARLY_ACCESS_PLAN_KEY: UserSelectablePlanKey = 'starter'
export const EXPERIMENTAL_PLAN_KEY: PlanKey = 'experimental'
export const PARTNER_PLAN_KEY: PlanKey = 'parceiro'
export const UNLIMITED_SPACES_SENTINEL = 2147483647

export function isPlanSelectionEnabled() {
  return process.env.PAYMENTS_PLAN_SELECTION_ENABLED !== 'false'
}

export function resolveCheckoutPlanKey(planKey: PlanKey) {
  if (isPartnerPlan(planKey)) return planKey
  return isPlanSelectionEnabled() ? planKey : EARLY_ACCESS_PLAN_KEY
}

export function isPartnerPlan(planKey: string | null | undefined) {
  return planKey === PARTNER_PLAN_KEY
}

export function hasUnlimitedSpaces(maxSpaces: number | null | undefined) {
  return typeof maxSpaces === 'number' && maxSpaces >= UNLIMITED_SPACES_SENTINEL
}
