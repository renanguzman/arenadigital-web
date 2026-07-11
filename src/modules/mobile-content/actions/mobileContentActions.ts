"use server"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from 'next/cache'
import { assertArenaBackofficeAccess, assertPlatformAdminAccess } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type {
  AppHomeContent,
  AppHomeContentInput,
  ArenaHighlightInput,
  ArenaPromotionInput,
  MobileContentOption,
  MobileHighlight,
  MobileOpenGame,
  MobilePromotion,
  MobileContentResult,
  OpenGameInput,
} from '../types/mobile-content.types'

const MOBILE_CONTENT_REVALIDATE_PATHS = [
  '/dashboard',
  '/dashboard/admin/mobile-content',
  '/dashboard/settings/arenas',
]

function revalidateMobileContent(arenaId?: string) {
  for (const path of MOBILE_CONTENT_REVALIDATE_PATHS) revalidatePath(path)
  if (arenaId) revalidatePath(`/dashboard/arenas/${arenaId}`)
}

function normalizeError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export async function listAppHomeContentAction(): Promise<MobileContentResult<AppHomeContent[]>> {
  try {
    await assertPlatformAdminAccess()
    const supabase = getSupabaseAdmin() as any
    const { data, error } = await supabase
      .from('app_home_content')
      .select('*, sports(id, name), municipios(codigo_ibge, nome, estados(uf))')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return { success: true, data: (data ?? []) as AppHomeContent[] }
  } catch (err) {
    return { success: false, data: [], error: normalizeError(err, 'Erro ao listar conteúdos globais') }
  }
}

export async function upsertAppHomeContentAction(input: AppHomeContentInput): Promise<MobileContentResult<AppHomeContent | null>> {
  try {
    const admin = await assertPlatformAdminAccess()
    const supabase = getSupabaseAdmin() as any
    const payload = {
      kind: input.kind,
      title: input.title,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      cta_label: input.cta_label ?? null,
      cta_url: input.cta_url ?? null,
      cta_kind: input.cta_kind ?? 'none',
      city_id: input.city_id ?? null,
      sport_id: input.sport_id ?? null,
      priority: input.priority ?? 0,
      starts_at: input.starts_at ?? new Date().toISOString(),
      ends_at: input.ends_at ?? null,
      active: input.active ?? true,
      created_by: admin.dbUserId,
    }

    const query = input.id
      ? supabase.from('app_home_content').update(payload).eq('id', input.id)
      : supabase.from('app_home_content').insert(payload)

    const { data, error } = await query.select('*').single()
    if (error) throw new Error(error.message)
    revalidateMobileContent()
    return { success: true, data: data as AppHomeContent }
  } catch (err) {
    return { success: false, data: null, error: normalizeError(err, 'Erro ao salvar conteúdo global') }
  }
}

export async function setAppHomeContentActiveAction(
  contentId: string,
  active: boolean
): Promise<MobileContentResult<null>> {
  try {
    await assertPlatformAdminAccess()
    const supabase = getSupabaseAdmin() as any
    const { error } = await supabase
      .from('app_home_content')
      .update({ active })
      .eq('id', contentId)

    if (error) throw new Error(error.message)
    revalidateMobileContent()
    return { success: true, data: null }
  } catch (err) {
    return { success: false, data: null, error: normalizeError(err, 'Erro ao alterar conteúdo global') }
  }
}

export async function deleteAppHomeContentAction(contentId: string): Promise<MobileContentResult<null>> {
  try {
    await assertPlatformAdminAccess()
    const supabase = getSupabaseAdmin() as any
    const { error } = await supabase
      .from('app_home_content')
      .delete()
      .eq('id', contentId)

    if (error) throw new Error(error.message)
    revalidateMobileContent()
    return { success: true, data: null }
  } catch (err) {
    return { success: false, data: null, error: normalizeError(err, 'Erro ao excluir conteúdo global') }
  }
}

export async function listArenaPromotionsAction(arenaId: string): Promise<MobileContentResult<MobilePromotion[]>> {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const supabase = getSupabaseAdmin() as any
    const { data, error } = await supabase
      .from('arena_promotions')
      .select('*, arenas(id, name), courts(id, name), sports(id, name)')
      .eq('arena_id', arenaId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return { success: true, data: (data ?? []) as MobilePromotion[] }
  } catch (err) {
    return { success: false, data: [], error: normalizeError(err, 'Erro ao listar promoções') }
  }
}

export async function upsertArenaPromotionAction(input: ArenaPromotionInput): Promise<MobileContentResult<MobilePromotion | null>> {
  try {
    await assertArenaBackofficeAccess(input.arena_id)
    const supabase = getSupabaseAdmin() as any
    const payload = {
      ...input,
      starts_at: input.starts_at ?? new Date().toISOString(),
      active: input.active ?? true,
      priority: input.priority ?? 0,
    }

    const query = input.id
      ? supabase.from('arena_promotions').update(payload).eq('id', input.id).eq('arena_id', input.arena_id)
      : supabase.from('arena_promotions').insert(payload)

    const { data, error } = await query.select('*').single()
    if (error) throw new Error(error.message)
    revalidateMobileContent(input.arena_id)
    return { success: true, data: data as MobilePromotion }
  } catch (err) {
    return { success: false, data: null, error: normalizeError(err, 'Erro ao salvar promoção') }
  }
}

