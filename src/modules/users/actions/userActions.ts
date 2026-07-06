"use server";

import {
    fetchArenaUserLink,
    fetchArenaUsersForArena,
    getArenaUsersStationColumnErrorMessage,
    isArenaUsersStationColumnMissingError
} from "@/lib/arena-users";
import { assertArenaBackofficeAccess, assertStationAccess } from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { ensureExperimentalSubscription } from "@/modules/payments/usecases/ensure-experimental-subscription.usecase";
import { getLocationPointFromAddress } from "@/lib/geocoding";
import type { Database } from "@/types/supabase.types";
import { onlyDigits } from "@/lib/brasil-document";
import { findUserByEmail, normalizeEmail } from "@/lib/account-identity";

type OwnerArenaAddressData = {
    cep?: string;
    state?: string;
    city?: string;
    id_municipio?: number;
    neighborhood?: string;
    street?: string;
    number?: string;
    complement?: string;
}

type ArenaInsert = Database['public']['Tables']['arenas']['Insert'];

function normalizeOwnerArenaAddressData(value: unknown): OwnerArenaAddressData | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const input = value as Record<string, unknown>;

    return {
        cep: typeof input.cep === 'string' ? input.cep : undefined,
        state: typeof input.state === 'string' ? input.state : undefined,
        city: typeof input.city === 'string' ? input.city : undefined,
        id_municipio: typeof input.id_municipio === 'number' ? input.id_municipio : undefined,
        neighborhood: typeof input.neighborhood === 'string' ? input.neighborhood : undefined,
        street: typeof input.street === 'string' ? input.street : undefined,
        number: typeof input.number === 'string' ? input.number : undefined,
        complement: typeof input.complement === 'string' ? input.complement : undefined,
    };
}

async function ensureOwnerArenaUserLink(supabase: ReturnType<typeof getSupabaseAdmin>, arenaId: string, ownerId: string) {
    const { data: existingLink } = await supabase
        .from('arena_users')
        .select('id')
        .eq('arena_id', arenaId)
        .eq('user_id', ownerId)
        .maybeSingle();

    if (existingLink) return;

    const { error: arenaUserError } = await supabase.from('arena_users').insert({
        arena_id: arenaId,
        user_id: ownerId,
        role: 'Gestor',
        status: 'Ativo',
    });
    if (arenaUserError && arenaUserError.code !== '23505') {
        throw new Error(`Erro ao vincular usuário: ${arenaUserError.message}`);
    }
}

// Cria arena + vínculo arena_user (role Gestor) para um owner já existente em public.users.
// Idempotente: se a arena já existir, garante ao menos o vínculo em arena_users.
export async function provisionOwnerArena(
    ownerId: string,
    arenaName: string,
    phone?: string,
    addressData?: unknown,
    arenaDocument?: string,
) {
    const supabase = getSupabaseAdmin();
    const arenaAddress = normalizeOwnerArenaAddressData(addressData);

    const { data: existingArena } = await supabase
        .from('arenas').select('id').eq('owner_id', ownerId).eq('name', arenaName).maybeSingle();

    if (existingArena) {
        await ensureOwnerArenaUserLink(supabase, existingArena.id, ownerId);
        await ensureExperimentalSubscription({ arenaId: existingArena.id, actorId: ownerId });
        return;
    }

    const cleanArenaDocument = onlyDigits(arenaDocument);
    const arenaInsertData: ArenaInsert = {
        name: arenaName,
        owner_id: ownerId,
        status: 'ativo',
        ...(phone && { phone }),
        ...(cleanArenaDocument && { cpf_cnpj: cleanArenaDocument }),
    };

    if (arenaAddress) {
        arenaInsertData.zip_code = arenaAddress.cep || undefined;
        arenaInsertData.id_municipio = arenaAddress.id_municipio || undefined;
        arenaInsertData.number = arenaAddress.number || undefined;
        arenaInsertData.complement = arenaAddress.complement || undefined;
        arenaInsertData.neighborhood = arenaAddress.neighborhood || undefined;
        arenaInsertData.address = arenaAddress.street || undefined;

        if (arenaAddress.street && arenaAddress.city && arenaAddress.state) {
            const locationPoint = await getLocationPointFromAddress({
                street: arenaAddress.street, number: arenaAddress.number || '',
                neighborhood: arenaAddress.neighborhood || '', city: arenaAddress.city, state: arenaAddress.state
            });
            if (locationPoint) arenaInsertData.location = locationPoint;
        }
    }

    const { data: newArena, error: arenaError } = await supabase
        .from('arenas').insert(arenaInsertData).select().single();

    if (arenaError && arenaError.code !== '23505') throw new Error(`Erro ao criar arena: ${arenaError.message}`);

    if (newArena) {
        await ensureOwnerArenaUserLink(supabase, newArena.id, ownerId);
        await ensureExperimentalSubscription({ arenaId: newArena.id, actorId: ownerId });
    }
}

