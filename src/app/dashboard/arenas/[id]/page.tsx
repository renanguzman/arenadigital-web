import { assertArenaBackofficeAccess } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { SupabaseArenaRepository } from '@/modules/arenas/repositories/SupabaseArenaRepository'
import { SupabaseBookingRepository } from '@/modules/bookings/repositories/SupabaseBookingRepository'
import { ArenaDetailPageClient } from './ArenaDetailPageClient'
import { parseArenaDashboardTab } from '@/lib/arena-dashboard-navigation'
import { redirect } from 'next/navigation'
import { buildTutorialBookings, buildTutorialCourts } from '@/lib/tutorial-mock-data'
export default async function ArenaDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ tab?: string; tutorial?: string }>
}) {
    const { id } = await params
    const { tab, tutorial } = await searchParams

    try {
        await assertArenaBackofficeAccess(id)
    } catch {
        redirect('/dashboard/settings/arenas')
    }

    const initialTab = parseArenaDashboardTab(tab)
    if (tutorial === '1') {
        return (
            <ArenaDetailPageClient
                arenaId={id}
                arenaName="Arena demonstrativa"
                initialCourts={buildTutorialCourts(id)}
                initialBookings={buildTutorialBookings(id)}
                initialTab={initialTab}
            />
        )
    }

    const supabase = getSupabaseAdmin()
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

    const [arena, courtsRaw, bookings] = await Promise.all([
        new SupabaseArenaRepository(supabase).findById(id),
        supabase
            .from('courts')
            .select(`*, sports:court_sports(sport:sports(*))`)
            .eq('arena_id', id)
            .order('created_at', { ascending: false }),
        new SupabaseBookingRepository(supabase).findByArena(id, startOfDay, endOfDay),
    ])

    if (!arena) redirect('/dashboard/settings/arenas')

    const courts = (courtsRaw.data ?? []).map(court => ({
        ...court,
        sports: (court.sports as any[]).map(s => s.sport)
    }))

    return (
        <ArenaDetailPageClient
            arenaId={id}
            arenaName={arena.name}
            initialCourts={courts}
            initialBookings={bookings}
            initialTab={initialTab}
        />
    )
}
