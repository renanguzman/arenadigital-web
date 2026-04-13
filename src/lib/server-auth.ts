import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export class AuthorizationError extends Error {
  status: number

  constructor(message: string, status = 403) {
    super(message)
    this.name = 'AuthorizationError'
    this.status = status
  }
}

export type AuthenticatedDbUser = {
  clerkUserId: string
  dbUserId: string
}

export async function requireAuthenticatedDbUser(): Promise<AuthenticatedDbUser> {
  const { userId } = await auth()

  if (!userId) {
    throw new AuthorizationError('Unauthorized', 401)
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load current db user: ${error.message}`)
  }

  if (!data) {
    throw new AuthorizationError('User not provisioned', 404)
  }

  return {
    clerkUserId: userId,
    dbUserId: data.id,
  }
}

export async function assertArenaAccess(arenaId: string): Promise<AuthenticatedDbUser> {
  const currentUser = await requireAuthenticatedDbUser()
  const supabase = getSupabaseAdmin()

  const { data: ownedArena, error: ownerError } = await supabase
    .from('arenas')
    .select('id')
    .eq('id', arenaId)
    .eq('owner_id', currentUser.dbUserId)
    .maybeSingle()

  if (ownerError) {
    throw new Error(`Failed to verify arena ownership: ${ownerError.message}`)
  }

  if (ownedArena) {
    return currentUser
  }

  const { data: linkedArena, error: linkedError } = await supabase
    .from('arena_users')
    .select('arena_id')
    .eq('arena_id', arenaId)
    .eq('user_id', currentUser.dbUserId)
    .in('status', ['Ativo', 'ativo', 'active'])
    .maybeSingle()

  if (linkedError) {
    throw new Error(`Failed to verify arena membership: ${linkedError.message}`)
  }

  if (!linkedArena) {
    throw new AuthorizationError('Forbidden', 403)
  }

  return currentUser
}
