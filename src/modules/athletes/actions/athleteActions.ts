"use server"

import { SupabaseAthleteRepository } from '@/modules/athletes/repositories/SupabaseAthleteRepository'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { assertArenaBackofficeAccess, requireAuthenticatedDbUser } from '@/lib/server-auth'
import {
    linkAthleteSchema,
    linkExistingAthleteSchema,
    lookupAthleteByCpfSchema,
} from '@/modules/athletes/schemas/athlete.schema'
import { onlyDigits } from '@/lib/brasil-document'
import {
    cpfMatches,
    findUserByCpf,
    findUserByEmail,
    normalizeEmail,
} from '@/lib/account-identity'

type MunicipioSearchRow = {
    codigo_ibge: number;
    nome: string;
    estados: { uf: string } | { uf: string }[] | null;
}

type AthleteLookupRow = {
    id: string;
    nome_perfil: string;
    cpf: string | null;
    telefone: string | null;
    id_users: string;
    users: { email: string; name: string | null } | { email: string; name: string | null }[] | null;
    arenas_atleta: { id_arena: string }[] | null;
    atleta_esportes: { sport: { name: string } | { name: string }[] | null }[] | null;
}

function formatCpf(digits: string) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

// Redirect usado apenas no convite por email do atleta, atualmente desativado.
// function getAthleteInviteRedirectTo() {
//     return (
//         process.env.NEXT_PUBLIC_ATHLETE_APP_PASSWORD_REDIRECT_URL ||
//         process.env.NEXT_PUBLIC_APP_PASSWORD_REDIRECT_URL ||
//         'arenadigital://set-password'
//     )
// }

function normalizeLookupRow(row: AthleteLookupRow, arenaId: string) {
    const user = Array.isArray(row.users) ? row.users[0] : row.users
    const firstSport = row.atleta_esportes?.[0]?.sport
    const sport = Array.isArray(firstSport) ? firstSport[0]?.name : firstSport?.name

    return {
        id: row.id,
        name: row.nome_perfil,
        cpf: row.cpf ?? '',
        phone: row.telefone ?? '',
        email: user?.email ?? '',
        sport: sport ?? null,
        alreadyLinked: (row.arenas_atleta ?? []).some((link) => link.id_arena === arenaId),
    }
}

async function findAthleteByCpf(supabase: ReturnType<typeof getSupabaseAdmin>, cpf: string, arenaId: string) {
    const digits = onlyDigits(cpf)
    const variants = Array.from(new Set([digits, formatCpf(digits)]))

    const { data, error } = await supabase
        .from('atleta')
        .select(`
            id,
            nome_perfil,
            cpf,
            telefone,
            id_users,
            users:id_users(email, name),
            arenas_atleta(id_arena),
            atleta_esportes(sport:id_esporte(name))
        `)
        .in('cpf', variants)
        .maybeSingle()

    if (error) throw error
    return data ? normalizeLookupRow(data as unknown as AthleteLookupRow, arenaId) : null
}

export async function lookupAthleteByCpfAction(formData: {
    cpf: string;
    arenaId: string;
}) {
    const parsed = lookupAthleteByCpfSchema.safeParse(formData)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
    }

    try {
        await assertArenaBackofficeAccess(parsed.data.arenaId)
        const supabase = getSupabaseAdmin()
        const athlete = await findAthleteByCpf(supabase, parsed.data.cpf, parsed.data.arenaId)
        return { success: true, data: athlete }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erro ao buscar atleta."
        return { success: false, error: message }
    }
}

export async function linkExistingAthleteToArenaAction(formData: {
    athleteId: string;
    arenaId: string;
}) {
    const parsed = linkExistingAthleteSchema.safeParse(formData)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
    }

    try {
        await requireAuthenticatedDbUser()
        await assertArenaBackofficeAccess(parsed.data.arenaId)

        const repo = new SupabaseAthleteRepository(getSupabaseAdmin())
        await repo.linkToArena({
            id_arena: parsed.data.arenaId,
            id_atleta: parsed.data.athleteId,
            origem: 'arena'
        })

        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erro ao vincular atleta."
        if (message.includes('duplicate key')) return { success: true }
        return { success: false, error: message }
    }
}

