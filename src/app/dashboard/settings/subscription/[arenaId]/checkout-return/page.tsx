import { redirect } from 'next/navigation';
import { assertArenaSubscriptionAccess } from '@/lib/server-auth';
import { CheckoutReturnClient } from '@/modules/payments/components/CheckoutReturnClient';

type SearchParams = Promise<{ status?: string }>;

export default async function CheckoutReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ arenaId: string }>;
  searchParams: SearchParams;
}) {
  const { arenaId } = await params;
  const { status } = await searchParams;

  try {
    await assertArenaSubscriptionAccess(arenaId);
  } catch {
    redirect('/dashboard/settings/arenas');
  }

  return <CheckoutReturnClient arenaId={arenaId} initialStatus={status ?? null} />;
}
