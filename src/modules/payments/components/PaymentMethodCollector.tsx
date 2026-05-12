'use client'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { PaymentSetupForm } from './PaymentSetupForm'
import type { CardCollectionContext } from '@/modules/payments/gateway/payment-gateway.interface'
import type { PlanKey } from '@/modules/payments/plans'
import { ARENA_BRAND_HEX } from '@/constants/arena-brand-hex'

let stripePromiseCache: Promise<Stripe | null> | null = null

function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromiseCache) {
    stripePromiseCache = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
    )
  }
  return stripePromiseCache
}

type Props = {
  arenaId: string
  planKey: PlanKey
  cardCollection: CardCollectionContext
  onSuccess: () => void
  onError: (message: string) => void
  onCancel?: () => void
  submitLabel?: string
}

export function PaymentMethodCollector({
  arenaId,
  planKey,
  cardCollection,
  onSuccess,
  onError,
  onCancel,
  submitLabel
}: Props) {
  if (cardCollection.provider === 'stripe') {
    return (
      <Elements
        stripe={getStripePromise()}
        options={{
          clientSecret: cardCollection.clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: ARENA_BRAND_HEX.button,
              borderRadius: '12px',
              colorText: ARENA_BRAND_HEX.navy800,
              colorBackground: '#ffffff'
            }
          },
          locale: 'pt-BR'
        }}
      >
        <PaymentSetupForm
          arenaId={arenaId}
          planKey={planKey}
          onSuccess={onSuccess}
          onError={onError}
          onCancel={onCancel}
          submitLabel={submitLabel}
        />
      </Elements>
    )
  }

  // asaas-checkout: o fluxo é via redirect. Esse componente não deveria
  // ser renderizado nesse caso — o SubscriptionPageClient deve interceptar
  // a resposta do setup-intent e redirecionar diretamente.
  return null
}
