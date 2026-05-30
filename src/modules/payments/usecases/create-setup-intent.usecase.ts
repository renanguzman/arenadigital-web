import { getSupabaseAdmin } from '@/lib/supabase-server';
import { logAuditEvent } from '@/modules/audit/audit-log.service';
import {
  ExperimentalPlanAlreadyUsedError,
  InvalidPlanKeyError,
  PaymentConfigurationError,
} from '@/modules/payments/errors';
import { getPaymentGateway } from '@/modules/payments/gateway';
import type {
  CardCollectionContext,
  PaymentProvider,
  SubscriptionPlanInfo,
} from '@/modules/payments/gateway/payment-gateway.interface';
import {
  EXPERIMENTAL_PLAN_KEY,
  PARTNER_PLAN_KEY,
  planKeySchema,
  resolveCheckoutPlanKey,
  userSelectablePlanKeySchema,
  type PlanKey,
} from '@/modules/payments/plans';
import {
  fetchPlanByKey,
  type SubscriptionPlanRow,
} from '@/modules/payments/repositories/subscription-plans.repository';

export type CreateSetupIntentResponse = {
  provider: PaymentProvider;
  cardCollection: CardCollectionContext;
  customerId: string;
  planKey: PlanKey;
  planLabel: string;
  priceCents: number;
};

type ArenaContact = {
  name?: string | null;
  cpfCnpj?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  addressNumber?: string | null;
};

function toPlanInfo(plan: SubscriptionPlanRow): SubscriptionPlanInfo {
  return {
    key: plan.key,
    label: plan.label,
    priceCents: plan.price_cents,
    gatewayPriceId: plan.gateway_price_id,
  };
}

function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  return 'http://localhost:3000';
}

/** URL de retorno após checkout Asaas (rota real do app + query `status`). */
function buildSubscriptionCheckoutReturnUrl(
  baseUrl: string,
  arenaId: string,
  status: 'success' | 'canceled' | 'expired'
): string {
  const path = `/dashboard/settings/subscription/${arenaId}/checkout-return`;
  const url = new URL(path, `${baseUrl.replace(/\/$/, '')}/`);
  url.searchParams.set('status', status);
  return url.toString();
}

