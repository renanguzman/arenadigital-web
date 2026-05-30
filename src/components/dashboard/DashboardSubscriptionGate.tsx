'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useArena } from '@/contexts/ArenaContext'
import { PARTNER_PLAN_KEY } from '@/modules/payments/plans'
import {
  hasUsableSubscription,
  isExpiredExperimentalSubscription,
} from '@/modules/payments/subscription-rules'

type SubscriptionSnapshot = {
  status: string
  planKey: string | null
  currentPeriodEnd: string | null
  card: unknown | null
}

type State =
  | { status: 'idle' }
  | { status: 'ready'; arenaId: string; subscription: SubscriptionSnapshot }
  | { status: 'error'; arenaId: string }

export function DashboardSubscriptionGate() {
  const router = useRouter()
  const pathname = usePathname()
  const { selectedArena, selectedArenaDetails, isLoadingArenas } = useArena()
  const [state, setState] = useState<State>({ status: 'idle' })

  const canManageSubscription = Boolean(
    selectedArenaDetails?.isOwner || selectedArenaDetails?.role === 'Gestor'
  )

  useEffect(() => {
    if (isLoadingArenas || !selectedArena || !canManageSubscription) {
      return
    }

    const controller = new AbortController()

    fetch(`/api/payments/subscriptions/${selectedArena}`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('subscription fetch failed')
        const data = (await res.json()) as SubscriptionSnapshot
        setState({ status: 'ready', arenaId: selectedArena, subscription: data })
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({ status: 'error', arenaId: selectedArena })
      })

    return () => controller.abort()
  }, [canManageSubscription, isLoadingArenas, selectedArena])

  useEffect(() => {
    if (
      !selectedArena ||
      !canManageSubscription ||
      state.status !== 'ready' ||
      state.arenaId !== selectedArena
    ) {
      return
    }

    const subscriptionPath = `/dashboard/settings/subscription/${selectedArena}`
    if (pathname.startsWith('/dashboard/settings/subscription')) return

    const isDashboardHome = pathname === '/dashboard'
    const isExpiredExperimental = isExpiredExperimentalSubscription(
      state.subscription
    )
    const hasAccess = hasUsableSubscription(state.subscription)
    const partnerNeedsCard =
      state.subscription.planKey === PARTNER_PLAN_KEY && !state.subscription.card

    if (
      isExpiredExperimental ||
      (partnerNeedsCard && !isDashboardHome) ||
      (!hasAccess && !isDashboardHome)
    ) {
      router.replace(subscriptionPath)
    }
  }, [canManageSubscription, pathname, router, selectedArena, state])

  return null
}
