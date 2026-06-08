"use server"

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { assertArenaBackofficeAccess, assertCourtAccess } from '@/lib/server-auth'
import { assertCanCreateSpaceForArena } from '@/modules/payments/usecases/assert-space-entitlement.usecase'
import type { Database } from '@/types/supabase.types'
import {
    normalizeCourtSports,
    type CourtWithSportRelations,
} from '@/modules/courts/utils/normalize-court-sports'
import { revalidatePath } from 'next/cache'

type CourtInsert = Database['public']['Tables']['courts']['Insert']
type CourtUpdate = Database['public']['Tables']['courts']['Update']
type CourtCreateInput = Omit<CourtInsert, 'arena_id'>

type CourtRowWithSports = CourtWithSportRelations & Record<string, unknown>

export async function getSportsForCourtAction(): Promise<{ success: boolean; data: { id: string; name: string }[]; error?: string }> {
    try {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('sports')
            .select('id, name')
            .order('name')

        if (error) throw new Error(error.message)
        return { success: true, data: data ?? [] }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar esportes'
        console.error('[getSportsForCourtAction]', message)
        return { success: false, error: message, data: [] }
    }
}

export async function getCourtsByArenaAction(arenaId: string) {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('courts')
            .select(`*, sports:court_sports(sport:sports(*))`)
            .eq('arena_id', arenaId)
            .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        return {
            success: true,
            data: (data as CourtRowWithSports[]).map((court) => normalizeCourtSports(court))
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar espaços'
        return { success: false, error: message, data: [] }
    }
}

export async function deleteCourtAction(arenaId: string, courtId: string) {
    try {
        await assertCourtAccess(courtId, arenaId)
        const { error } = await getSupabaseAdmin()
            .from('courts')
            .delete()
            .eq('id', courtId)
            .eq('arena_id', arenaId)

        if (error) throw new Error(error.message)
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao excluir espaço'
        return { success: false, error: message }
    }
}

export async function getCourtByIdAction(arenaId: string, courtId: string) {
    try {
        await assertCourtAccess(courtId, arenaId)
        const { data, error } = await getSupabaseAdmin()
            .from('courts')
            .select(`*, sports:court_sports(sport:sports(*))`)
            .eq('id', courtId)
            .eq('arena_id', arenaId)
            .single()

        if (error) throw new Error(error.message)

        return { success: true, data: normalizeCourtSports(data as CourtRowWithSports) }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar espaço'
        return { success: false, error: message, data: null }
    }
}

export async function createCourtAction(arenaId: string, input: CourtCreateInput, sportIds?: string[]) {
    try {
        await assertArenaBackofficeAccess(arenaId)
        await assertCanCreateSpaceForArena(arenaId)
        const supabase = getSupabaseAdmin()

        const { data: court, error } = await supabase
            .from('courts')
            .insert([{ ...input, arena_id: arenaId }])
            .select()
            .single()

        if (error) throw new Error(error.message)

        if (sportIds && sportIds.length > 0) {
            await supabase.from('court_sports').insert(sportIds.map(id => ({ court_id: court.id, sport_id: id })))
        }

        revalidatePath(`/dashboard/arenas/${arenaId}`)
        return { success: true, data: court }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar espaço'
        return { success: false, error: message, data: null }
    }
}

export async function updateCourtAction(arenaId: string, courtId: string, input: CourtUpdate, sportIds?: string[]) {
    try {
        await assertCourtAccess(courtId, arenaId)
        const supabase = getSupabaseAdmin()

        const { data: court, error } = await supabase
            .from('courts')
            .update(input)
            .eq('id', courtId)
            .eq('arena_id', arenaId)
            .select()
            .single()

        if (error) throw new Error(error.message)

        if (sportIds) {
            await supabase.from('court_sports').delete().eq('court_id', courtId)
            if (sportIds.length > 0) {
                await supabase.from('court_sports').insert(sportIds.map(id => ({ court_id: courtId, sport_id: id })))
            }
        }

        revalidatePath(`/dashboard/arenas/${arenaId}`)
        return { success: true, data: court }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar espaço'
        return { success: false, error: message, data: null }
    }
}
