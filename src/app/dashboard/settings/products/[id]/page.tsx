import { assertArenaBackofficeAccess } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { SupabaseArenaRepository } from '@/modules/arenas/repositories/SupabaseArenaRepository'
import { SupabaseProductRepository } from '@/modules/products/repositories/SupabaseProductRepository'
import { ProductsPageClient } from './ProductsPageClient'
import { redirect } from 'next/navigation'

export default async function ArenaProductsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: arenaId } = await params

    try {
        await assertArenaBackofficeAccess(arenaId)
    } catch {
        redirect('/dashboard/settings/arenas')
    }

    const supabase = getSupabaseAdmin()
    const [arena, products, stationTypesResult] = await Promise.all([
        new SupabaseArenaRepository(supabase).findById(arenaId),
        new SupabaseProductRepository(supabase).findByArena(arenaId),
        supabase.from("station_types").select("id, name").order("name", { ascending: true }),
    ])

    if (stationTypesResult.error) {
        console.error("station_types:", stationTypesResult.error.message)
    }

    const initialStationTypes =
        (stationTypesResult.data as { id: string; name: string }[] | null) ?? []

    return (
        <ProductsPageClient
            arenaId={arenaId}
            arenaName={arena?.name ?? ''}
            initialProducts={products}
            initialStationTypes={initialStationTypes}
        />
    )
}
