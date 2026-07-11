import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function normalizeRedirectError(value: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const error = normalizeRedirectError(url.searchParams.get('error'))
  const supabase = await createSupabaseServerClient()

  await supabase.auth.signOut()

  const redirectUrl = new URL('/sign-in', url.origin)
  if (error) redirectUrl.searchParams.set('error', error)

  return NextResponse.redirect(redirectUrl)
}
