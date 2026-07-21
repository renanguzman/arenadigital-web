"use server"

import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireAuthenticatedDbUser, assertArenaBackofficeAccess, assertProductAccess } from '@/lib/server-auth'
import {
    computeAdjustedPrice,
    type PriceAdjustmentType,
    type PriceHistoryEntry,
    type PriceRoundingMode,
} from '@/modules/products/types/product.types'
import { revalidatePath } from 'next/cache'

export async function getPriceHistoryByProductAction(productId: string) {
    try {
        const arenaId = await assertProductAccess(productId)
        const { data, error } = await getSupabaseAdmin()
            .from('product_price_history')
            .select('*, user:users!product_price_history_changed_by_fkey(name)')
            .eq('product_id', productId)
            .eq('arena_id', arenaId)
            .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)
        return { success: true, data: (data ?? []) as PriceHistoryEntry[] }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar histórico de preços'
        return { success: false, error: message, data: [] as PriceHistoryEntry[] }
    }
}

export interface BulkAdjustInput {
    category_id: string
    adjustment_type: PriceAdjustmentType
    amount: number
    rounding: PriceRoundingMode
    include_inactive: boolean
    reason?: string
}

export async function bulkAdjustPricesAction(arenaId: string, input: BulkAdjustInput) {
    try {
        await assertArenaBackofficeAccess(arenaId)
        const { dbUserId } = await requireAuthenticatedDbUser()

        if (!Number.isFinite(input.amount) || input.amount === 0) {
            throw new Error('Informe um valor de reajuste diferente de zero')
        }
        if (input.adjustment_type === 'percent' && input.amount <= -100) {
            throw new Error('Reajuste percentual deve ser maior que -100%')
        }

        const supabase = getSupabaseAdmin()
        let query = supabase
            .from('products')
            .select('id, name, price, status')
            .eq('arena_id', arenaId)
            .eq('category_id', input.category_id)
        if (!input.include_inactive) {
            query = query.eq('status', 'Ativo')
        }

        const { data: products, error: productsError } = await query
        if (productsError) throw new Error(productsError.message)
        if (!products || products.length === 0) {
            throw new Error('Nenhum item encontrado para esta categoria com os filtros escolhidos')
        }

        const batchId = randomUUID()
        const now = new Date().toISOString()
        const changes = products
            .map((p) => ({
                ...p,
                newPrice: computeAdjustedPrice(p.price, input.adjustment_type, input.amount, input.rounding),
            }))
            .filter((p) => p.newPrice !== p.price)

        if (changes.length === 0) {
            throw new Error('O reajuste não altera nenhum preço com o arredondamento escolhido')
        }

        const applied: Array<{ id: string; oldPrice: number }> = []
        try {
            for (const change of changes) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ price: change.newPrice, updated_at: now, updated_by: dbUserId })
                    .eq('id', change.id)
                    .eq('arena_id', arenaId)
                if (updateError) throw new Error(updateError.message)
                applied.push({ id: change.id, oldPrice: change.price })
            }

            const { error: historyError } = await supabase.from('product_price_history').insert(
                changes.map((change) => ({
                    product_id: change.id,
                    arena_id: arenaId,
                    old_price: change.price,
                    new_price: change.newPrice,
                    change_type: 'bulk',
                    adjustment_percent: input.adjustment_type === 'percent' ? input.amount : null,
                    batch_id: batchId,
                    reason: input.reason?.trim() || null,
                    changed_by: dbUserId,
                }))
            )
            if (historyError) throw new Error(historyError.message)
        } catch (err) {
            for (const restore of [...applied].reverse()) {
                await supabase
                    .from('products')
                    .update({ price: restore.oldPrice, updated_at: now })
                    .eq('id', restore.id)
                    .eq('arena_id', arenaId)
            }
            await supabase.from('product_price_history').delete().eq('batch_id', batchId)
            throw err
        }

        revalidatePath(`/dashboard/settings/products/${arenaId}`)
        return { success: true, data: { batchId, adjustedCount: changes.length } }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao aplicar reajuste de preços'
        return { success: false, error: message, data: null }
    }
}
