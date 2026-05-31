import { assertArenaBackofficeAccess } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { SupabaseArenaRepository } from '@/modules/arenas/repositories/SupabaseArenaRepository'
import { SupabaseProductRepository } from '@/modules/products/repositories/SupabaseProductRepository'
import { ProductsPageClient } from './ProductsPageClient'
import { redirect } from 'next/navigation'
import { buildTutorialProducts } from '@/lib/tutorial-mock-data'

export default async function ArenaProductsPage({
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
        return (
            <ProductsPageClient
                arenaId={arenaId}
                arenaName="Arena demonstrativa"
                initialProducts={buildTutorialProducts(arenaId)}
                initialStationTypes={[
                    { id: 'tutorial-station-type-1', name: 'Bar' },
                    { id: 'tutorial-station-type-2', name: 'Loja' },
                ]}
            />
        )
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
