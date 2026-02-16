"use client"

import { useEffect, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { OrderService, StationOrder } from "../services/orderService"
import { ProductService, Product } from "@/modules/products/services/productService"
import { Search, Check, X, Loader2, Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { normalizeString } from "@/lib/utils"

const launchItemSchema = z.object({
    quantity: z.string().min(1, "Informe a quantidade"),
})

type LaunchItemValues = z.infer<typeof launchItemSchema>

interface SelectedItem {
    product: Product
    quantity: number
}

interface LaunchItemModalProps {
    isOpen: boolean
    onClose: () => void
    arenaId: string
    order: StationOrder | null
    onSuccess: () => void
}

export function LaunchItemModal({
    isOpen,
    onClose,
    arenaId,
    order,
    onSuccess
}: LaunchItemModalProps) {
    const [productSearch, setProductSearch] = useState("")
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
    const [isSearchingProducts, setIsSearchingProducts] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const productSearchTimeout = useRef<NodeJS.Timeout | null>(null)

    const form = useForm<LaunchItemValues>({
        resolver: zodResolver(launchItemSchema),
        defaultValues: {
            quantity: "1",
        },
    })

    const handleProductSearch = (value: string) => {
        setProductSearch(value)

        if (productSearchTimeout.current) clearTimeout(productSearchTimeout.current)

        if (value.length < 2) {
            setFilteredProducts([])
            return
        }

        setIsSearchingProducts(true)
        productSearchTimeout.current = setTimeout(async () => {
            try {
                const productsData = await ProductService.getProductsByArena(arenaId)
                const filtered = productsData.filter(p =>
                    normalizeString(p.name).includes(normalizeString(value))
                )
                setFilteredProducts(filtered)
            } catch (error) {
                console.error("Product search error:", error)
            } finally {
                setIsSearchingProducts(false)
            }
        }, 500)
    }

    const addItem = (product: Product) => {
        const qty = parseInt(form.getValues("quantity"))
        if (isNaN(qty) || qty <= 0) {
            toast.error("Informe uma quantidade válida")
            return
        }

        setSelectedItems(prev => [...prev, { product, quantity: qty }])
        setProductSearch("")
        setFilteredProducts([])
        form.setValue("quantity", "1")
    }

    const removeItem = (index: number) => {
        setSelectedItems(prev => prev.filter((_, i) => i !== index))
    }

    async function onSubmit(data: LaunchItemValues) {
        if (!order) return
        if (selectedItems.length === 0) {
            toast.error("Adicione pelo menos um item")
            return
        }

        setIsSubmitting(true)
        try {
            const itemsToLaunch = selectedItems.map(item => ({
                order_id: order.id,
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
                total_price: item.product.price * item.quantity
            }))

            const launchTotalValue = itemsToLaunch.reduce((acc, item) => acc + item.total_price, 0)

            // Add all items
            await Promise.all(itemsToLaunch.map(item => OrderService.addOrderItem(item)))

            // Update order total value
            await OrderService.updateOrder(order.id, {
                total_value: order.total_value + launchTotalValue
            })

            toast.success("Itens lançados com sucesso!")
            onSuccess()
            handleClose()
        } catch (error) {
            console.error("Error launching items:", error)
            toast.error("Erro ao lançar itens.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        form.reset()
        setProductSearch("")
        setSelectedItems([])
        setFilteredProducts([])
        onClose()
    }

    if (!order) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-black text-[#002B40]">
                        Lançar item na comanda #{order.order_number.toString().padStart(3, '0')}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-3 items-end">
                                <div className="col-span-4 space-y-2">
                                    <Label className="text-[#002B40] font-bold">Qtd.</Label>
                                    <FormField
                                        control={form.control}
                                        name="quantity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        {...field}
                                                        className="h-11 border-[#002B40]/10 rounded-xl"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-8 space-y-2 relative">
                                    <Label className="text-[#002B40] font-bold">Item</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#002B40]/20" />
                                        <Input
                                            placeholder="Selecione o item desejado"
                                            value={productSearch}
                                            onChange={(e) => handleProductSearch(e.target.value)}
                                            className="pl-10 h-11 border-[#002B40]/10 focus:ring-[#FF6B00] focus:border-[#FF6B00] rounded-xl"
                                        />
                                        {isSearchingProducts && (
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#FF6B00]" />
                                        )}

                                        {filteredProducts.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-[#002B40]/10 rounded-xl shadow-lg max-h-48 overflow-auto">
                                                {filteredProducts.map((product) => (
                                                    <button
                                                        key={product.id}
                                                        type="button"
                                                        onClick={() => addItem(product)}
                                                        className="w-full text-left px-4 py-3 hover:bg-[#FFF5EF] transition-colors flex items-center justify-between border-b border-[#002B40]/5 last:border-0"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-[#002B40] text-sm">{product.name}</span>
                                                            <span className="text-xs text-[#002B40]/40">R$ {product.price.toFixed(2)}</span>
                                                        </div>
                                                        <Plus className="h-4 w-4 text-[#FF6B00]" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Selected Items List */}
                            {selectedItems.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-auto pr-1">
                                    {selectedItems.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-[#002B40] text-sm">{item.product.name}</span>
                                                <span className="text-xs text-[#002B40]/40">
                                                    {item.quantity}x R$ {item.product.price.toFixed(2)} = R$ {(item.product.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="h-8 w-8 hover:bg-red-50 text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-6 border-t border-gray-100 flex flex-row items-center justify-between gap-3 bg-white w-full">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                className="flex-1 font-bold h-12 rounded-xl text-[#002B40]/60 border-[#002B40]/10"
                            >
                                Fechar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-[#FF6B00] hover:bg-[#E66000] text-white font-bold h-12 rounded-xl shadow-lg shadow-[#FF6B00]/20"
                            >
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Lançar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
