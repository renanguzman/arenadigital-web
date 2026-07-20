"use server"

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { assertArenaBackofficeAccess, assertBookingAccess, assertCourtAccess, requireAuthenticatedDbUser } from '@/lib/server-auth'
import { SupabaseBookingRepository } from '@/modules/bookings/repositories/SupabaseBookingRepository'
import type { Booking, CreateBookingDTO, UpdateBookingDTO } from '@/modules/bookings/types/booking.types'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

async function createAvulsoTransaction(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    {
        arenaId,
        athleteId,
        athleteName,
        price,
        quantity,
        startTime,
        registeredBy,
        modoPagamentoId,
    }: {
        arenaId: string
        athleteId?: string
        athleteName: string
        price: number
        quantity: number
        startTime: string
        registeredBy: string
        modoPagamentoId?: string | null
    }
) {
    const date = format(new Date(startTime), 'dd/MM/yyyy', { locale: ptBR })
    const description = quantity > 1
        ? `Reserva Avulsa - ${athleteName} - ${quantity} sessões`
        : `Reserva Avulsa - ${athleteName} - ${date}`
    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('transactions').insert({
        arena_id: arenaId,
        atleta_id: athleteId || null,
        type: 'entrada',
        category: 'Reserva Avulsa',
        description,
        unit_value: price,
        quantity,
        total_value: price * quantity,
        discount: 0,
        launch_date: today,
        registration_date: today,
        registered_by: registeredBy,
        modo_pagamento_id: modoPagamentoId ?? null,
    })
    if (error) throw new Error(`Erro ao registrar transação: ${error.message}`)
}

function revalidateBookingFinancePaths(arenaId: string) {
    revalidatePath(`/dashboard/arenas/${arenaId}`)
    revalidatePath(`/dashboard/arenas/${arenaId}/courts`)
    revalidatePath(`/dashboard/finance/${arenaId}`)
    revalidatePath(`/dashboard/reports/${arenaId}/status-pagamentos`)
}

function isBlockingBookingStatus(row: { status: string | null; payment_expires_at?: string | null }): boolean {
    if (row.status === 'confirmed' || row.status === 'reservado') return true
    if (row.status !== 'pending_payment') return false
    if (!row.payment_expires_at) return true
    return new Date(row.payment_expires_at).getTime() > Date.now()
}

async function maybeConfirmSplitBooking(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    bookingId: string
) {
    const { data: booking } = await supabase
        .from('bookings')
        .select('cobranca_por_participante, status')
        .eq('id', bookingId)
        .single()

    if (!booking?.cobranca_por_participante || booking.status !== 'reservado') return

    const { data: parts, error } = await supabase
        .from('booking_participants')
        .select('id, pago_em')
        .eq('booking_id', bookingId)
        .in('funcao', ['responsavel', 'convidado'])

    if (error) throw new Error(error.message)
    if (!parts?.length) return

    const allPaid = parts.every((p) => Boolean(p.pago_em))
    if (!allPaid) return

    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)

    if (updateError) throw new Error(updateError.message)
}

export async function confirmarPagamentoAvulsoAction(
    arenaId: string,
    bookingId: string,
    valorOverride?: number,
    modoPagamentoId?: string | null
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertBookingAccess(bookingId, arenaId)
        const { dbUserId } = await requireAuthenticatedDbUser()
        const supabase = getSupabaseAdmin()

        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('id, arena_id, athlete_id, athlete_name, start_time, price, status, plano_mensalista_id, cobranca_por_participante')
            .eq('id', bookingId)
            .eq('arena_id', arenaId)
            .single()

        if (fetchError || !booking) throw new Error('Reserva não encontrada')
        if (booking.plano_mensalista_id) throw new Error('Esta reserva é de mensalista')
        if (booking.cobranca_por_participante) {
            throw new Error('Esta reserva possui cobrança por participante. Confirme o pagamento de cada pessoa.')
        }
        if (booking.status !== 'reservado') throw new Error('Esta reserva não está aguardando pagamento')

        const valorEfetivo =
            valorOverride !== undefined && valorOverride > 0
                ? valorOverride
                : Number(booking.price ?? 0)

        const { error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed', price: valorEfetivo })
            .eq('id', bookingId)
            .eq('arena_id', arenaId)

        if (updateError) throw new Error(updateError.message)

        if (valorEfetivo > 0) {
            await createAvulsoTransaction(supabase, {
                arenaId,
                athleteId: booking.athlete_id ?? undefined,
                athleteName: booking.athlete_name ?? 'Atleta',
                price: valorEfetivo,
                quantity: 1,
                startTime: booking.start_time,
                registeredBy: dbUserId,
                modoPagamentoId,
            })
        }

        revalidateBookingFinancePaths(arenaId)
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao confirmar pagamento'
        return { success: false, error: message }
    }
}

