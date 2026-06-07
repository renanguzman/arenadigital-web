"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar as CalendarIcon, Clock, Trash2, Loader2, CheckCircle2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { confirmarPagamentoAvulsoAction, updateBookingStatusAction } from "@/modules/bookings/actions/bookingActions"
import { ConfirmarPagamentoDialog } from "@/modules/bookings/components/ConfirmarPagamentoDialog"
import { syncBookingServicesAndTotalAction } from "@/modules/bookings/actions/bookingServiceActions"
import { getProductsByArenaAction } from "@/modules/products/actions/stockActions"
import { isCatalogService, type Product } from "@/modules/products/types/product.types"
import {
    BookingServicesSection,
    sumBookingServiceLines,
    type BookingServiceLineLocal,
} from "@/modules/bookings/components/BookingServicesSection"
import { toast } from "sonner"

interface BookingDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    onEdit?: () => void
    booking: any
    court: any
}

function statusPresentation(status: string | null | undefined) {
    if (status === "confirmed") {
        return { label: "Confirmado", className: "bg-emerald-100 text-emerald-800 border-transparent" }
    }
    if (status === "reservado") {
        return { label: "Pendente pagamento", className: "bg-amber-100 text-amber-900 border-transparent" }
    }
    if (status === "cancelled") {
        return { label: "Cancelado", className: "bg-red-100 text-red-800 border-transparent" }
    }
    return { label: status ?? "—", className: "bg-slate-100 text-slate-700 border-transparent" }
}

