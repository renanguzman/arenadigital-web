"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type BookingServiceLineLocal = {
    productId: string
    quantity: number
    unitPrice: number
    name: string
}

export type CatalogServiceOption = { id: string; name: string; price: number }

interface BookingServicesSectionProps {
    catalogServices: CatalogServiceOption[]
    lines: BookingServiceLineLocal[]
    onLinesChange: (next: BookingServiceLineLocal[]) => void
    disabled?: boolean
    className?: string
}

export function BookingServicesSection({
    catalogServices,
    lines,
    onLinesChange,
    disabled = false,
    className,
}: BookingServicesSectionProps) {
    const [pickId, setPickId] = useState<string>("")

    const availableToAdd = useMemo(() => {
        return catalogServices.filter((s) => !lines.some((l) => l.productId === s.id))
    }, [catalogServices, lines])

    const addSelected = () => {
        if (!pickId || disabled) return
        const p = catalogServices.find((x) => x.id === pickId)
        if (!p) return
        onLinesChange([
            ...lines,
            {
                productId: p.id,
                quantity: 1,
                unitPrice: p.price,
                name: p.name,
            },
        ])
        setPickId("")
    }

    const updateQty = (productId: string, qty: number) => {
        const q = Math.max(1, Math.floor(qty) || 1)
        onLinesChange(lines.map((l) => (l.productId === productId ? { ...l, quantity: q } : l)))
    }

    const removeLine = (productId: string) => {
        onLinesChange(lines.filter((l) => l.productId !== productId))
    }

    const fmt = (n: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)

    return (
        <div className={cn("space-y-3", className)}>
            <Label className="text-xs font-bold uppercase tracking-wider text-arena-navy-800/40">
                Serviços adicionais
            </Label>
            <p className="text-[11px] font-medium leading-snug text-arena-navy-800/50">
                Inclua cobranças do catálogo (ex.: aluguel de equipamento). O total da reserva soma locação + serviços.
            </p>

            {lines.length > 0 && (
                <ul className="space-y-2 rounded-xl border border-arena-navy-800/10 bg-slate-50/80 p-3">
                    {lines.map((l) => (
                        <li
                            key={l.productId}
                            className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm"
                        >
                            <span className="min-w-0 flex-1 text-sm font-bold text-arena-navy-800">{l.name}</span>
                            <span className="text-xs font-semibold text-arena-navy-800/50">{fmt(l.unitPrice)} un.</span>
                            <div className="flex items-center gap-1.5">
                                <Input
                                    type="number"
                                    min={1}
                                    value={l.quantity}
                                    disabled={disabled}
                                    onChange={(e) => updateQty(l.productId, Number(e.target.value))}
                                    className="h-9 w-14 border-arena-navy-800/10 text-center text-sm font-bold text-arena-navy-800"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={disabled}
                                    className="h-9 w-9 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => removeLine(l.productId)}
                                    aria-label={`Remover ${l.name}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {availableToAdd.length > 0 ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={pickId} onValueChange={setPickId} disabled={disabled}>
                        <SelectTrigger className="h-12 flex-1 border-arena-navy-800/10 font-semibold text-arena-navy-800 focus:ring-arena-button focus:border-arena-button rounded-xl">
                            <SelectValue placeholder="Selecione um serviço…" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-arena-navy-800/10 p-2">
                            {availableToAdd.map((s) => (
                                <SelectItem
                                    key={s.id}
                                    value={s.id}
                                    className="rounded-xl py-2.5 font-semibold text-arena-navy-800"
                                >
                                    {s.name} — {fmt(s.price)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled || !pickId}
                        onClick={addSelected}
                        className="h-12 shrink-0 border-arena-navy-800/20 font-semibold text-arena-navy-800 hover:bg-slate-50 sm:px-6"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Incluir
                    </Button>
                </div>
            ) : catalogServices.length === 0 ? (
                <p className="rounded-xl border border-dashed border-arena-navy-800/15 bg-slate-50 px-3 py-2 text-xs text-arena-navy-800/50">
                    Nenhum serviço cadastrado no catálogo desta arena.
                </p>
            ) : lines.length > 0 ? null : (
                <p className="text-xs text-arena-navy-800/40">Todos os serviços disponíveis já foram incluídos.</p>
            )}
        </div>
    )
}

export function sumBookingServiceLines(lines: BookingServiceLineLocal[]): number {
    return lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0)
}