export async function setArenaPromotionActiveAction(
  arenaId: string,
  promotionId: string,
  active: boolean
): Promise<MobileContentResult<null>> {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const supabase = getSupabaseAdmin() as any
    const { error } = await supabase
      .from('arena_promotions')
      .update({ active })
      .eq('id', promotionId)
      .eq('arena_id', arenaId)

    if (error) throw new Error(error.message)
    revalidateMobileContent(arenaId)
    return { success: true, data: null }
  } catch (err) {
    return { success: false, data: null, error: normalizeError(err, 'Erro ao alterar promoção') }
  }
}

export async function listArenaHighlightsAction(arenaId: string): Promise<MobileContentResult<MobileHighlight[]>> {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const supabase = getSupabaseAdmin() as any
    const { data, error } = await supabase
      .from('arena_highlights')
      .select('*, arenas(id, name), sports(id, name), municipios(codigo_ibge, nome)')
      .eq('arena_id', arenaId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return { success: true, data: (data ?? []) as MobileHighlight[] }
  } catch (err) {
    return { success: false, data: [], error: normalizeError(err, 'Erro ao listar destaques') }
  }
}

export async function upsertArenaHighlightAction(input: ArenaHighlightInput): Promise<MobileContentResult<MobileHighlight | null>> {
  try {
    await assertArenaBackofficeAccess(input.arena_id)
    const supabase = getSupabaseAdmin() as any
    const payload = {
      ...input,
      starts_at: input.starts_at ?? new Date().toISOString(),
      active: input.active ?? true,
      priority: input.priority ?? 0,
    }

    const query = input.id
      ? supabase.from('arena_highlights').update(payload).eq('id', input.id).eq('arena_id', input.arena_id)
      : supabase.from('arena_highlights').insert(payload)

    const { data, error } = await query.select('*').single()
    if (error) throw new Error(error.message)
    revalidateMobileContent(input.arena_id)
    return { success: true, data: data as MobileHighlight }
  } catch (err) {
    return { success: false, data: null, error: normalizeError(err, 'Erro ao salvar destaque') }
  }
}

export async function setArenaHighlightActiveAction(
  arenaId: string,
  highlightId: string,
  active: boolean
): Promise<MobileContentResult<null>> {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const supabase = getSupabaseAdmin() as any
    const { error } = await supabase
      .from('arena_highlights')
      .update({ active })
      .eq('id', highlightId)
      .eq('arena_id', arenaId)

    if (error) throw new Error(error.message)
    revalidateMobileContent(arenaId)
    return { success: true, data: null }
  } catch (err) {
    return { success: false, data: null, error: normalizeError(err, 'Erro ao alterar destaque') }
  }
}

export async function listArenaOpenGamesAction(arenaId: string): Promise<MobileContentResult<MobileOpenGame[]>> {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const supabase = getSupabaseAdmin() as any
    const { data, error } = await supabase
      .from('open_games')
      .select('*, arenas(id, name), sports(id, name), atleta:owner_atleta_id(id, nome_perfil)')
      .eq('arena_id', arenaId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw new Error(error.message)
    return { success: true, data: (data ?? []) as MobileOpenGame[] }
  } catch (err) {
    return { success: false, data: [], error: normalizeError(err, 'Erro ao listar jogos abertos') }
  }
}

export async function upsertOpenGameAction(input: OpenGameInput): Promise<MobileContentResult<MobileOpenGame | null>> {
  try {
    await assertArenaBackofficeAccess(input.arena_id)
    const supabase = getSupabaseAdmin() as any
    const payload = {
      ...input,
      needed_players: input.needed_players ?? 1,
      current_players: input.current_players ?? 0,
      status: input.status ?? 'open',
      visibility: input.visibility ?? 'public',
    }

    const query = input.id
      ? supabase.from('open_games').update(payload).eq('id', input.id).eq('arena_id', input.arena_id)
      : supabase.from('open_games').insert(payload)

    const { data, error } = await query.select('*').single()
    if (error) throw new Error(error.message)
    revalidateMobileContent(input.arena_id)
    return { success: true, data: data as MobileOpenGame }
  } catch (err) {
    return { success: false, data: null, error: normalizeError(err, 'Erro ao salvar jogo aberto') }
  }
}

export async function listArenaAthletesForMobileContentAction(arenaId: string): Promise<MobileContentResult<MobileContentOption[]>> {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const supabase = getSupabaseAdmin() as any
    const { data, error } = await supabase
      .from('arenas_atleta')
      .select('id_atleta, atleta:id_atleta(id, nome_perfil)')
      .eq('id_arena', arenaId)
      .order('data_criacao', { ascending: false })

    if (error) throw new Error(error.message)

    const athletes = (data ?? [])
      .map((row: { id_atleta: string; atleta?: { id?: string; nome_perfil?: string } | null }) => ({
        id: row.atleta?.id ?? row.id_atleta,
        name: row.atleta?.nome_perfil ?? 'Atleta sem nome',
      }))
      .filter((option: MobileContentOption) => Boolean(option.id))

    return { success: true, data: athletes }
  } catch (err) {
    return { success: false, data: [], error: normalizeError(err, 'Erro ao listar atletas da arena') }
  }
}
