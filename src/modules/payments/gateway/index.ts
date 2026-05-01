import { AsaasGateway } from './asaas.gateway'
import type { PaymentGateway, PaymentProvider } from './payment-gateway.interface'
import { StripeGateway } from './stripe.gateway'

let instance: PaymentGateway | null = null

function resolveProvider(): PaymentProvider {
  const raw = (process.env.PAYMENT_GATEWAY ?? 'stripe').toLowerCase()
  if (raw !== 'stripe' && raw !== 'asaas') {
    throw new Error(
      `PAYMENT_GATEWAY inválido: "${raw}". Valores aceitos: stripe, asaas.`
    )
  }
  return raw
}

function buildGateway(provider: PaymentProvider): PaymentGateway {
  switch (provider) {
    case 'stripe':
      return new StripeGateway()
    case 'asaas':
      return new AsaasGateway()
  }
}

export function getPaymentGateway(): PaymentGateway {
  if (!instance) {
    instance = buildGateway(resolveProvider())
  }
  return instance
}

/** Apenas para testes — força reinstanciar no próximo getPaymentGateway(). */
export function _resetPaymentGatewayForTests() {
  instance = null
}

export type { PaymentGateway, PaymentProvider } from './payment-gateway.interface'
