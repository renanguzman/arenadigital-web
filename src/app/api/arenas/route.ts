import { NextResponse } from 'next/server'
import { AuthorizationError, requireAuthenticatedDbUser } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { dbUserId } = await requireAuthenticatedDbUser()
    const supabase = getSupabaseAdmin()

    const { data: linkedArenas, error: linkedError } = await supabase
      .from('arena_users')
      .select('arena_id')
      .eq('user_id', dbUserId)
      .in('status', ['Ativo', 'ativo', 'active'])

    if (linkedError) {
      throw new Error(`Failed to load linked arenas: ${linkedError.message}`)
    }

    const linkedArenaIds = linkedArenas?.map((arena) => arena.arena_id) ?? []

    let query = supabase.from('arenas').select('id, name')

    if (linkedArenaIds.length > 0) {
      query = query.or(`owner_id.eq.${dbUserId},id.in.(${linkedArenaIds.join(',')})`)
    } else {
      query = query.eq('owner_id', dbUserId)
    }

    const { data, error } = await query.order('name')

    if (error) {
      throw new Error(`Failed to load arenas: ${error.message}`)
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[api/arenas] Failed to load arenas', error)
    return NextResponse.json({ error: 'Failed to load arenas' }, { status: 500 })
  }
}
