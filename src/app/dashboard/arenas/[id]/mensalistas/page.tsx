import { assertArenaBackofficeAccess } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { MensalistasPageClient } from '@/modules/bookings/components/MensalistasPageClient'
import type { PlanoMensalistaComDetalhes } from '@/modules/bookings/types/booking.types'
import { buildTutorialMonthlyPlans } from '@/lib/tutorial-mock-data'

type PlanoMensalistaRow = Omit<PlanoMensalistaComDetalhes, 'proximo_mes_reservado'>

export default async function MensalistasPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ tutorial?: string }>
}) {
    const { id: arenaId } = await params
    const { tutorial } = await searchParams

    try {
        await assertArenaBackofficeAccess(arenaId)
    } catch {
        redirect('/dashboard/settings/arenas')
    }

    if (tutorial === '1') {
        return <MensalistasPageClient arenaId={arenaId} initialPlanos={buildTutorialMonthlyPlans(arenaId)} />
    }

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    const { data: planos } = await supabase
        .from('planos_mensalista')
        .select('*, atleta:athlete_id(id, nome_perfil, telefone), sports:sport_id(id, name), court:court_id(id, name)')
        .eq('arena_id', arenaId)
        .order('created_at', { ascending: false })

    const planosRows = (planos ?? []) as PlanoMensalistaRow[]
    const planosWithNext: PlanoMensalistaComDetalhes[] = await Promise.all(
        planosRows.map(async (plano) => {
            const { data: nextReservado } = await supabase
                .from('bookings')
                .select('start_time')
                .eq('plano_mensalista_id', plano.id)
                .eq('status', 'reservado')
                .gte('start_time', now)
                .order('start_time', { ascending: true })
                .limit(1)

            return {
                ...plano,
                proximo_mes_reservado: nextReservado?.[0]?.start_time ?? null,
            } as PlanoMensalistaComDetalhes
        })
    )

    return <MensalistasPageClient arenaId={arenaId} initialPlanos={planosWithNext} />
}
