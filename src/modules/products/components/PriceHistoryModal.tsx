"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, Receipt, ArrowRight } from "lucide-react"
import { getPriceHistoryByProductAction } from "@/modules/products/actions/priceActions"
import type { PriceHistoryEntry, Product } from "@/modules/products/types/product.types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface PriceHistoryModalProps {
    product: Product
    open: boolean
    onOpenChange: (open: boolean) => void
}

function formatBRL(n: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
}

export function PriceHistoryModal({ product, open, onOpenChange }: PriceHistoryModalProps) {
    const [entries, setEntries] = useState<PriceHistoryEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!open || !product) return
        loadEntries()
        // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega ao abrir/mudar de produto
    }, [open, product])

    const loadEntries = async () => {
        setIsLoading(true)
        try {
            const res = await getPriceHistoryByProductAction(product.id)
            setEntries(res.data)
        } catch (error) {
            console.error("Error loading price history:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl max-h-[85vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-arena-navy-800 to-[#003d5c] p-6 text-white">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-white">
                                    Histórico de Preços
                                </DialogTitle>
                                <DialogDescription className="text-white/60 mt-1">
                                    {product.name} — Preço atual:{" "}
                                    <span className="font-bold text-emerald-300">
                                        {formatBRL(product.price)}
                                    </span>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[55vh] custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-arena-button" />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="p-4 bg-arena-navy-800/5 rounded-full mb-4">
                                <Receipt className="h-8 w-8 text-arena-navy-800/20" />
                            </div>
                            <p className="text-arena-navy-800/40 font-medium">
                                Nenhuma alteração de preço registrada.
                            </p>
                            <p className="text-arena-navy-800/25 text-sm mt-1">
                                Alterações individuais e reajustes em massa aparecerão aqui.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {entries.map((entry) => {
                                const increased = entry.new_price > entry.old_price
                                return (
                                    <div
                                        key={entry.id}
                                        className={cn(
                                            "flex items-start gap-4 p-4 rounded-xl border transition-all",
                                            increased
                                                ? "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200"
                                                : "bg-red-50/50 border-red-100 hover:border-red-200"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div
                                            className={cn(
                                                "p-2 rounded-lg shrink-0 mt-0.5",
                                                increased
                                                    ? "bg-emerald-100 text-emerald-600"
                                                    : "bg-red-100 text-red-600"
                                            )}
                                        >
                                            {increased ? (
                                                <TrendingUp className="h-4 w-4" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-black uppercase tracking-wider border-0 px-2",
                                                        entry.change_type === "bulk"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-slate-100 text-slate-600"
                                                    )}
                                                >
                                                    {entry.change_type === "bulk" ? "Reajuste em massa" : "Alteração manual"}
                                                </Badge>
                                                {entry.adjustment_percent != null && (
                                                    <span className="text-[10px] font-bold text-arena-navy-800/40">
                                                        {entry.adjustment_percent > 0 ? "+" : ""}
                                                        {entry.adjustment_percent}%
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-arena-navy-800/50 line-through">
                                                    {formatBRL(entry.old_price)}
                                                </span>
                                                <ArrowRight className="h-3.5 w-3.5 text-arena-navy-800/30" />
                                                <span
                                                    className={cn(
                                                        "text-lg font-black",
                                                        increased ? "text-emerald-600" : "text-red-600"
                                                    )}
                                                >
                                                    {formatBRL(entry.new_price)}
                                                </span>
                                            </div>

                                            {entry.reason && (
                                                <p className="mt-1 text-xs text-arena-navy-800/50">
                                                    Motivo: {entry.reason}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between mt-2 text-[11px] text-arena-navy-800/30">
                                                <span>
                                                    {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                                        locale: ptBR,
                                                    })}
                                                </span>
                                                {entry.user && (
                                                    <span className="font-medium">por {entry.user.name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