export async function confirmarPagamentoParticipanteAvulsoAction(
    arenaId: string,
    bookingId: string,
    participantId: string,
    valorOverride?: number,
    modoPagamentoId?: string | null
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertBookingAccess(bookingId, arenaId)
        const { dbUserId } = await requireAuthenticatedDbUser()
        const supabase = getSupabaseAdmin()

        const { data: participant, error: participantError } = await supabase
            .from('booking_participants')
            .select(`
                id,
                atleta_id,
                valor,
                pago_em,
                funcao,
                atleta:atleta_id(id, nome_perfil),
                booking:booking_id(
                    id,
                    arena_id,
                    start_time,
                    price,
                    status,
                    plano_mensalista_id,
                    cobranca_por_participante
                )
            `)
            .eq('id', participantId)
            .eq('booking_id', bookingId)
            .single()

        if (participantError || !participant) {
            throw new Error('Participante não encontrado')
        }

        const booking = Array.isArray(participant.booking)
            ? participant.booking[0]
            : participant.booking

        if (!booking || booking.arena_id !== arenaId) {
            throw new Error('Reserva não encontrada')
        }
        if (booking.plano_mensalista_id) throw new Error('Esta reserva é de mensalista')
        if (!booking.cobranca_por_participante) {
            throw new Error('Esta reserva não possui cobrança separada por participante')
        }
        if (booking.status !== 'reservado') {
            throw new Error('Esta reserva não está aguardando pagamento')
        }
        if (participant.pago_em) {
            throw new Error('Este participante já teve o pagamento confirmado')
        }
        if (participant.funcao !== 'responsavel' && participant.funcao !== 'convidado') {
            throw new Error('Participante inválido para cobrança avulsa')
        }

        const atleta = Array.isArray(participant.atleta)
            ? participant.atleta[0]
            : participant.atleta

        const valorEfetivo =
            valorOverride !== undefined && valorOverride > 0
                ? valorOverride
                : Number(participant.valor ?? booking.price ?? 0)

        const paidAt = new Date().toISOString()
        const { error: updateParticipantError } = await supabase
            .from('booking_participants')
            .update({ pago_em: paidAt, valor: valorEfetivo })
            .eq('id', participantId)
            .eq('booking_id', bookingId)

        if (updateParticipantError) throw new Error(updateParticipantError.message)

        if (valorEfetivo > 0) {
            await createAvulsoTransaction(supabase, {
                arenaId,
                athleteId: participant.atleta_id,
                athleteName: atleta?.nome_perfil ?? 'Atleta',
                price: valorEfetivo,
                quantity: 1,
                startTime: booking.start_time,
                registeredBy: dbUserId,
                modoPagamentoId,
            })
        }

        await maybeConfirmSplitBooking(supabase, bookingId)
        revalidateBookingFinancePaths(arenaId)
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao confirmar pagamento do participante'
        return { success: false, error: message }
    }
}

export interface BookingConflict {
    date: string          // ISO string da reserva conflitante existente
    startTime: string     // "HH:MM" formatado
    endTime: string       // "HH:MM" formatado
    athleteName: string   // nome do atleta que já tem esse horário
    proposedDate: string  // data/hora que o usuário tentou reservar (formatada)
}

type BookingConflictRow = {
    athlete_name: string | null
    start_time: string
    end_time: string
    status: string | null
    payment_expires_at?: string | null
}

/**
 * Verifica conflitos de horário para uma lista de períodos (avulso com recorrência ou mensalista).
 * Retorna todos os conflitos encontrados sem bloquear — a decisão de prosseguir fica no cliente.
 */
