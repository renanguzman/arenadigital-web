"use server"

import { getSupabaseAdmin } from "@/lib/supabase-server"
import { assertBookingAccess } from "@/lib/server-auth"
import { revalidatePath } from "next/cache"

export type BookingServiceLineDTO = {
    id: string
    booking_id: string
    product_id: string
    quantity: number
    unit_price: number
    products?: { id: string; name: string } | null
}

function revalidateArenaCalendar(arenaId: string) {
    revalidatePath(`/dashboard/arenas/${arenaId}`)
    revalidatePath(`/dashboard/arenas/${arenaId}/courts`)
    revalidatePath(`/dashboard/finance/${arenaId}`)
}

export async function getBookingServicesAction(
    arenaId: string,
    bookingId: string
): Promise<{ success: boolean; data?: BookingServiceLineDTO[]; error?: string }> {
    try {
        await assertBookingAccess(bookingId, arenaId)
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from("booking_services")
            .select("id, booking_id, product_id, quantity, unit_price, products(id, name)")
            .eq("booking_id", bookingId)
            .order("created_at", { ascending: true })

        if (error) throw new Error(error.message)
        return { success: true, data: (data ?? []) as unknown as BookingServiceLineDTO[] }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar serviços da reserva"
        return { success: false, error: message }
    }
}

export async function replaceBookingServicesAction(
    arenaId: string,
    bookingId: string,
    lines: { product_id: string; quantity: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertBookingAccess(bookingId, arenaId)
        const supabase = getSupabaseAdmin()

        const { error: delErr } = await supabase.from("booking_services").delete().eq("booking_id", bookingId)
        if (delErr) throw new Error(delErr.message)

        if (lines.length === 0) {
            revalidateArenaCalendar(arenaId)
            return { success: true }
        }

        const ids = [...new Set(lines.map((l) => l.product_id))]
        const { data: products, error: pErr } = await supabase
            .from("products")
            .select("id, price, arena_id, catalog_kind")
            .in("id", ids)
            .eq("arena_id", arenaId)

        if (pErr) throw new Error(pErr.message)
        if (!products || products.length !== ids.length) {
            throw new Error("Um ou mais serviços não foram encontrados nesta arena")
        }
        for (const p of products) {
            if ((p as { catalog_kind: string }).catalog_kind !== "service") {
                throw new Error("Apenas itens do tipo serviço podem ser vinculados à reserva")
            }
        }

        const rows = lines.map((l) => {
            const p = products.find((x) => x.id === l.product_id)!
            return {
                booking_id: bookingId,
                product_id: l.product_id,
                quantity: l.quantity,
                unit_price: Number(p.price),
            }
        })

        const { error: insErr } = await supabase.from("booking_services").insert(rows)
        if (insErr) throw new Error(insErr.message)

        revalidateArenaCalendar(arenaId)
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao salvar serviços da reserva"
        return { success: false, error: message }
    }
}

export async function updateBookingTotalPriceAction(
    arenaId: string,
    bookingId: string,
    price: number
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertBookingAccess(bookingId, arenaId)
        const supabase = getSupabaseAdmin()
        const { error } = await supabase.from("bookings").update({ price }).eq("id", bookingId)
        if (error) throw new Error(error.message)
        revalidateArenaCalendar(arenaId)
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao atualizar valor da reserva"
        return { success: false, error: message }
    }
}

/** Substitui linhas de serviço e atualiza o preço total da reserva (locação + serviços). */
export async function syncBookingServicesAndTotalAction(
    arenaId: string,
    bookingId: string,
    lines: { product_id: string; quantity: number }[],
    totalPrice: number
): Promise<{ success: boolean; error?: string }> {
    const rep = await replaceBookingServicesAction(arenaId, bookingId, lines)
    if (!rep.success) return rep
    return await updateBookingTotalPriceAction(arenaId, bookingId, totalPrice)
}
