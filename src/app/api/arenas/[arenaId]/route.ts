import { NextResponse } from 'next/server'
import { assertArenaAccess, AuthorizationError } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

type RouteContext = {
  params: Promise<{
    arenaId: string
  }>
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { arenaId } = await context.params

    await assertArenaAccess(arenaId)

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('arenas')
      .select('id, name, owner_id')
      .eq('id', arenaId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load arena: ${error.message}`)
    }

    if (!data) {
      return NextResponse.json({ error: 'Arena not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[api/arenas/[arenaId]] Failed to load arena', error)
    return NextResponse.json({ error: 'Failed to load arena' }, { status: 500 })
  }
}