export async function linkAthlete(formData: {
    name: string;
    cpf: string;
    phone: string;
    email: string;
    sportId: string;
    arenaId: string;
    nivelHabilidadeId?: string;
    birthDate?: string;
    cep?: string;
    endereco?: string;
    enderecoNumero?: string;
    bairro?: string;
    idMunicipio?: number;
}) {
    const parsed = linkAthleteSchema.safeParse(formData)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
    }

    try {
        await requireAuthenticatedDbUser()
        await assertArenaBackofficeAccess(formData.arenaId)

        const supabase = getSupabaseAdmin()
        const cleanCpf = onlyDigits(parsed.data.cpf)
        const email = normalizeEmail(formData.email)

        const existingAthlete = await findAthleteByCpf(supabase, cleanCpf, formData.arenaId)
        if (existingAthlete) {
            return { success: false, error: "Este CPF já pertence a um atleta cadastrado. Use a opção de vincular atleta existente." }
        }

        // 1. Resolve pessoa existente por e-mail/CPF para não duplicar contas.
        const [userByEmail, userByCpf] = await Promise.all([
            findUserByEmail(supabase, email),
            findUserByCpf(supabase, cleanCpf),
        ])

        if (userByEmail && userByCpf && userByEmail.id !== userByCpf.id) {
            return {
                success: false,
                error: "Este CPF já está vinculado a outro e-mail. Use o e-mail cadastrado para esse CPF.",
            }
        }

        let athleteDbUser = userByEmail ?? userByCpf

        if (athleteDbUser?.cpf && !cpfMatches(athleteDbUser.cpf, cleanCpf)) {
            return {
                success: false,
                error: "Este e-mail já está vinculado a outro CPF.",
            }
        }

        if (athleteDbUser && normalizeEmail(athleteDbUser.email) !== email) {
            return {
                success: false,
                error: "Este CPF já está vinculado a outro e-mail. Use o e-mail cadastrado para esse CPF.",
            }
        }

        // 2. Create User in Supabase Auth without sending the athlete invite email,
        // somente quando ainda não existe pessoa local.
        const firstName = formData.name.split(' ')[0]
        const lastName = formData.name.split(' ').slice(1).join(' ') || undefined

        // Envio de convite por email desativado a pedido.
        // const { data: created, error: createErr } = await supabase.auth.admin.inviteUserByEmail(formData.email, {
        //     redirectTo: getAthleteInviteRedirectTo(),
        //     data: {
        //         firstName,
        //         lastName,
        //         name: formData.name,
        //         role: 'atleta',
        //         origem_cadastro: 'arena',
        //         cpf: cleanCpf,
        //     },
        // })

        if (!athleteDbUser) {
            const { data: created, error: createErr } = await supabase.auth.admin.createUser({
                email,
                email_confirm: true,
                user_metadata: {
                    firstName,
                    lastName,
                    name: formData.name,
                    role: 'atleta',
                    origem_cadastro: 'arena',
                    cpf: cleanCpf,
                },
            })
            if (createErr || !created.user) {
                return { success: false, error: createErr?.message || 'Erro ao criar usuário do atleta.' }
            }

            const { error: metadataErr } = await supabase.auth.admin.updateUserById(created.user.id, {
                email,
                user_metadata: {
                    firstName,
                    lastName,
                    name: formData.name,
                    role: 'atleta',
                    origem_cadastro: 'arena',
                    cpf: cleanCpf,
                },
            })
            if (metadataErr) throw metadataErr

            // 3. Ensure public.users row exists.
            const { data: createdDbUser, error: upsertError } = await supabase
                .from('users')
                .upsert(
                    {
                        id: created.user.id,
                        auth_user_id: created.user.id,
                        email,
                        name: formData.name,
                        role: 'atleta',
                        cpf: cleanCpf,
                    } as never,
                    { onConflict: 'id' }
                )
                .select('id, email, name, cpf, role')
                .single()
            if (upsertError) throw upsertError
            athleteDbUser = createdDbUser
        } else {
            const { data: updatedDbUser, error: updateUserError } = await supabase
                .from('users')
                .update({
                    name: athleteDbUser.name || formData.name,
                    cpf: athleteDbUser.cpf || cleanCpf,
                })
                .eq('id', athleteDbUser.id)
                .select('id, email, name, cpf, role')
                .single()
            if (updateUserError) throw updateUserError
            athleteDbUser = updatedDbUser
        }

        if (!athleteDbUser) {
            throw new Error('Não foi possível resolver o usuário do atleta.')
        }

        // 4. Create Atleta profile
        const repo = new SupabaseAthleteRepository(supabase)
        const atleta = await repo.create({
            id_users: athleteDbUser.id,
            nome_perfil: formData.name,
            cpf: cleanCpf,
            telefone: formData.phone,
            data_nascimento: formData.birthDate || null,
            cep: formData.cep || null,
            endereco: formData.endereco || null,
            endereco_numero: formData.enderecoNumero || null,
            bairro: formData.bairro || null,
            id_municipio: formData.idMunicipio || null,
            origem_cadastro: 'arena',
            id_arena_cadastro: formData.arenaId,
            compartilha_info: true
        });

        // 5. Link to Arena
        await repo.linkToArena({
            id_arena: formData.arenaId,
            id_atleta: atleta.id,
            origem: 'arena'
        });

        // 6. Link to Sport
        await repo.addSport({
            id_atleta: atleta.id,
            id_esporte: formData.sportId,
            id_nivel_habilidade_esporte: formData.nivelHabilidadeId || undefined
        });

        return { success: true };
    } catch (error: unknown) {
        console.error("DEBUG - Full Error in linkAthlete:", error);
        const message = error instanceof Error ? error.message : "Ocorreu um erro inesperado ao vincular o atleta."
        return { success: false, error: message };
    }
}