export async function createSetupIntent(
  arenaId: string,
  selectedPlanKey: PlanKey,
  ownerEmail: string,
  ownerName?: string | null,
  actorId?: string | null
): Promise<CreateSetupIntentResponse> {
  const supabase = getSupabaseAdmin();
  const gateway = getPaymentGateway();

  const parsedPlanKey = planKeySchema.safeParse(selectedPlanKey);
  if (!parsedPlanKey.success) throw new InvalidPlanKeyError();

  const { data: subscription } = await supabase
    .from('arena_subscriptions')
    .select('gateway_customer_id, status, plan_key, experimental_started_at')
    .eq('arena_id', arenaId)
    .maybeSingle();

  const requestedPlanKey = parsedPlanKey.data;
  const isSelectablePlan = userSelectablePlanKeySchema.safeParse(requestedPlanKey).success;
  if (
    requestedPlanKey === EXPERIMENTAL_PLAN_KEY &&
    subscription?.plan_key &&
    subscription.plan_key !== EXPERIMENTAL_PLAN_KEY
  ) {
    throw new ExperimentalPlanAlreadyUsedError();
  }

  if (
    !isSelectablePlan &&
    (requestedPlanKey !== PARTNER_PLAN_KEY ||
      subscription?.plan_key !== PARTNER_PLAN_KEY)
  ) {
    throw new InvalidPlanKeyError();
  }

  const planKey = resolveCheckoutPlanKey(requestedPlanKey);
  const plan = await fetchPlanByKey(planKey);
  if (!plan) throw new InvalidPlanKeyError();

  if (
    gateway.providerName === 'stripe' &&
    plan.key !== EXPERIMENTAL_PLAN_KEY &&
    !plan.gateway_price_id
  ) {
    throw new PaymentConfigurationError(
      `Stripe price_id não configurado para o plano "${planKey}".`
    );
  }

  const arenaContact = await fetchArenaContact(arenaId);
  if (gateway.providerName === 'asaas' && !arenaContact.cpfCnpj) {
    throw new PaymentConfigurationError(
      'CPF/CNPJ é obrigatório para usar o Asaas. Atualize o cadastro da arena.'
    );
  }

  if (
    plan.key === EXPERIMENTAL_PLAN_KEY &&
    subscription?.experimental_started_at
  ) {
    throw new ExperimentalPlanAlreadyUsedError();
  }

  let gatewayCustomerId: string | null =
    subscription?.gateway_customer_id ?? null;

  if (gateway.providerName === 'asaas') {
    const customer = await gateway.createCustomer({
      email: ownerEmail,
      name: ownerName ?? arenaContact.name,
      cpfCnpj: arenaContact.cpfCnpj,
      phone: arenaContact.phone,
      postalCode: arenaContact.postalCode,
      addressNumber: arenaContact.addressNumber,
      metadata: { arena_id: arenaId },
    });
    gatewayCustomerId = customer.id;
  } else if (!gatewayCustomerId) {
    const customer = await gateway.createCustomer({
      email: ownerEmail,
      name: ownerName ?? arenaContact.name,
      cpfCnpj: arenaContact.cpfCnpj,
      phone: arenaContact.phone,
      postalCode: arenaContact.postalCode,
      addressNumber: arenaContact.addressNumber,
      metadata: { arena_id: arenaId },
    });
    gatewayCustomerId = customer.id;
  }

  const { error: upsertError } = await supabase
    .from('arena_subscriptions')
    .upsert(
      {
        arena_id: arenaId,
        gateway_customer_id: gatewayCustomerId,
        plan_key: planKey,
        plan_id: plan.id,
        status: subscription?.status ?? 'incomplete',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'arena_id' }
    );

  if (upsertError) {
    console.error('[payments] create-setup-intent — DB upsert failed', {
      customerId: gatewayCustomerId,
      error: upsertError,
    });
    throw new PaymentConfigurationError(upsertError.message);
  }

  const baseUrl = getAppBaseUrl();

  if (gateway.providerName === 'asaas' && !baseUrl.toLowerCase().startsWith('https://')) {
    throw new PaymentConfigurationError(
      'Asaas exige URLs de callback em HTTPS e no mesmo domínio das informações comerciais da conta. Defina NEXT_PUBLIC_APP_URL (ou APP_URL) com um endereço público https (ex.: URL do cloudflared), não http://localhost.'
    );
  }

  const cardCollection = await gateway.prepareCardCollection({
    customerId: gatewayCustomerId,
    arenaId,
    plan: toPlanInfo(plan),
    successUrl: buildSubscriptionCheckoutReturnUrl(baseUrl, arenaId, 'success'),
    cancelUrl: buildSubscriptionCheckoutReturnUrl(baseUrl, arenaId, 'canceled'),
    expiredUrl: buildSubscriptionCheckoutReturnUrl(baseUrl, arenaId, 'expired'),
    metadata: { arena_id: arenaId, plan_key: planKey },
    idempotencyKey: `setup-intent-${arenaId}-${planKey}-${Date.now()}`,
  });

  if (cardCollection.provider === 'asaas-checkout') {
    const { error: checkoutUpdateError } = await supabase
      .from('arena_subscriptions')
      .update({
        gateway_checkout_id: cardCollection.checkoutId,
        updated_at: new Date().toISOString(),
      })
      .eq('arena_id', arenaId);

    if (checkoutUpdateError) {
      console.error(
        '[payments] create-setup-intent — failed to persist gateway_checkout_id',
        { checkoutId: cardCollection.checkoutId, error: checkoutUpdateError }
      );
      throw new PaymentConfigurationError(checkoutUpdateError.message);
    }
  }

  await logAuditEvent({
    entityType: 'arena_subscription',
    entityId: arenaId,
    action: 'subscription.setup_intent_created',
    actorId: actorId ?? ownerEmail,
    actorType: 'user',
    newValue: {
      plan_key: planKey,
      plan_id: plan.id,
      gateway_customer_id: gatewayCustomerId,
      provider: gateway.providerName,
    },
    metadata: {
      arena_id: arenaId,
      reused_customer: Boolean(subscription?.gateway_customer_id),
    },
  });

  return {
    provider: gateway.providerName,
    cardCollection,
    customerId: gatewayCustomerId,
    planKey,
    planLabel: plan.label,
    priceCents: plan.price_cents,
  };
}

async function fetchArenaContact(arenaId: string): Promise<ArenaContact> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('arenas')
    .select('name, cpf_cnpj, phone, zip_code, number')
    .eq('id', arenaId)
    .maybeSingle();

  if (!data) return {};

  return {
    name: data.name,
    cpfCnpj: data.cpf_cnpj,
    phone: data.phone,
    postalCode: data.zip_code,
    addressNumber: data.number,
  };
}
