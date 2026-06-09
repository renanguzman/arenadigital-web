import { assertArenaBackofficeAccess } from '@/lib/server-auth'
import { redirect } from 'next/navigation'
import { getAvulsosTodosAction } from '@/modules/finance/actions/financeActions'
import { AvulsasPageClient } from '@/modules/finance/components/AvulsasPageClient'

export default async function AvulsasPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: arenaId } = await params

    try {
        await assertArenaBackofficeAccess(arenaId)
    } catch {
        redirect('/dashboard/settings/arenas')
    }

    const result = await getAvulsosTodosAction(arenaId)

    return <AvulsasPageClient arenaId={arenaId} initialItems={result.data ?? []} />
}
