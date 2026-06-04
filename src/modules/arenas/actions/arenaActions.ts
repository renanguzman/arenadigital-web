"use server"

import { revalidatePath } from 'next/cache'
import { getLocationPointFromAddress } from '@/lib/geocoding'
import { assertArenaBackofficeAccess, requireAuthenticatedDbUser } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { SupabaseArenaRepository } from '@/modules/arenas/repositories/SupabaseArenaRepository'
import type { CreateArenaDTO, UpdateArenaDTO } from '@/modules/arenas/types/arena.types'

// Resolve a coordenada (WKT POINT) da arena no servidor a partir do endereço.
// Tenta geocodificar o endereço completo via Nominatim e, se falhar, usa o
// centroide do município (lat/lng já disponíveis na tabela `municipios`).
// Geocodificar no servidor evita o erro "Failed to fetch" do navegador, já que
// o Nominatim bloqueia chamadas client-side.
async function resolveArenaLocation(
    input: Partial<CreateArenaDTO>
): Promise<string | null> {
    const street = typeof input.address === 'string' ? input.address : null
    const idMunicipio = input.id_municipio
    if (!idMunicipio) return null

    const supabase = getSupabaseAdmin()
    const { data: municipio } = await supabase
        .from('municipios')
        .select('nome, codigo_uf, latitude, longitude')
        .eq('codigo_ibge', idMunicipio)
        .maybeSingle()
    if (!municipio) return null

    const { data: estado } = await supabase
        .from('estados')
        .select('uf')
        .eq('codigo_uf', municipio.codigo_uf)
        .maybeSingle()

    if (street && estado?.uf) {
        const point = await getLocationPointFromAddress({
            street,
            number: typeof input.number === 'string' ? input.number : '',
            neighborhood: typeof input.neighborhood === 'string' ? input.neighborhood : '',
            city: municipio.nome,
            state: estado.uf,
        })
        if (point) return point
    }

    if (municipio.latitude != null && municipio.longitude != null) {
        return `POINT(${municipio.longitude} ${municipio.latitude})`
    }
    return null
}

export async function deleteArenaAction(arenaId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const supabase = getSupabaseAdmin()
        const { error } = await supabase.from('arenas').delete().eq('id', arenaId)
        if (error) throw new Error(error.message)
        revalidatePath('/dashboard/settings/arenas')
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao excluir arena'
        console.error('[deleteArenaAction]', message)
        return { success: false, error: message }
    }
}

export async function getArenaByIdAction(arenaId: string) {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const arena = await new SupabaseArenaRepository(getSupabaseAdmin()).findById(arenaId)
        return { success: true, data: arena }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar arena'
        return { success: false, error: message, data: null }
    }
}

export async function createArenaAction(input: CreateArenaDTO) {
    try {
        const { dbUserId } = await requireAuthenticatedDbUser()
        const location = input.location ?? (await resolveArenaLocation(input)) ?? undefined
        const arena = await new SupabaseArenaRepository(getSupabaseAdmin()).create({
            ...input,
            ...(location ? { location: location as CreateArenaDTO['location'] } : {}),
            owner_id: dbUserId,
        })
        revalidatePath('/dashboard/settings/arenas')
        return { success: true, data: arena }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar arena'
        return { success: false, error: message, data: null }
    }
}

export async function getComodidadesAction() {
    try {
        const { data, error } = await getSupabaseAdmin().from('comodidades').select('*').order('name')
        if (error) throw new Error(error.message)
        return { success: true, data: data ?? [] }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar comodidades'
        return { success: false, error: message, data: [] }
    }
}

export async function getEstadosAction() {
    try {
        const { data, error } = await getSupabaseAdmin().from('estados').select('*').order('nome')
        if (error) throw new Error(error.message)
        return { success: true, data: data ?? [] }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar estados'
        return { success: false, error: message, data: [] }
    }
}

export async function getMunicipiosByEstadoAction(codigoUf: number) {
    try {
        const { data, error } = await getSupabaseAdmin()
            .from('municipios').select('*').eq('codigo_uf', codigoUf).order('nome')
        if (error) throw new Error(error.message)
        return { success: true, data: data ?? [] }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar municípios'
        return { success: false, error: message, data: [] }
    }
}

export async function getMunicipioByIbgeAction(codigoIbge: number) {
    try {
        const { data, error } = await getSupabaseAdmin()
            .from('municipios').select('*').eq('codigo_ibge', codigoIbge).single()
        if (error) throw new Error(error.message)
        return { success: true, data }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar município'
        return { success: false, error: message, data: null }
    }
}

export async function updateArenaAction(arenaId: string, input: UpdateArenaDTO) {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const location = input.location ?? (await resolveArenaLocation(input)) ?? undefined
        const arena = await new SupabaseArenaRepository(getSupabaseAdmin()).update(arenaId, {
            ...input,
            ...(location ? { location: location as UpdateArenaDTO['location'] } : {}),
        })
        revalidatePath(`/dashboard/arenas/${arenaId}/edit`)
        revalidatePath('/dashboard/settings/arenas')
        return { success: true, data: arena }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar arena'
        return { success: false, error: message, data: null }
    }
}