export async function checkBookingConflictsAction(
    arenaId: string,
    courtId: string,
    slots: { startTime: string; endTime: string }[],
    excludeBookingId?: string
): Promise<{ success: boolean; conflicts: BookingConflict[]; error?: string }> {
    try {
        await assertCourtAccess(courtId, arenaId)
        const supabase = getSupabaseAdmin()
        const conflicts: BookingConflict[] = []

        for (const slot of slots) {
            let query = supabase
                .from('bookings')
                .select('athlete_name, start_time, end_time, status, payment_expires_at')
                .eq('court_id', courtId)
                .in('status', ['confirmed', 'reservado', 'pending_payment'])
                .lt('start_time', slot.endTime)
                .gt('end_time', slot.startTime)

            if (excludeBookingId) {
                query = query.neq('id', excludeBookingId)
            }

            const { data, error } = await query.limit(50)

            if (error) throw new Error(error.message)

            const existing = ((data ?? []) as unknown as BookingConflictRow[]).find(isBlockingBookingStatus)
            if (existing) {
                conflicts.push({
                    date: existing.start_time,
                    startTime: format(new Date(existing.start_time), 'HH:mm', { locale: ptBR }),
                    endTime: format(new Date(existing.end_time), 'HH:mm', { locale: ptBR }),
                    athleteName: existing.athlete_name ?? 'Atleta',
                    proposedDate: format(new Date(slot.startTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
                })
            }
        }

        return { success: true, conflicts }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao verificar conflitos'
        return { success: false, conflicts: [], error: message }
    }
}


export async function getBookingsByCourtAction(
    arenaId: string,
    courtId: string,
    startDate?: string,
    endDate?: string
): Promise<{ success: boolean; data?: Booking[]; error?: string }> {
    try {
        await assertCourtAccess(courtId, arenaId)
        const repo = new SupabaseBookingRepository(getSupabaseAdmin())
        const data = await repo.findByCourt(courtId, startDate, endDate)
        return { success: true, data }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar reservas'
        return { success: false, error: message }
    }
}

export async function getBookingsByArenaAction(
    arenaId: string,
    startDate?: string,
    endDate?: string
): Promise<{ success: boolean; data?: Booking[]; error?: string }> {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const repo = new SupabaseBookingRepository(getSupabaseAdmin())
        const data = await repo.findByArena(arenaId, startDate, endDate)
        return { success: true, data }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar reservas'
        return { success: false, error: message }
    }
}

export async function getBookingsByArenaWithSportsAction(
    arenaId: string,
    startDate: string,
    endDate: string
): Promise<{ success: boolean; data?: Booking[]; error?: string }> {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const repo = new SupabaseBookingRepository(getSupabaseAdmin())
        const data = await repo.findByArenaWithSports(arenaId, startDate, endDate)
        return { success: true, data }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar reservas'
        return { success: false, error: message }
    }
}

export async function updateBookingStatusAction(
    arenaId: string,
    bookingId: string,
    status: 'confirmed' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertBookingAccess(bookingId, arenaId)
        const supabase = getSupabaseAdmin()

        if (status === 'cancelled') {
            const { data: existing, error: fetchError } = await supabase
                .from('bookings')
                .select('status, plano_mensalista_id')
                .eq('id', bookingId)
                .eq('arena_id', arenaId)
                .single()

            if (fetchError || !existing) throw new Error('Reserva não encontrada')
            if (existing.status === 'confirmed') {
                throw new Error('Não é possível cancelar uma reserva já paga')
            }
            if (existing.plano_mensalista_id) {
                throw new Error('Reservas de mensalista devem ser gerenciadas em Mensalistas')
            }
            if (existing.status === 'cancelled') {
                throw new Error('Esta reserva já está cancelada')
            }
        }

        const repo = new SupabaseBookingRepository(supabase)
        await repo.updateStatus(bookingId, status)
        revalidatePath(`/dashboard/arenas/${arenaId}`)
        revalidatePath(`/dashboard/arenas/${arenaId}/courts`)
        revalidatePath(`/dashboard/finance/${arenaId}`)
        revalidatePath(`/dashboard/reports/${arenaId}/status-pagamentos`)
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar reserva'
        return { success: false, error: message }
    }
}

