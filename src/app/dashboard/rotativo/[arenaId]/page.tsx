import { assertArenaBackofficeAccess } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { SupabaseArenaRepository } from '@/modules/arenas/repositories/SupabaseArenaRepository'
import { SupabaseRotativoRepository } from '@/modules/rotativos/repositories/SupabaseRotativoRepository'
import { RotativoPageClient } from './RotativoPageClient'
import { redirect } from 'next/navigation'

export default async function RotativoPage({ params }: { params: Promise<{ arenaId: string }> }) {
  const { arenaId } = await params

  try {
    await assertArenaBackofficeAccess(arenaId)
  } catch {
    redirect('/dashboard/settings/arenas')
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
