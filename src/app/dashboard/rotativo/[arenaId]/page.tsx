import { assertArenaBackofficeAccess } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { SupabaseArenaRepository } from '@/modules/arenas/repositories/SupabaseArenaRepository'
import { SupabaseRotativoRepository } from '@/modules/rotativos/repositories/SupabaseRotativoRepository'
import { RotativoPageClient } from '@/modules/rotativos/components/RotativoPageClient'
import { redirect } from 'next/navigation'
import { buildTutorialRotativos } from '@/lib/tutorial-mock-data'

export default async function RotativoPage({
  params,
  searchParams,
}: {
  params: Promise<{ arenaId: string }>
  searchParams: Promise<{ tutorial?: string }>
}) {
  const { arenaId } = await params
  const { tutorial } = await searchParams

  try {
    await assertArenaBackofficeAccess(arenaId)
  } catch {
    redirect('/dashboard/settings/arenas')
  }

  if (tutorial === '1') {
    const tutorialRotativos = buildTutorialRotativos(arenaId)
    return (
      <RotativoPageClient
        arenaId={arenaId}
        sports={[
          { id: 'tutorial-sport-1', name: 'Beach Tennis' },
          { id: 'tutorial-sport-2', name: 'Futevolei' },
        ]}
        courts={[
          { id: 'tutorial-court-1', name: 'Quadra Beach 01' },
          { id: 'tutorial-court-2', name: 'Quadra Beach 02' },
        ]}
        initialRotativos={tutorialRotativos}
        initialRotativosTotal={tutorialRotativos.length}
        initialPacotes={[]}
        initialMovements={[]}
        initialMovementsTotal={0}
        initialTopAthletes={[]}
      />
    )
  }

  const supabase = getSupabaseAdmin()
  const arenaRepo = new SupabaseArenaRepository(supabase)
  const repo = new SupabaseRotativoRepository(supabase)

  await repo.processExpiredCredits(arenaId)

  const [arena, rotativosList, courts, pacotes, movements, topAthletes] = await Promise.all([
    arenaRepo.findById(arenaId),
    repo.list(arenaId, { page: 1, pageSize: 10 }),
    repo.getCourts(arenaId),
    repo.getPacotes(arenaId),
    repo.getCreditMovements(arenaId, { page: 1, pageSize: 10 }),
    repo.getTopAthletesByCredit(arenaId, 5),
  ])

  return (
    <RotativoPageClient
      arenaId={arenaId}
      sports={arena?.sports ?? []}
      courts={courts}
      initialRotativos={rotativosList.rows}
      initialRotativosTotal={rotativosList.total}
      initialPacotes={pacotes}
      initialMovements={movements.rows}
      initialMovementsTotal={movements.total}
      initialTopAthletes={topAthletes}
    />
  )
}
