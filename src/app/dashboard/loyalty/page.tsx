"use client"

import { Plus, History, Trophy, Settings, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect, useCallback } from "react"
import { updateCurrencyName, getLatestCreditsAction, getLatestRedemptionsAction } from "@/modules/loyalty/actions/loyaltyActions"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"
import { UserService } from "@/modules/users/services/userService"
import { ArenaService } from "@/modules/arenas/services/arenaService"
import { FidelityTransaction } from "@/modules/loyalty/services/loyaltyService"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { NewSendModal } from "@/modules/loyalty/components/NewSendModal"
import { NewRedemptionModal } from "@/modules/loyalty/components/NewRedemptionModal"

export default function FidelityPage() {
    const { user } = useUser()
    const [currencyName, setCurrencyName] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [recentCredits, setRecentCredits] = useState<FidelityTransaction[]>([])
    const [isLoadingCredits, setIsLoadingCredits] = useState(true)
    const [recentRedemptions, setRecentRedemptions] = useState<FidelityTransaction[]>([])
    const [isLoadingRedemptions, setIsLoadingRedemptions] = useState(true)

    // Modal states
    const [isNewSendOpen, setIsNewSendOpen] = useState(false)
    const [isNewRedemptionOpen, setIsNewRedemptionOpen] = useState(false)

    const loadData = useCallback(() => {
        if (user) {
            loadArenaData()
            loadRecentCredits()
            loadRecentRedemptions()
        }
    }, [user])

    useEffect(() => {
        loadData()
    }, [loadData])

    async function loadArenaData() {
        try {
            const dbUser = await UserService.getUserByClerkId(user!.id)
            if (dbUser) {
                const arena = await ArenaService.getFirstArenaByOrganizationUser(dbUser.id)
                if (arena?.nome_moeda_virtual) {
                    setCurrencyName(arena.nome_moeda_virtual)
                }
            }
        } catch (error) {
            console.error("Error loading arena data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    async function loadRecentCredits() {
        try {
            setIsLoadingCredits(true)
            const result = await getLatestCreditsAction()
            if (result.success && result.data) {
                setRecentCredits(result.data as FidelityTransaction[])
            }
        } catch (error) {
            console.error("Error loading credits:", error)
        } finally {
            setIsLoadingCredits(false)
        }
    }

    async function loadRecentRedemptions() {
        try {
            setIsLoadingRedemptions(true)
            const result = await getLatestRedemptionsAction()
            if (result.success && result.data) {
                setRecentRedemptions(result.data as FidelityTransaction[])
            }
        } catch (error) {
            console.error("Error loading redemptions:", error)
        } finally {
            setIsLoadingRedemptions(false)
        }
    }

    const handleSave = async () => {
        if (!currencyName.trim()) {
            toast.error("Informe um nome para a moeda")
            return
        }

        try {
            setIsSaving(true)
            const result = await updateCurrencyName(currencyName)
            if (result.success) {
                toast.success("Nome da moeda atualizado com sucesso!")
            } else {
                toast.error(result.error || "Erro ao atualizar")
            }
        } catch (error) {
            toast.error("Erro inesperado ao salvar")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-[#002B40]">Programa de Fidelidade</h1>
                    <p className="text-muted-foreground">
                        Faça a gestão da sua moeda de fidelidade.
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white gap-2 px-6 py-6 h-auto text-base rounded-lg font-semibold transition-all"
                >
                    Ver extrato
                    <History className="h-5 w-5" />
                </Button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Últimos Envios */}
                <Card className="border-none shadow-sm overflow-hidden text-balance">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="text-xl font-bold text-[#002B40]">Últimos envios</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsNewSendOpen(true)}
                            className="gap-1 border-[#002B40]/10 text-[#002B40] hover:bg-[#002B40] hover:text-white"
                        >
                            <Plus className="h-4 w-4" />
                            Novo envio
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoadingCredits ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
                            </div>
                        ) : recentCredits.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                                Nenhum envio recente encontrado.
                            </div>
                        ) : (
                            recentCredits.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-4 bg-[#FFF5EF] rounded-xl border border-[#FFE4D3]/50">
                                    <div className="space-y-1 text-left">
                                        <p className="font-semibold text-[#002B40]">
                                            Cliente: {tx.atleta?.nome_perfil || "Desconhecido"}
                                        </p>
                                        {tx.descricao && (
                                            <p className="text-sm text-[#002B40]/70 font-medium">
                                                {tx.descricao}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground font-medium">
                                            {format(new Date(tx.data_registro), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                    <span className="font-bold text-[#FF6B00] text-lg">
                                        + $ {Number(tx.valor).toFixed(2)}
                                    </span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Últimos Resgates */}
                <Card className="border-none shadow-sm overflow-hidden text-balance">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="text-xl font-bold text-[#002B40]">Últimos resgates</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsNewRedemptionOpen(true)}
                            className="gap-1 border-[#002B40]/10 text-[#002B40] hover:bg-[#002B40] hover:text-white"
                        >
                            <Plus className="h-4 w-4" />
                            Novo resgate
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoadingRedemptions ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
                            </div>
                        ) : recentRedemptions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                                Nenhum resgate recente encontrado.
                            </div>
                        ) : (
                            recentRedemptions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-4 bg-[#FFF5EF] rounded-xl border border-[#FFE4D3]/50">
                                    <div className="space-y-1 text-left">
                                        <p className="font-semibold text-[#002B40]">
                                            Cliente: {tx.atleta?.nome_perfil || "Desconhecido"}
                                        </p>
                                        {tx.descricao && (
                                            <p className="text-sm text-[#002B40]/70 font-medium">
                                                {tx.descricao}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground font-medium">
                                            {format(new Date(tx.data_registro), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                    <span className={`font-bold text-lg ${tx.tipo === 'vencimento' ? 'text-gray-500' : 'text-red-500'}`}>
                                        - $ {Number(tx.valor).toFixed(2)}
                                    </span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Top Atletas */}
                <Card className="border-none shadow-sm overflow-hidden text-balance">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold text-[#002B40]">Top atletas com mais moedas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0 p-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-[#002B40]/5 last:border-0 hover:bg-[#F8F9FA] transition-colors">
                                <div className="flex items-center gap-3">
                                    {i === 1 && <span className="text-xl">🥇</span>}
                                    {i === 2 && <span className="text-xl">🥈</span>}
                                    {i === 3 && <span className="text-xl">🥉</span>}
                                    {i > 3 && <span className="w-6 text-center text-muted-foreground font-bold">{i}</span>}
                                    <p className="font-medium text-[#002B40]">Luiza Paniago</p>
                                </div>
                                <span className="font-bold text-[#FF6B00]">$ 00</span>
                            </div>
                        ))}
                        <div className="p-4 text-center">
                            <Button variant="link" className="text-[#FF6B00] font-semibold hover:no-underline">
                                Ver tudo
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Configurações da Moeda */}
                <Card className="border-none shadow-sm overflow-hidden flex flex-col text-balance text-left items-stretch">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold text-[#002B40]">Configurações da moeda</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Configure o nome e a validade da sua moeda e personalize do seu jeito.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-[#002B40]/70 flex items-center justify-start">Nome</label>
                            <Input
                                placeholder={isLoading ? "Carregando..." : "Informe o nome da sua moeda"}
                                value={currencyName}
                                onChange={(e) => setCurrencyName(e.target.value)}
                                disabled={isLoading || isSaving}
                                className="h-12 border-[#002B40]/10 focus:ring-[#FF6B00] focus:border-[#FF6B00] rounded-lg"
                            />
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={isLoading || isSaving}
                            className="w-full bg-[#FF6B00] hover:bg-[#E66000] text-white h-14 text-lg font-bold rounded-xl shadow-lg shadow-[#FF6B00]/20 transition-all active:scale-95 gap-2"
                        >
                            {isSaving ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Save className="h-5 w-5" />
                            )}
                            Salvar
                        </Button>
                    </CardContent>
                </Card>

            </div>

            {/* Modals */}
            <NewSendModal
                isOpen={isNewSendOpen}
                onClose={() => setIsNewSendOpen(false)}
                onSuccess={loadRecentCredits}
            />
            <NewRedemptionModal
                isOpen={isNewRedemptionOpen}
                onClose={() => setIsNewRedemptionOpen(false)}
                onSuccess={loadRecentRedemptions}
            />
        </div>
    )
}