export async function updateBookingAction(
    arenaId: string,
    bookingId: string,
    input: Pick<UpdateBookingDTO, 'athlete_name' | 'athlete_id' | 'sport_id' | 'start_time' | 'end_time' | 'price' | 'cobranca_por_participante'>
): Promise<{ success: boolean; data?: Booking; error?: string }> {
    try {
        await assertBookingAccess(bookingId, arenaId)
        const supabase = getSupabaseAdmin()
        const repo = new SupabaseBookingRepository(supabase)
        const { data: existing } = await supabase
            .from('bookings')
            .select('court_id, cobranca_por_participante, status')
            .eq('id', bookingId)
            .single()
        if (!existing) throw new Error('Reserva não encontrada')
        const courtId = (existing as { court_id: string }).court_id
        await assertCourtAccess(courtId, arenaId)

        const turningOffSplit =
            existing.cobranca_por_participante &&
            input.cobranca_por_participante === false

        if (turningOffSplit) {
            const { data: paidParts, error: paidError } = await supabase
                .from('booking_participants')
                .select('id')
                .eq('booking_id', bookingId)
                .in('funcao', ['responsavel', 'convidado'])
                .not('pago_em', 'is', null)
                .limit(1)

            if (paidError) throw new Error(paidError.message)
            if (paidParts?.length) {
                throw new Error(
                    'Não é possível desativar cobrança separada após confirmar pagamento de participantes'
                )
            }
        }

        const data = await repo.updateBooking(bookingId, courtId, {
            athlete_name: input.athlete_name ?? null,
            athlete_id: input.athlete_id ?? null,
            sport_id: input.sport_id ?? null,
            start_time: input.start_time as string,
            end_time: input.end_time as string,
            price: input.price ?? null,
            cobranca_por_participante: input.cobranca_por_participante ?? false,
        })

        revalidateBookingFinancePaths(arenaId)
        return { success: true, data }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar reserva'
        return { success: false, error: message }
    }
}

export async function createBookingAction(
    arenaId: string,
    input: CreateBookingDTO
): Promise<{ success: boolean; data?: Booking; error?: string }> {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const { dbUserId } = await requireAuthenticatedDbUser()
        if (input.arena_id !== arenaId) {
            throw new Error('Reserva não pertence à arena informada')
        }
        await assertCourtAccess(input.court_id, arenaId)
        const supabase = getSupabaseAdmin()
        const repo = new SupabaseBookingRepository(supabase)
        const data = await repo.create(input)

        if (input.status === 'confirmed' && (input.price ?? 0) > 0) {
            await createAvulsoTransaction(supabase, {
                arenaId,
                athleteId: input.athlete_id ?? undefined,
                athleteName: input.athlete_name ?? 'Atleta',
                price: input.price as number,
                quantity: 1,
                startTime: input.start_time as string,
                registeredBy: dbUserId,
            })
        }

        revalidatePath(`/dashboard/arenas/${arenaId}`)
        revalidatePath(`/dashboard/arenas/${arenaId}/courts`)
        revalidatePath(`/dashboard/finance/${arenaId}`)
        revalidatePath(`/dashboard/reports/${arenaId}/status-pagamentos`)
        return { success: true, data }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar reserva'
        return { success: false, error: message }
    }
}

export async function createRecurringBookingsAction(
    arenaId: string,
    inputs: CreateBookingDTO[]
): Promise<{ success: boolean; data?: Booking[]; error?: string }> {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const { dbUserId } = await requireAuthenticatedDbUser()
        for (const input of inputs) {
            if (input.arena_id !== arenaId) {
                throw new Error('Reserva não pertence à arena informada')
            }
            await assertCourtAccess(input.court_id, arenaId)
        }
        const supabase = getSupabaseAdmin()
        const repo = new SupabaseBookingRepository(supabase)
        const data = await repo.createMany(inputs)

        const confirmed = inputs.filter(i => i.status === 'confirmed' && (i.price ?? 0) > 0)
        if (confirmed.length > 0) {
            const first = confirmed[0]
            await createAvulsoTransaction(supabase, {
                arenaId,
                athleteId: first.athlete_id ?? undefined,
                athleteName: first.athlete_name ?? 'Atleta',
                price: first.price as number,
                quantity: confirmed.length,
                startTime: first.start_time as string,
                registeredBy: dbUserId,
            })
        }

        revalidatePath(`/dashboard/arenas/${arenaId}`)
        revalidatePath(`/dashboard/arenas/${arenaId}/courts`)
        revalidatePath(`/dashboard/finance/${arenaId}`)
        revalidatePath(`/dashboard/reports/${arenaId}/status-pagamentos`)
        return { success: true, data }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar reservas recorrentes'
        return { success: false, error: message }
    }
}
