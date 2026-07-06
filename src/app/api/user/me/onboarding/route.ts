import { NextResponse } from 'next/server'
import { CURRENT_ONBOARDING_VERSION } from '@/lib/onboarding'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { resolveAuthenticatedDbUser } from '@/lib/account-identity'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const completedAt = new Date().toISOString()
  const admin = getSupabaseAdmin()
  const resolvedUser = await resolveAuthenticatedDbUser(admin, user.id)

  if (!resolvedUser) {
    return NextResponse.json({ error: 'User not provisioned' }, { status: 404 })
  }

  const { error } = await admin
    .from('users')
    .update({
      onboarding_completed_at: completedAt,
      onboarding_version: CURRENT_ONBOARDING_VERSION,
    })
    .eq('id', resolvedUser.id)

  if (error) {
    console.error('[api/user/me/onboarding] Failed to complete onboarding', error)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }

  return NextResponse.json({
    onboarding_completed_at: completedAt,
    onboarding_version: CURRENT_ONBOARDING_VERSION,
  })
}