type ArenaUserFormData = {
    email: string;
    login?: string;
    name: string;
    password?: string;
    role: string;
    stationId?: string | null;
    senha?: string;
    status: string;
};

type ArenaUserListItem = {
    arenaUserId: string;
    email: string;
    id: string;
    name: string;
    role: string;
    stationId: string | null;
    status: string;
};

type ActionResult<T = undefined> =
    | { success: true; data?: T; user?: T }
    | { success: false; error: string };

type ArenaUserQueryRow = {
    id: string;
    role: string;
    station_id: string | null;
    status: string;
    created_at: string;
    user_id: string;
    users: {
        id: string;
        name: string | null;
        email: string;
    } | null;
};

type ArenaUserLinkRow = {
    id: string;
    arena_id: string;
    station_id: string | null;
    user_id: string;
};

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Erro desconhecido";
}

async function getArenaUserLinkOrThrow(arenaId: string, arenaUserId: string): Promise<ArenaUserLinkRow> {
    const { data, error } = await fetchArenaUserLink(getSupabaseAdmin(), arenaId, arenaUserId);

    if (error) {
        throw new Error(`Erro ao carregar vínculo do usuário: ${error.message}`);
    }

    return data as ArenaUserLinkRow;
}

export async function createArenaUserAction(arenaId: string, data: ArenaUserFormData): Promise<ActionResult<{ email: string; id: string; name: string | null; role: string | null }>> {
    let createdAuthUserId: string | null = null;

    try {
        await assertArenaBackofficeAccess(arenaId);

        if (data.role === 'Caixa' && !data.stationId) {
            throw new Error('Selecione a estação vinculada ao caixa.');
        }
        if (data.role === 'Caixa' && data.stationId) {
            await assertStationAccess(data.stationId, arenaId);
        }

        const supabase = getSupabaseAdmin();
        const email = normalizeEmail(data.email);
        if (!email) {
            throw new Error('E-mail é obrigatório.');
        }

        let newUser = await findUserByEmail(supabase, email);

        if (!newUser) {
            const password = data.senha || data.password;
            if (!password) {
                throw new Error('Senha é obrigatória para criar um novo usuário.');
            }

            // 1. Criar usuário no Supabase Auth (auto-confirmado, criado por admin)
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { firstName: data.name },
            });

            if (authError || !authData.user) {
                throw new Error(`Erro ao criar usuário no Auth: ${authError?.message ?? 'desconhecido'}`);
            }
            createdAuthUserId = authData.user.id;

            // 2. Trigger on_auth_user_created cria public.users automaticamente.
            //    Upsert defensivo para garantir nome correto.
            const { data: createdUser, error: userError } = await supabase
                .from('users')
                .upsert({
                    id: createdAuthUserId,
                    auth_user_id: createdAuthUserId,
                    email,
                    name: data.name,
                    role: 'gestor',
                } as never, { onConflict: 'id' })
                .select('id, email, name, cpf, role')
                .single();

            if (userError) {
                console.error("Supabase user error:", userError);
                throw new Error(`Erro ao criar usuário local: ${userError.message}`);
            }
            newUser = createdUser;
        } else if (data.name && !newUser.name) {
            const { data: updatedUser, error: updateUserError } = await supabase
                .from('users')
                .update({ name: data.name })
                .eq('id', newUser.id)
                .select('id, email, name, cpf, role')
                .single();
            if (updateUserError) throw updateUserError;
            newUser = updatedUser;
        }

        if (!newUser) {
            throw new Error('Não foi possível resolver o usuário da arena.');
        }

        // 3. Insert/update arena_users table
        const arenaUserPayload = {
            arena_id: arenaId,
            user_id: newUser.id,
            role: data.role,
            station_id: data.role === 'Caixa' ? data.stationId ?? null : null,
            status: data.status,
        };

        let { error: arenaUserError } = await supabase
            .from('arena_users')
            .upsert(arenaUserPayload, { onConflict: 'arena_id,user_id' });

        if (isArenaUsersStationColumnMissingError(arenaUserError)) {
            if (data.role === 'Caixa') {
                throw new Error(getArenaUsersStationColumnErrorMessage());
            }

            ({ error: arenaUserError } = await supabase
                .from('arena_users')
                .upsert({
                    arena_id: arenaId,
                    user_id: newUser.id,
                    role: data.role,
                    status: data.status,
                }, { onConflict: 'arena_id,user_id' }));
        }

        if (arenaUserError) {
            console.error("Supabase arena user error:", arenaUserError);
            throw new Error(`Erro ao vincular usuário à arena: ${arenaUserError.message}`);
        }

        return { success: true, user: newUser };
    } catch (error: unknown) {
        if (createdAuthUserId) {
            const supabase = getSupabaseAdmin();
            await supabase.from('users').delete().eq('id', createdAuthUserId);
            await supabase.auth.admin.deleteUser(createdAuthUserId).catch(() => null);
        }
        console.error("Error creating arena user:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function updateArenaUserAction(arenaId: string, arenaUserId: string, userId: string, data: ArenaUserFormData): Promise<ActionResult> {
    try {
        await assertArenaBackofficeAccess(arenaId);

        if (data.role === 'Caixa' && !data.stationId) {
            throw new Error('Selecione a estação vinculada ao caixa.');
        }
        if (data.role === 'Caixa' && data.stationId) {
            await assertStationAccess(data.stationId, arenaId);
        }

        const supabase = getSupabaseAdmin();
        const arenaUser = await getArenaUserLinkOrThrow(arenaId, arenaUserId);
        if (arenaUser.user_id !== userId) {
            throw new Error('Vínculo do usuário não corresponde à arena informada');
        }

        // Atualizar senha no Supabase Auth.
        if (data.senha) {
            const { error: pwError } = await supabase.auth.admin.updateUserById(userId, {
                password: data.senha,
            });
            if (pwError) {
                throw new Error(`Erro ao atualizar senha: ${pwError.message}`);
            }
        }

        // Atualizar nome em public.users
        if (data.name) {
            await supabase
                .from('users')
                .update({ name: data.name })
                .eq('id', userId);
        }

        // Update arena_users table
        let { error: arenaUserError } = await supabase
            .from('arena_users')
            .update({
                role: data.role,
                station_id: data.role === 'Caixa' ? data.stationId ?? null : null,
                status: data.status,
            })
            .eq('id', arenaUserId)
            .eq('arena_id', arenaId)
            .eq('user_id', userId);

        if (isArenaUsersStationColumnMissingError(arenaUserError)) {
            if (data.role === 'Caixa') {
                throw new Error(getArenaUsersStationColumnErrorMessage());
            }

            ({ error: arenaUserError } = await supabase
                .from('arena_users')
                .update({
                    role: data.role,
                    status: data.status,
                })
                .eq('id', arenaUserId)
                .eq('arena_id', arenaId)
                .eq('user_id', userId));
        }

        if (arenaUserError) {
            throw new Error(`Erro ao atualizar vínculo: ${arenaUserError.message}`);
        }

        return { success: true };
    } catch (error: unknown) {
        console.error("Error updating arena user:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function deleteArenaUserAction(arenaId: string, arenaUserId: string, userId: string): Promise<ActionResult> {
    try {
        await assertArenaBackofficeAccess(arenaId);

        const supabase = getSupabaseAdmin();
        const arenaUser = await getArenaUserLinkOrThrow(arenaId, arenaUserId);
        if (arenaUser.user_id !== userId) {
            throw new Error('Vínculo do usuário não corresponde à arena informada');
        }

        // 1. Delete from arena_users
        const { error: arenaUserError } = await supabase
            .from('arena_users')
            .delete()
            .eq('id', arenaUserId)
            .eq('arena_id', arenaId)
            .eq('user_id', userId);

        if (arenaUserError) {
            throw new Error(`Erro ao desvincular usuário: ${arenaUserError.message}`);
        }

        // 2. Se for o último vínculo e a pessoa não existir em outro papel,
        // deletar de users/auth. Contas com perfil atleta ou arenas próprias
        // precisam continuar vivas.
        const { count: remainingLinks, error: remainingLinksError } = await supabase
            .from('arena_users')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (remainingLinksError) {
            throw new Error(`Erro ao verificar vínculos restantes do usuário: ${remainingLinksError.message}`);
        }

        const [{ count: ownedArenas }, { data: athleteProfile }] = await Promise.all([
            supabase
                .from('arenas')
                .select('id', { count: 'exact', head: true })
                .eq('owner_id', userId),
            supabase
                .from('atleta')
                .select('id')
                .eq('id_users', userId)
                .maybeSingle(),
        ]);

        if ((remainingLinks ?? 0) === 0 && (ownedArenas ?? 0) === 0 && !athleteProfile) {
            await supabase.from('users').delete().eq('id', userId);
            await supabase.auth.admin.deleteUser(userId).catch(e => console.error("Error deleting auth user", e));
        }

        return { success: true };
    } catch (error: unknown) {
        console.error("Error deleting arena user:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getArenaUsersAction(arenaId: string): Promise<ActionResult<ArenaUserListItem[]>> {
    try {
        await assertArenaBackofficeAccess(arenaId);

        const supabase = getSupabaseAdmin();
        const { data, error } = await fetchArenaUsersForArena(supabase, arenaId);

        if (error) {
            throw new Error(error.message);
        }

        // Transform data to flat format for easy table rendering
        const formattedData = ((data ?? []) as unknown as ArenaUserQueryRow[])
            .filter((item) => item.users !== null)
            .map((item) => {
                const linkedUser = item.users!;
                return {
                    arenaUserId: item.id,
                    id: linkedUser.id,
                    name: linkedUser.name ?? '',
                    email: linkedUser.email,
                    role: item.role,
                    stationId: item.station_id,
                    status: item.status,
                };
            });

        return { success: true, data: formattedData };
    } catch (error: unknown) {
        console.error("Error fetching arena users:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}
