"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export interface CustomPrice {
    id?: string
    start: string
    end: string
    price: number
}

export interface DayConfig {
    day: string
    enabled: boolean
    startTime: string
    endTime: string
    price: number
    customPrices: CustomPrice[]
    /** ID da faixa que usa o valor padrão (`config.price`). */
    defaultTierId?: string
    slotShiftTime?: string | null
}

interface DayScheduleConfigProps {
    day: string
    config: DayConfig
    onChange: (config: DayConfig) => void
    onReplicate?: () => void
}

interface PriceTier {
    id: string
    start: string
    end: string
    price: number
    isDefault: boolean
}

function createBandId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `band-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function parseHHMM(t: string): number {
    const [h, m] = (t || "00:00").split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
}

function minsToHHMM(mins: number): string {
    const normalized = ((mins % (24 * 60)) + 24 * 60) % (24 * 60)
    const h = Math.floor(normalized / 60)
    const m = normalized % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getOperatingEndMins(config: DayConfig): number {
    const startMins = parseHHMM(config.startTime)
    let endMins = parseHHMM(config.endTime)
    if (endMins <= startMins) endMins += 24 * 60
    return endMins
}

/** Converte um horário para "minutos de operação": horários antes do início do
 *  funcionamento pertencem ao dia seguinte (funcionamento que cruza a meia-noite). */
function toOpMins(time: string, startMins: number): number {
    const mins = parseHHMM(time)
    return mins < startMins ? mins + 24 * 60 : mins
}

function countSlots(config: DayConfig): number {
    if (!config.enabled || !config.startTime || !config.endTime) return 0
    const startMins = parseHHMM(config.startTime)
    let endMins = parseHHMM(config.endTime)
    if (endMins <= startMins) endMins += 24 * 60

    let firstShiftMins: number | null = null
    if (config.slotShiftTime) {
        const sm = parseHHMM(config.slotShiftTime)
        firstShiftMins = sm % 60 === 30 ? sm : sm + (30 - sm % 60) % 60
    }

    let count = 0
    let cur = startMins
    let shifted = false
    while (cur < endMins) {
        if (!shifted && firstShiftMins !== null && cur + 60 > firstShiftMins) {
            if (firstShiftMins > cur) cur = firstShiftMins
            shifted = true
        }
        count++
        cur += 60
    }
    return count
}

/** ID único e determinístico para um segmento de faixa padrão (preenche lacunas). */
function gapTierId(start: string): string {
    return `default-${minsToHHMM(parseHHMM(start))}`
}

/** Converte config salva → faixas encadeadas para edição (sempre contíguas).
 *  Toda a aritmética usa "minutos de operação" para suportar funcionamento
 *  que cruza a meia-noite. Cada faixa recebe um id único; uma só é a padrão. */
function tiersFromConfig(config: DayConfig): PriceTier[] {
    const startMins = parseHHMM(config.startTime)
    const endMins = getOperatingEndMins(config)

    const customs = config.customPrices
        .map((cp) => ({
            ...cp,
            opStart: toOpMins(cp.start, startMins),
            opEnd: toOpMins(cp.end, startMins),
        }))
        // Descarta faixas inválidas ou fora do funcionamento (dados legados/corrompidos)
        .filter((cp) => cp.opEnd > cp.opStart && cp.opStart < endMins)
        .sort((a, b) => a.opStart - b.opStart)

    const raw: Omit<PriceTier, 'isDefault'>[] = []
    let cursor = startMins

    for (const cp of customs) {
        // Sobreposição com o trecho já consumido → descarta (garante contiguidade)
        if (cp.opStart < cursor) continue

        const opEnd = Math.min(cp.opEnd, endMins)

        if (cp.opStart > cursor) {
            raw.push({
                id: gapTierId(minsToHHMM(cursor)),
                start: minsToHHMM(cursor),
                end: minsToHHMM(cp.opStart),
                price: config.price || 0,
            })
        }

        raw.push({
            id: cp.id ?? `legacy-${cp.start}`,
            start: minsToHHMM(cp.opStart),
            end: minsToHHMM(opEnd),
            price: cp.price,
        })

        cursor = opEnd
        if (cursor >= endMins) break
    }

    if (cursor < endMins) {
        raw.push({
            id: gapTierId(minsToHHMM(cursor)),
            start: minsToHHMM(cursor),
            end: config.endTime,
            price: config.price || 0,
        })
    }

    if (raw.length === 0) {
        raw.push({
            id: gapTierId(config.startTime),
            start: config.startTime,
            end: config.endTime,
            price: config.price || 0,
        })
    }

    // A faixa padrão é a lacuna (default-*) que corresponde ao id salvo;
    // se nenhuma corresponder (dados legados/corrompidos), usa a primeira lacuna;
    // se não houver lacuna, usa a primeira faixa.
    const gapIds = raw.filter((t) => t.id.startsWith('default-')).map((t) => t.id)
    const chosenDefaultId =
        gapIds.find((id) => id === config.defaultTierId) ??
        gapIds[0] ??
        raw[0]?.id

    return raw.map((tier) => ({ ...tier, isDefault: tier.id === chosenDefaultId }))
}

/** Converte faixas encadeadas → config para salvar. */
function configFromTiers(config: DayConfig, tiers: PriceTier[]): DayConfig {
    const defaultTier = tiers.find((t) => t.isDefault) ?? tiers[0]

    if (!defaultTier) {
        return { ...config, price: 0, customPrices: [], defaultTierId: undefined }
    }

    const customTiers = tiers.filter((t) => !t.isDefault)

    return {
        ...config,
        price: defaultTier.price,
        // A faixa padrão vira a lacuna implícita; guarda o id no formato de gap
        // (baseado no início) para reencontrá-la de forma estável após a releitura.
        defaultTierId: gapTierId(defaultTier.start),
        customPrices: customTiers.map((tier) => ({
            // Faixas customizadas nunca guardam id no formato de gap (default-*),
            // para não interferir na seleção da faixa padrão na releitura.
            // O id derivado do início é estável entre commits — evita remontar a
            // linha (e perder o foco do input) a cada tecla digitada.
            id: tier.id.startsWith('default-') ? `band-${tier.start}` : tier.id,
            start: tier.start,
            end: tier.end,
            price: tier.price,
        })),
    }
}

function normalizeTime(value: string): string | null {
    if (!value) return null
    const match = value.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const h = Number(match[1])
    const m = Number(match[2])
    if (h < 0 || h > 23 || m < 0 || m > 59) return null
    return minsToHHMM(h * 60 + m)
}

function normalizeTiers(tiers: PriceTier[], config: DayConfig): PriceTier[] {
    const startMins = parseHHMM(config.startTime)
    const endMins = getOperatingEndMins(config)

    const fallback: PriceTier = {
        id: gapTierId(config.startTime),
        start: config.startTime,
        end: config.endTime,
        price: config.price || 0,
        isDefault: true,
    }

    if (tiers.length === 0) return [fallback]

    // Reconstrói a cadeia contígua em "minutos de operação" (suporta overnight):
    // cada faixa começa onde a anterior terminou; fins inválidos são corrigidos.
    const result: PriceTier[] = []
    let cursor = startMins

    for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i]
        const isLast = i === tiers.length - 1

        const tierStart = cursor
        let tierEnd = isLast ? endMins : Math.min(toOpMins(tier.end, startMins), endMins)
        if (tierEnd <= tierStart) tierEnd = Math.min(tierStart + 60, endMins)
        if (isLast) tierEnd = endMins
        if (tierEnd <= tierStart) continue // largura zero → descarta

        result.push({
            ...tier,
            start: minsToHHMM(tierStart),
            end: minsToHHMM(tierEnd),
        })

        cursor = tierEnd
        if (cursor >= endMins) break
    }

    if (result.length === 0) return [fallback]

    result[0].start = config.startTime
    result[result.length - 1].end = config.endTime

    return result
}

function suggestSplitPoint(tier: PriceTier): string | null {
    const startMins = parseHHMM(tier.start)
    let endMins = parseHHMM(tier.end)
    if (endMins <= startMins) endMins += 24 * 60
    if (endMins - startMins < 120) return null
    const split = startMins + Math.floor((endMins - startMins) / 2 / 60) * 60
    return minsToHHMM(split)
}

export function DayScheduleConfig({ day, config, onChange, onReplicate }: DayScheduleConfigProps) {
    const isOvernight =
        !!config.startTime && !!config.endTime &&
        parseHHMM(config.endTime) < parseHHMM(config.startTime)

    const slotCount = countSlots(config)
    const tiers = tiersFromConfig(config)

    // Rascunho local para inputs de horário — evita corrigir a cada tecla
    const [timeDrafts, setTimeDrafts] = useState<Record<string, string>>({})

    useEffect(() => {
        setTimeDrafts({})
    }, [config.startTime, config.endTime, config.customPrices, config.defaultTierId])

    const draftKey = (tierId: string, field: 'start' | 'end') => `${tierId}:${field}`

    const displayTime = (tierId: string, field: 'start' | 'end', stored: string) =>
        timeDrafts[draftKey(tierId, field)] ?? stored

    const commitTiers = useCallback((nextTiers: PriceTier[]) => {
        onChange(configFromTiers(config, normalizeTiers(nextTiers, config)))
    }, [config, onChange])

    const handleToggle = (checked: boolean) => onChange({ ...config, enabled: checked })

    const handleOperatingChange = (field: 'startTime' | 'endTime' | 'price' | 'slotShiftTime', value: string | number | null) => {
        const next = { ...config, [field]: value }
        if (field === 'startTime' || field === 'endTime') {
            onChange(configFromTiers(next, normalizeTiers(tiersFromConfig(next), next)))
            return
        }
        onChange(next)
    }

    const updateTierPrice = (tierId: string, price: number) => {
        const next = tiers.map((t) => t.id === tierId ? { ...t, price } : t)
        commitTiers(next)
    }

    const setDefaultTier = (tierId: string) => {
        const next = tiers.map((t) => ({ ...t, isDefault: t.id === tierId }))
        commitTiers(next)
    }

    const setTierBoundary = (tierIndex: number, field: 'start' | 'end', rawValue: string) => {
        const tier = tiers[tierIndex]
        setTimeDrafts((prev) => ({ ...prev, [draftKey(tier.id, field)]: rawValue }))
    }

    const commitTierBoundary = (tierIndex: number, field: 'start' | 'end', rawValue: string) => {
        const tier = tiers[tierIndex]
        const key = draftKey(tier.id, field)
        setTimeDrafts((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
        })

        const normalized = normalizeTime(rawValue)
        if (!normalized) return

        const next = tiers.map((t) => ({ ...t }))

        if (field === 'end' && tierIndex < next.length - 1) {
            next[tierIndex].end = normalized
            next[tierIndex + 1].start = normalized
        } else if (field === 'start' && tierIndex > 0) {
            next[tierIndex].start = normalized
            next[tierIndex - 1].end = normalized
        } else if (field === 'end' && tierIndex === next.length - 1) {
            next[tierIndex].end = config.endTime
        } else if (field === 'start' && tierIndex === 0) {
            next[0].start = config.startTime
        }

        commitTiers(next)
    }

    // Índice da maior faixa que ainda comporta divisão (≥ 2h).
    const splittableIndex = (() => {
        const startMins = parseHHMM(config.startTime)
        let best = -1
        let bestLen = 0
        tiers.forEach((tier, index) => {
            if (suggestSplitPoint(tier) === null) return
            const len = toOpMins(tier.end, startMins) - toOpMins(tier.start, startMins)
            if (len > bestLen) {
                bestLen = len
                best = index
            }
        })
        return best
    })()

    const addTier = () => {
        if (splittableIndex === -1) return
        const target = tiers[splittableIndex]
        const split = suggestSplitPoint(target)
        if (!split) return

        const next = tiers.map((t) => ({ ...t }))
        next[splittableIndex] = { ...target, end: split }
        next.splice(splittableIndex + 1, 0, {
            id: createBandId(),
            start: split,
            end: target.end,
            price: target.price,
            isDefault: false,
        })
        commitTiers(next)
    }

    const removeTier = (tierIndex: number) => {
        if (tiers.length <= 1) return

        const removedWasDefault = tiers[tierIndex].isDefault
        const next = tiers.filter((_, i) => i !== tierIndex).map((t) => ({ ...t }))

        for (let i = 0; i < next.length - 1; i++) {
            next[i].end = next[i + 1].start
        }
        if (next.length > 0) {
            next[0].start = config.startTime
            next[next.length - 1].end = config.endTime
        }

        if (removedWasDefault) {
            next.forEach((t, i) => { t.isDefault = i === 0 })
        }

        commitTiers(next)
    }

    const canAddTier = splittableIndex !== -1

    const shiftExample = config.slotShiftTime
        ? (() => {
            const sm = parseHHMM(config.slotShiftTime)
            const first = sm % 60 === 30 ? sm : sm + (30 - sm % 60) % 60
            const a = minsToHHMM(first), b = minsToHHMM(first + 60), c = minsToHHMM(first + 120)
            return `ex: ${a}–${b}, ${b}–${c}…`
        })()
        : null

    return (
        <div
            className={`rounded-lg border border-border p-4 transition-colors ${config.enabled ? "bg-white" : "bg-muted/40"}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id={`enable-${day}`}
                        checked={config.enabled}
                        onCheckedChange={handleToggle}
                        className="data-[state=checked]:bg-arena-button data-[state=checked]:border-arena-button"
                    />
                    <Label htmlFor={`enable-${day}`} className="font-semibold text-lg cursor-pointer select-none">
                        {day}
                    </Label>
                </div>
                <div className="flex items-center gap-2">
                    {config.enabled && slotCount > 0 && (
                        <span className="text-[11px] text-arena-navy-800/40 font-medium bg-arena-navy-800/5 px-2 py-0.5 rounded-full">
                            {slotCount} {slotCount === 1 ? 'slot' : 'slots'}
                            {tiers.length > 1 && ` · ${tiers.length} faixas de preço`}
                        </span>
                    )}
                    {config.enabled && onReplicate && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onReplicate}
                            className="h-7 text-xs border-border text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground [&_svg]:text-muted-foreground"
                            title="Replicar para todos os dias"
                        >
                            <Copy className="h-3 w-3 mr-1" />
                            Replicar
                        </Button>
                    )}
                    {config.enabled && (
                        <Badge className="border-transparent bg-arena-status-active px-2.5 font-medium text-white hover:bg-arena-status-active">
                            Ativo
                        </Badge>
                    )}
                </div>
            </div>

            {config.enabled && (
                <div className="space-y-5 border-l-2 border-border pl-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Início do funcionamento</Label>
                            <Input
                                type="time"
                                value={config.startTime}
                                onChange={(e) => handleOperatingChange("startTime", e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                Fim do funcionamento
                                {isOvernight && (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full leading-none">
                                        +1 dia
                                    </span>
                                )}
                            </Label>
                            <Input
                                type="time"
                                value={config.endTime}
                                onChange={(e) => handleOperatingChange("endTime", e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <div className="flex items-end">
                            <p className="text-[11px] text-muted-foreground leading-snug pb-2">
                                As faixas de preço ficam sempre dentro desse horário.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1 pt-1">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id={`shift-${day}`}
                                checked={!!config.slotShiftTime}
                                onCheckedChange={(checked) =>
                                    handleOperatingChange("slotShiftTime", checked ? "17:00" : null)
                                }
                                className="data-[state=checked]:bg-arena-button data-[state=checked]:border-arena-button"
                            />
                            <Label htmlFor={`shift-${day}`} className="text-xs text-muted-foreground cursor-pointer select-none">
                                Slots passam para o :30 a partir de
                            </Label>
                            {config.slotShiftTime && (
                                <Input
                                    type="time"
                                    value={config.slotShiftTime}
                                    onChange={(e) => handleOperatingChange("slotShiftTime", e.target.value)}
                                    className="h-8 w-24 text-xs"
                                />
                            )}
                        </div>
                        {shiftExample && (
                            <p className="text-[11px] text-arena-navy-800/40 pl-6 italic">
                                {shiftExample}
                            </p>
                        )}
                    </div>

                    <div className="pt-1 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium text-gray-700">Faixas de preço</Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Cada faixa cobre um período. Marque qual é a <strong>faixa padrão</strong> (preço base da quadra).
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={addTier}
                                disabled={!canAddTier}
                                className="h-7 text-xs text-arena-button hover:text-arena-button-hover hover:bg-orange-50 disabled:opacity-40"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Adicionar faixa
                            </Button>
                        </div>

                        <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_112px] gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span>Início</span>
                            <span>Fim</span>
                            <span>Valor / hora</span>
                            <span className="text-center">Padrão</span>
                        </div>

                        <div className="space-y-2">
                            {tiers.map((tier, index) => {
                                const isFirst = index === 0
                                const isLast = index === tiers.length - 1
                                const endLocked = isLast
                                const startLocked = isFirst

                                return (
                                    <div
                                        key={tier.id}
                                        className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_112px] gap-2 items-center rounded-lg border px-3 py-2.5 ${
                                            tier.isDefault
                                                ? 'bg-arena-navy-800/[0.03] border-arena-navy-800/10'
                                                : 'bg-orange-50/60 border-orange-100'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground">Início</span>
                                            <Input
                                                type="time"
                                                value={displayTime(tier.id, 'start', tier.start)}
                                                disabled={startLocked}
                                                onChange={(e) => setTierBoundary(index, 'start', e.target.value)}
                                                onBlur={(e) => commitTierBoundary(index, 'start', e.target.value)}
                                                className="h-9 text-sm bg-white disabled:opacity-60"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground">
                                                Fim{isOvernight && isLast ? ' (+1 dia)' : ''}
                                            </span>
                                            <Input
                                                type="time"
                                                value={displayTime(tier.id, 'end', tier.end)}
                                                disabled={endLocked}
                                                onChange={(e) => setTierBoundary(index, 'end', e.target.value)}
                                                onBlur={(e) => commitTierBoundary(index, 'end', e.target.value)}
                                                className="h-9 text-sm bg-white disabled:opacity-60"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground">Valor / hora</span>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-2.5 text-muted-foreground text-xs">R$</span>
                                                <Input
                                                    type="number"
                                                    value={tier.price || 0}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value)
                                                        updateTierPrice(tier.id, isNaN(val) ? 0 : val)
                                                    }}
                                                    className="h-9 pl-7 text-sm bg-white"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setDefaultTier(tier.id)}
                                                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
                                                    tier.isDefault
                                                        ? 'bg-arena-button/10 text-arena-button'
                                                        : 'text-muted-foreground hover:bg-muted/60 hover:text-arena-navy-800'
                                                }`}
                                                title="Usar como faixa de preço padrão"
                                            >
                                                <span className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${
                                                    tier.isDefault ? 'border-arena-button' : 'border-muted-foreground/40'
                                                }`}>
                                                    {tier.isDefault && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-arena-button" />
                                                    )}
                                                </span>
                                                <span className="hidden sm:inline">Padrão</span>
                                            </button>
                                            {tiers.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeTier(index)}
                                                    className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                    title="Remover faixa"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {!canAddTier && tiers.length === 1 && (
                            <p className="text-xs text-muted-foreground italic">
                                Mesmo preço em todo o horário. Adicione faixas para preços diferenciados (mín. 2h por faixa).
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
