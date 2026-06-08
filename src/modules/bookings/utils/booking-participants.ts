import type { Booking } from '@/modules/bookings/types/booking.types'

type ParticipantEmbed = {
    atleta_id: string
    funcao?: string | null
    atleta?: { nome_perfil: string } | { nome_perfil: string }[] | null
}

function participantName(p: ParticipantEmbed): string | null {
    const atleta = Array.isArray(p.atleta) ? p.atleta[0] : p.atleta
    return atleta?.nome_perfil ?? null
}

/** Nomes para exibição no calendário/detalhes (participantes ou responsável legado). */
export function getBookingParticipantNames(booking: Booking | null | undefined): string[] {
    if (!booking) return []

    const raw = (booking as Booking & { booking_participants?: ParticipantEmbed[] }).booking_participants
    if (raw?.length) {
        const names = raw
            .map(participantName)
            .filter((n): n is string => Boolean(n))
        if (names.length > 0) return Array.from(new Set(names))
    }

    if (booking.athlete_name) return [booking.athlete_name]
    if (booking.atleta?.nome_perfil) return [booking.atleta.nome_perfil]
    return []
}

export function formatBookingParticipantLabel(booking: Booking | null | undefined): string {
    const names = getBookingParticipantNames(booking)
    if (names.length === 0) return '—'
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}
