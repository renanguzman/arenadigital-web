"use client"

import { useMemo, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ConfirmActionDialog } from "@/components/dashboard/ConfirmActionDialog"
import { toast } from "sonner"
import { Check, Loader2, Pencil, Plus, Tags, Trash, X } from "lucide-react"
import {
    createCategoryAction,
    deleteCategoryAction,
    updateCategoryAction,
} from "@/modules/products/actions/categoryActions"
import type { Product, ProductCategory, ProductCategoryKind } from "@/modules/products/types/product.types"
import { cn } from "@/lib/utils"

interface CategoriesManagerModalProps {
    arenaId: string
    kind: ProductCategoryKind
    open: boolean
    onOpenChange: (open: boolean) => void
    categories: ProductCategory[]
    products: Product[]
    /** Recarrega categorias (e produtos, pois renomear categoria sincroniza item_type). */
    onChanged: () => void
}

const inputClass =
    "h-10 rounded-lg bg-white border-slate-300 text-slate-800 shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#20B2AA]"

export function CategoriesManagerModal({
    arenaId,
    kind,
    open,
    onOpenChange,
    categories,
    products,
    onChanged,
}: CategoriesManagerModalProps) {
    const [newName, setNewName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState("")
    const [busyId, setBusyId] = useState<string | null>(null)
    const [categoryPendingDelete, setCategoryPendingDelete] = useState<ProductCategory | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const kindCategories = useMemo(
        () => categories.filter((c) => c.kind === kind),
        [categories, kind]
    )

    const countByCategory = useMemo(() => {
        const map = new Map<string, number>()
        for (const p of products) {
            if (!p.category_id) continue
            map.set(p.category_id, (map.get(p.category_id) ?? 0) + 1)
        }
        return map
    }, [products])

    const handleCreate = async () => {
        const name = newName.trim()
        if (name.length < 2) {
            toast.error("Informe um nome com pelo menos 2 caracteres")
            return
        }
        setIsCreating(true)
        try {
            const res = await createCategoryAction(arenaId, { name, kind })
            if (!res.success) throw new Error(res.error)
            toast.success("Categoria criada com sucesso")
            setNewName("")
            onChanged()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao criar categoria")
        } finally {
            setIsCreating(false)
        }
    }

    const startEdit = (category: ProductCategory) => {
        setEditingId(category.id)
        setEditingName(category.name)
    }

    const handleRename = async (category: ProductCategory) => {
        const name = editingName.trim()
        if (name === category.name) {
            setEditingId(null)
            return
        }
        setBusyId(category.id)
        try {
            const res = await updateCategoryAction(arenaId, category.id, { name })
            if (!res.success) throw new Error(res.error)
            toast.success("Categoria renomeada")
            setEditingId(null)
            onChanged()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao renomear categoria")
        } finally {
            setBusyId(null)
        }
    }

    const handleToggleActive = async (category: ProductCategory, active: boolean) => {
        setBusyId(category.id)
        try {
            const res = await updateCategoryAction(arenaId, category.id, { active })
            if (!res.success) throw new Error(res.error)
            toast.success(active ? "Categoria ativada" : "Categoria inativada")
            onChanged()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar categoria")
        } finally {
            setBusyId(null)
        }
    }

    const confirmDelete = async () => {
        if (!categoryPendingDelete) return
        setIsDeleting(true)
        try {
            const res = await deleteCategoryAction(arenaId, categoryPendingDelete.id)
            if (!res.success) throw new Error(res.error)
            toast.success("Categoria excluída")
            setCategoryPendingDelete(null)
            onChanged()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao excluir categoria")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[calc(100%-2rem)] gap-0 rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xl sm:max-w-[560px] sm:p-7 [&_[data-slot=dialog-close]]:text-[#0D3B45] [&_[data-slot=dialog-close]]:opacity-100">
                    <DialogHeader className="mb-4 space-y-2 text-left">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#0D3B45] sm:text-2xl">
                            <Tags className="h-5 w-5 text-[#20B2AA]" />
                            {kind === "product" ? "Categorias de produtos" : "Categorias de serviços"}
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed text-slate-600">
                            Agrupe os itens por família para organizar o catálogo e aplicar reajustes de preço em
                            massa. Categorias com itens vinculados não podem ser excluídas, apenas inativadas.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Nova categoria (ex.: Bebidas alcoólicas)"
                            className={inputClass}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault()
                                    handleCreate()
                                }
                            }}
                        />
                        <Button
                            type="button"
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="h-10 shrink-0 rounded-md bg-arena-button px-4 text-sm font-bold text-white shadow-none hover:bg-arena-button-hover"
                        >
                            {isCreating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="mr-1 h-4 w-4" />
                                    Adicionar
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                        {kindCategories.length === 0 ? (
                            <p className="py-8 text-center text-sm text-arena-navy-800/40">
                                Nenhuma categoria cadastrada ainda.
                            </p>
                        ) : (
                            kindCategories.map((category) => {
                                const count = countByCategory.get(category.id) ?? 0
                                const isEditing = editingId === category.id
                                const isBusy = busyId === category.id
                                return (
                                    <div
                                        key={category.id}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3",
                                            !category.active && "bg-slate-50 opacity-70"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0">
                                            {isEditing ? (
                                                <Input
                                                    autoFocus
                                                    className="h-9 rounded-lg border-slate-300 text-sm"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault()
                                                            handleRename(category)
                                                        }
                                                        if (e.key === "Escape") setEditingId(null)
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate text-sm font-semibold text-arena-navy-800">
                                                        {category.name}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="shrink-0 border-slate-200 text-[10px] font-bold text-arena-navy-800/50"
                                                    >
                                                        {count} {count === 1 ? "item" : "itens"}
                                                    </Badge>
                                                    {!category.active && (
                                                        <Badge className="shrink-0 bg-slate-400 text-[10px] font-bold uppercase text-white hover:bg-slate-400">
                                                            Inativa
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {isBusy ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-arena-button" />
                                            ) : isEditing ? (
                                                <>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                        onClick={() => handleRename(category)}
                                                        aria-label="Salvar nome"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:bg-slate-100"
                                                        onClick={() => setEditingId(null)}
                                                        aria-label="Cancelar edição"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Switch
                                                        checked={category.active}
                                                        onCheckedChange={(checked) => handleToggleActive(category, checked)}
                                                        aria-label={category.active ? "Inativar categoria" : "Ativar categoria"}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-arena-navy-800/60 hover:bg-slate-100 hover:text-arena-navy-800"
                                                        onClick={() => startEdit(category)}
                                                        aria-label="Renomear categoria"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-slate-300"
                                                        disabled={count > 0}
                                                        onClick={() => setCategoryPendingDelete(category)}
                                                        aria-label="Excluir categoria"
                                                        title={
                                                            count > 0
                                                                ? "Categoria com itens vinculados não pode ser excluída"
                                                                : "Excluir categoria"
                                                        }
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={!!categoryPendingDelete}
                onOpenChange={(o) => {
                    if (!o && !isDeleting) setCategoryPendingDelete(null)
                }}
                title="Excluir categoria"
                description={`Tem certeza que deseja excluir a categoria "${categoryPendingDelete?.name ?? ""}"? Essa ação não pode ser desfeita.`}
                confirmLabel="Excluir"
                loadingLabel="Excluindo..."
                loading={isDeleting}
                onConfirm={confirmDelete}
            />
        </>
    )
}