export function BookingDetailsModal({ isOpen, onClose, onSuccess, onEdit, booking, court }: BookingDetailsModalProps) {
    const [isCancelling, setIsCancelling] = useState(false)
    const [showConfirmPayment, setShowConfirmPayment] = useState(false)
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
    const [isSavingServices, setIsSavingServices] = useState(false)
    const [courtPortion, setCourtPortion] = useState("")
    const [serviceLines, setServiceLines] = useState<BookingServiceLineLocal[]>([])
    const [catalogServiceProducts, setCatalogServiceProducts] = useState<Product[]>([])
    const [includeServices, setIncludeServices] = useState(false)

    const arenaId = booking?.arena_id as string | undefined

    useEffect(() => {
        if (!isOpen || !booking) return
        const raw = booking.booking_services
        const mapped: BookingServiceLineLocal[] = (raw ?? []).map((s: any) => ({
            productId: s.product_id,
            quantity: s.quantity,
            unitPrice: Number(s.unit_price),
            name: s.products?.name ?? "Serviço",
        }))
        setServiceLines(mapped)
        setIncludeServices(mapped.length > 0)
        const svcSum = mapped.reduce((a, l) => a + l.quantity * l.unitPrice, 0)
        setCourtPortion(String(Math.max(0, (booking.price ?? 0) - svcSum)))
    }, [isOpen, booking?.id, booking?.price, booking?.booking_services])

    useEffect(() => {
        if (!isOpen || !arenaId) return
        getProductsByArenaAction(arenaId).then((r) => {
            if (r.success && r.data) {
                setCatalogServiceProducts((r.data as Product[]).filter((p) => isCatalogService(p)))
            } else {
                setCatalogServiceProducts([])
            }
        })
    }, [isOpen, arenaId])

    const servicesSum = useMemo(() => sumBookingServiceLines(serviceLines), [serviceLines])
    const totalDisplay = (Number(courtPortion) || 0) + servicesSum
    const fmtBrl = (n: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)

    if (!booking || !court) return null

    const startTime = parseISO(booking.start_time)
    const endTime = parseISO(booking.end_time)
    const status = statusPresentation(booking.status)
    const isMensalista = booking.booking_type === "mensalista" || !!booking.plano_mensalista_id
    const canEdit = Boolean(onEdit) && !isMensalista && booking.status !== "cancelled"
    const mensalistaReservadoBlock = isMensalista && booking.status === "reservado"
    const avulsoReservado = !isMensalista && booking.status === "reservado"

    const handleCancel = async () => {
        if (!confirm("Tem certeza que deseja cancelar esta reserva?")) return

        setIsCancelling(true)
        try {
            await updateBookingStatusAction(booking.arena_id, booking.id, "cancelled")
            toast.success("Reserva cancelada com sucesso!")
            onSuccess()
            onClose()
        } catch (error) {
            console.error("Error cancelling booking:", error)
            toast.error("Erro ao cancelar reserva.")
        } finally {
            setIsCancelling(false)
        }
    }

    const handleConfirmarPagamento = async (valor: number) => {
        if (!arenaId) return
        setIsConfirmingPayment(true)
        try {
            const res = await confirmarPagamentoAvulsoAction(arenaId, booking.id, valor)
            if (!res.success) throw new Error(res.error)
            toast.success("Pagamento confirmado!")
            setShowConfirmPayment(false)
            onSuccess()
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao confirmar pagamento")
        } finally {
            setIsConfirmingPayment(false)
        }
    }

    const handleSaveServices = async () => {
        if (!arenaId) return
        const courtAmount = Number(courtPortion)
        if (Number.isNaN(courtAmount) || courtAmount < 0) {
            toast.error("Informe um valor válido para a locação")
            return
        }
        setIsSavingServices(true)
        try {
            const payload = serviceLines.map((l) => ({ product_id: l.productId, quantity: l.quantity }))
            const res = await syncBookingServicesAndTotalAction(
                arenaId,
                booking.id,
                payload,
                courtAmount + sumBookingServiceLines(serviceLines)
            )
            if (!res.success) {
                toast.error(res.error ?? "Erro ao salvar")
                return
            }
            toast.success("Serviços e valor atualizados!")
            onSuccess()
            onClose()
        } finally {
            setIsSavingServices(false)
        }
    }

    const sportName = booking.sports?.name || court.sports?.[0]?.name || "—"
    const wideLayout = canEdit

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                showCloseButton
                className={cn(
                    "!flex max-h-[90vh] min-h-0 w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-3xl border-none bg-white p-0 shadow-2xl",
                    wideLayout
                        ? "sm:w-full sm:max-w-[min(995px,calc(100vw-2rem))]"
                        : "sm:w-full sm:max-w-[min(28rem,calc(100vw-2rem))]"
                )}
            >
                <DialogHeader
                    className={cn(
                        "shrink-0 space-y-0 px-6 pb-4 pt-6 text-left",
                        wideLayout && "sm:px-10 sm:pb-5 sm:pt-8"
                    )}
                >
                    <DialogTitle
                        className={cn(
                            "font-black tracking-tight text-arena-navy-800",
                            wideLayout ? "text-2xl" : "text-xl"
                        )}
                    >
                        Detalhes da reserva
                    </DialogTitle>
                </DialogHeader>

                <div
                    className={cn(
                        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6",
                        wideLayout && "sm:px-10"
                    )}
                >
                    <div className={cn("space-y-6 pb-6", wideLayout && "sm:space-y-8 sm:pb-8")}>
                        <div
                            className={cn(
                                "grid grid-cols-2 gap-4 gap-y-5 sm:gap-x-8",
                                wideLayout ? "lg:grid-cols-4 lg:gap-5" : "sm:gap-x-6"
                            )}
                        >
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-arena-navy-800/40">
                                Responsável
                            </p>
                            <p className="mt-1 text-sm font-semibold text-arena-navy-800">
                                {booking.athlete_name ?? "—"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-arena-navy-800/40">Status</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className={cn("text-xs font-medium", status.className)}>
                                    {status.label}
                                </Badge>
                                {booking.booking_type === "mensalista" && (
                                    <Badge
                                        variant="outline"
                                        className="border-transparent bg-amber-50 text-xs font-medium text-amber-800"
                                    >
                                        Mensalista
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-arena-navy-800/40">Esporte</p>
                            <p className="mt-1 text-sm font-semibold text-arena-navy-800">{sportName}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-arena-navy-800/40">Espaço</p>
                            <p className="mt-1 text-sm font-semibold text-arena-navy-800">{court.name}</p>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6" />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-arena-navy-800/40">Período</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-arena-navy-800">
                                <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
                                {format(startTime, "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF5EF] px-3 py-1.5 text-sm font-semibold text-arena-button">
                                <Clock className="h-3.5 w-3.5 text-arena-button/70" />
                                <span>{format(startTime, "HH:mm")}</span>
                                <span className="text-arena-button/50">→</span>
                                <span>{format(endTime, "HH:mm")}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6" />

                    {canEdit ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-arena-navy-800/40">
                                    Valor pago
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-arena-navy-800/40">
                                        R$
                                    </span>
                                    <Input
                                        value={courtPortion}
                                        onChange={(e) => setCourtPortion(e.target.value)}
                                        className="h-14 rounded-xl border-arena-navy-800/10 pl-12 font-bold text-arena-navy-800 focus:border-arena-button focus:ring-arena-button"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 border-t border-slate-200 pt-6">
                                <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
                                    <button
                                        type="button"
                                        disabled={isSavingServices}
                                        onClick={() => {
                                            setIncludeServices((prev) => {
                                                if (prev) setServiceLines([])
                                                return !prev
                                            })
                                        }}
                                        className={cn(
                                            "relative mt-0.5 h-6 w-12 shrink-0 rounded-full transition-colors",
                                            includeServices ? "bg-arena-button" : "bg-gray-200",
                                            isSavingServices && "pointer-events-none opacity-60"
                                        )}
                                        aria-pressed={includeServices}
                                    >
                                        <div
                                            className={cn(
                                                "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                                                includeServices ? "left-7" : "left-1"
                                            )}
                                        />
                                    </button>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <Label className="text-sm font-bold text-arena-navy-800">Adicionar serviço</Label>
                                        <p className="text-[10px] font-medium leading-snug text-arena-navy-800/40">
                                            Inclua serviços nessa reserva e já calcule o valor de forma única
                                        </p>
                                    </div>
                                </div>
                                {includeServices && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <BookingServicesSection
                                            compact
                                            catalogServices={catalogServiceProducts.map((p) => ({
                                                id: p.id,
                                                name: p.name,
                                                price: p.price,
                                            }))}
                                            lines={serviceLines}
                                            onLinesChange={setServiceLines}
                                            disabled={isSavingServices}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-200 pt-6">
                                <div className="flex flex-wrap items-baseline justify-between gap-3">
                                    <span className="text-sm font-medium text-arena-navy-800/70">Total da reserva</span>
                                    <span className="text-2xl font-black tracking-tight text-arena-button">
                                        {fmtBrl(totalDisplay)}
                                    </span>
                                </div>
                                {serviceLines.length > 0 && (
                                    <p className="mt-2 text-[11px] font-medium text-arena-navy-800/45">
                                        Locação {fmtBrl(Number(courtPortion) || 0)} + serviços {fmtBrl(servicesSum)}
                                    </p>
                                )}
                            </div>
                            <Button
                                type="button"
                                onClick={handleSaveServices}
                                disabled={isSavingServices}
                                className="h-11 w-full rounded-xl bg-arena-button font-semibold text-white shadow-sm hover:bg-arena-button-hover sm:mx-auto sm:max-w-md"
                            >
                                {isSavingServices ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando…
                                    </>
                                ) : (
                                    "Salvar serviços e valor"
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-arena-navy-800/40">Valor</p>
                            <p className="mt-1 text-2xl font-black text-arena-button">{fmtBrl(booking.price ?? 0)}</p>
                            {booking.booking_services?.length > 0 && (
                                <ul className="mt-3 space-y-1.5 text-sm text-arena-navy-800/80">
                                    {(booking.booking_services as any[]).map((s: any) => (
                                        <li key={s.id} className="flex justify-between gap-2">
                                            <span>
                                                {s.quantity}× {s.products?.name ?? "Serviço"}
                                            </span>
                                            <span className="font-semibold">
                                                {fmtBrl(s.quantity * Number(s.unit_price))}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    </div>
                </div>

                <div
                    className={cn(
                        "flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-slate-100 px-6 py-4 sm:gap-4",
                        wideLayout && "sm:px-10 sm:py-5"
                    )}
                >
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="h-11 w-full rounded-xl border-arena-navy-800/25 font-semibold text-arena-navy-800 hover:bg-slate-50 sm:w-auto sm:min-w-[200px]"
                    >
                        Voltar
                    </Button>
                    {canEdit && (
                        <Button
                            type="button"
                            onClick={onEdit}
                            className="h-11 w-full rounded-xl bg-arena-button font-semibold text-white shadow-sm hover:bg-arena-button-hover sm:w-auto sm:min-w-[200px]"
                        >
                            Editar
                        </Button>
                    )}
                    {avulsoReservado && (
                        <Button
                            type="button"
                            onClick={() => setShowConfirmPayment(true)}
                            disabled={isConfirmingPayment}
                            className="h-11 w-full rounded-xl bg-emerald-500 font-semibold text-white shadow-sm hover:bg-emerald-600 sm:w-auto sm:min-w-[200px] gap-2"
                        >
                            {isConfirmingPayment ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            Confirmar pagamento
                        </Button>
                    )}
                    {mensalistaReservadoBlock ? (
                        <div className="flex w-full min-w-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs font-medium text-amber-800 sm:w-auto sm:max-w-md">
                            Gerencie via &quot;Mensalistas&quot; no calendário
                        </div>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleCancel}
                            disabled={isCancelling || booking.status === "cancelled"}
                            className="h-11 w-11 shrink-0 rounded-xl border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                            title="Cancelar reserva"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </DialogContent>

            <ConfirmarPagamentoDialog
                isOpen={showConfirmPayment}
                onClose={() => setShowConfirmPayment(false)}
                onConfirm={handleConfirmarPagamento}
                atletaNome={booking.athlete_name ?? "Atleta"}
                mesDevido={format(startTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                valorPadrao={booking.price ?? 0}
                isLoading={isConfirmingPayment}
                tipo="avulso"
            />
        </Dialog>
    )
}