export async function getAthletesByArenaAction(arenaId: string, searchTerm?: string) {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const repo = new SupabaseAthleteRepository(getSupabaseAdmin())
        const data = await repo.findByArena(arenaId, searchTerm)
        return { success: true, data }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar atletas'
        return { success: false, error: message, data: [] }
    }
}

export async function getSportsAction() {
    try {
        const repo = new SupabaseAthleteRepository(getSupabaseAdmin())
        const data = await repo.getSports()
        return { success: true, data }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar esportes'
        return { success: false, error: message, data: [] }
    }
}

export async function getNiveisHabilidadeAction(sportId: string): Promise<{
    success: boolean;
    data: { id: string; nivel: string }[];
    error?: string;
}> {
    try {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('nivel_habilidade_esporte')
            .select('id, nivel')
            .eq('id_esporte', sportId)
            .order('nivel')
        if (error) throw error
        return { success: true, data: data ?? [] }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar níveis'
        return { success: false, data: [], error: message }
    }
}

export async function searchMunicipiosAction(query: string): Promise<{
    success: boolean;
    data: { codigo_ibge: number; nome: string; uf: string }[];
    error?: string;
}> {
    if (query.length < 2) return { success: true, data: [] }
    try {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('municipios')
            .select('codigo_ibge, nome, estados:codigo_uf(uf)')
            .ilike('nome', `${query}%`)
            .limit(10)
            .order('nome')

        if (error) throw error

        const result = ((data ?? []) as MunicipioSearchRow[]).map((m) => {
            const estado = Array.isArray(m.estados) ? m.estados[0] : m.estados
            return {
            codigo_ibge: m.codigo_ibge,
            nome: m.nome,
                uf: estado?.uf ?? '',
            }
        })

        return { success: true, data: result }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar municípios'
        return { success: false, data: [], error: message }
    }
}
