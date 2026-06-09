"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    Calendar, Search, CheckCircle2, Loader2,
    CalendarDays, Clock, MapPin, TrendingUp, AlertCircle, Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { arenaDataTable } from "@/lib/arena-data-table"
import { toast } from "sonner"
import {
    confirmarPagamentoAvulsoAction,
    confirmarPagamentoParticipanteAvulsoAction,
} from "@/modules/bookings/actions/bookingActions"
import { ConfirmarPagamentoDialog } from "@/modules/bookings/components/ConfirmarPagamentoDialog"
import type { AvulsoListItem } from "@/modules/finance/actions/financeActions"

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

interface Props {
    arenaId: string
    initialItems: AvulsoListItem[]
}

function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: React.ElementType; label: string; value: string; sub?: string; color: string
}) {
    return (
        <Card className="border-none shadow-sm bg-white p-5 flex items-center gap-4">
            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0", color)}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase text-arena-navy-800/40 tracking-wider">{label}</p>
                <p className="text-2xl font-black text-arena-navy-800">{value}</p>
                {sub && <p className="text-[11px] text-arena-navy-800/40 font-medium">{sub}</p>}
            </div>
        </Card>
    )
}

export function AvulsasPageClient({ arenaId, initialItems }: Props) {
    const router = useRouter()
    const [items] = useState(initialItems)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<"todos" | "pendente" | "pago" | "cancelado">("pendente")
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [confirmDialog, setConfirmDialog] = useState<AvulsoListItem | null>(null)

    const filtered = items.filter(item => {
        const nome = item.atleta?.nome_perfil ?? item.athlete_name
        const matchSearch =
            nome?.toLowerCase().includes(search.toLowerCase()) ||
            item.court?.name?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === "todos" || item.status === statusFilter
        return matchSearch && matchStatus
    })

    const pendentes = items.filter(i => i.status === "pendente")
    const pagos = items.filter(i => i.status === "pago")
    const totalPendente = pendentes.reduce((acc, i) => acc + i.price, 0)
    const totalRecebido = pagos.reduce((acc, i) => acc + i.price, 0)

    const handleConfirmarPagamento = async (valor: number) => {
        if (!confirmDialog) return
        const item = confirmDialog
        const needsParticipantSync =
            item.cobranca_por_participante && !item.participant_id
        if (needsParticipantSync) {
            toast.error("Edite a reserva para sincronizar os participantes.")
            return
        }
        setLoadingId(item.id)
        try {
            const res = item.participant_id
                ? await confirmarPagamentoParticipanteAvulsoAction(
                    arenaId,
                    item.booking_id,
                    item.participant_id,
                    valor,
                )
                : await confirmarPagamentoAvulsoAction(arenaId, item.booking_id, valor)

            if (res.success) {
                toast.success("Pagamento confirmado!")
                setConfirmDialog(null)
                router.refresh()
            } else {
                toast.error(res.error ?? "Erro ao confirmar pagamento")
            }
        } finally {
            setLoadingId(null)
        }
    }

    const formatDataHora = (iso: string) =>
        format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

    const statusBadge = (status: AvulsoListItem["status"]) => {
        if (status === "pago") {
            return <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px] uppercase">Pago</Badge>
        }
        if (status === "cancelado") {
            return <Badge className="bg-gray-100 text-gray-500 border-none font-bold text-[10px] uppercase">Cancelado</Badge>
        }
        return <Badge className="bg-orange-100 text-orange-700 border-none font-bold text-[10px] uppercase">Pendente</Badge>
    }

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-arena-navy-800 tracking-tight">Cobranças Avulsas</h1>
                <p className="text-arena-navy-800/60 font-medium">
                    Acompanhe todas as cobranças avulsas de todos os espaços da arena.
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    icon={AlertCircle}
                    label="Cobranças pendentes"
                    value={String(pendentes.length)}
                    sub={`${formatCurrency(totalPendente)} a receber`}
                    color={pendentes.length > 0 ? "bg-orange-500" : "bg-slate-400"}
                />
                <StatCard
                    icon={TrendingUp}
                    label="Cobranças pagas"
                    value={String(pagos.length)}
                    sub="reservas avulsas quitadas"
                    color="bg-emerald-500"
                />
                <StatCard
                    icon={Wallet}
                    label="Total recebido"
                    value={formatCurrency(totalRecebido)}
                    sub="soma das cobranças pagas"
                    color="bg-arena-button"
                />
            </div>

            {/* Table */}
            <Card className="border-none shadow-sm bg-white p-6 space-y-5">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {(["pendente", "pago", "cancelado", "todos"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors capitalize",
                                    statusFilter === f
                                        ? "bg-arena-navy-800 text-white"
                                        : "bg-[#F1F5F9] text-arena-navy-800/60 hover:bg-arena-navy-800/10"
                                )}
                            >
                                {f === "pendente" ? "Pendentes" : f === "pago" ? "Pagas" : f === "cancelado" ? "Canceladas" : "Todas"}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-arena-navy-800/30" />
                        <Input
                            placeholder="Buscar responsável ou espaço..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 border-arena-navy-800/10"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className={arenaDataTable.table}>
                        <thead>
                            <tr className={arenaDataTable.theadRow}>
                                {[
                                    "Responsável",
                                    "Espaço",
                                    "Data / Horário",
                                    "Valor",
                                    "Status",
                                    "Ações",
                                ].map((h, i, arr) => (
                                    <th
                                        key={h}
                                        className={i === arr.length - 1 ? arenaDataTable.thRight : arenaDataTable.th}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className={arenaDataTable.emptyCell}>
                                        Nenhuma cobrança avulsa encontrada.
                                    </td>
                                </tr>
                            )}
                            {filtered.map(item => {
                                const nome = item.atleta?.nome_perfil ?? item.athlete_name
                                const courtName = item.court?.name ?? "—"
                                const isPendente = item.status === "pendente"
                                const isConfirming = loadingId === item.id
                                const needsParticipantSync =
                                    item.cobranca_por_participante && !item.participant_id

                                return (
                                    <tr key={item.id} className={arenaDataTable.tbodyRow}>
                                        {/* Responsável */}
                                        <td className={arenaDataTable.tdBold}>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                    <Calendar className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-arena-navy-800 text-sm">{nome}</p>
                                                    {item.atleta?.telefone && (
                                                        <p className="text-[11px] text-arena-navy-800/40">{item.atleta.telefone}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Espaço */}
                                        <td className={arenaDataTable.td}>
                                            <div className="flex items-center gap-1.5 text-sm font-medium text-arena-navy-800">
                                                <MapPin className="h-3.5 w-3.5 text-arena-navy-800/30 flex-shrink-0" />
                                                {courtName}
                                            </div>
                                            {item.sports?.name && (
                                                <p className="text-[11px] text-arena-navy-800/40 mt-0.5">{item.sports.name}</p>
                                            )}
                                        </td>

                                        {/* Data / Horário */}
                                        <td className={cn(arenaDataTable.td, "align-top")}>
                                            <div className="flex items-center gap-1.5 text-sm font-bold text-arena-navy-800">
                                                <CalendarDays className="h-3.5 w-3.5 text-arena-navy-800/30 flex-shrink-0" />
                                                {format(parseISO(item.start_time), "dd/MM/yyyy", { locale: ptBR })}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-arena-navy-800/50 mt-0.5">
                                                <Clock className="h-3 w-3" />
                                                {format(parseISO(item.start_time), "HH:mm", { locale: ptBR })}
                                            </div>
                                        </td>

                                        {/* Valor */}
                                        <td className={cn(arenaDataTable.td, "align-top whitespace-nowrap")}>
                                            <p className="text-base font-black text-arena-button">
                                                {formatCurrency(item.price)}
                                            </p>
                                            {item.cobranca_por_participante && (
                                                <p className="text-[11px] text-arena-navy-800/40">por participante</p>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className={arenaDataTable.td}>
                                            {statusBadge(item.status)}
                                        </td>

                                        {/* Ações */}
                                        <td className={arenaDataTable.tdRight}>
                                            <div className="flex items-center justify-end gap-2">
                                                {isPendente && needsParticipantSync ? (
                                                    <span className="max-w-[160px] text-right text-[10px] font-semibold leading-snug text-amber-700">
                                                        Edite a reserva para sincronizar participantes
                                                    </span>
                                                ) : isPendente ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setConfirmDialog(item)}
                                                        disabled={isConfirming}
                                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1.5 h-8 px-3 rounded-lg text-xs"
                                                    >
                                                        {isConfirming
                                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            : <CheckCircle2 className="h-3.5 w-3.5" />
                                                        }
                                                        Confirmar
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-arena-navy-800/30 font-medium">—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ConfirmarPagamentoDialog
                isOpen={!!confirmDialog}
                onClose={() => setConfirmDialog(null)}
                onConfirm={handleConfirmarPagamento}
                atletaNome={confirmDialog?.atleta?.nome_perfil ?? confirmDialog?.athlete_name ?? ""}
                mesDevido={confirmDialog ? formatDataHora(confirmDialog.start_time) : ""}
                valorPadrao={confirmDialog?.price ?? 0}
                isLoading={loadingId !== null}
                tipo="avulso"
            />
        </div>
    )
}
