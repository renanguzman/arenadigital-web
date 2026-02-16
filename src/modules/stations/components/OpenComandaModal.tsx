"use client"

import { useEffect, useState, useRef, useCallback } from "react"
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
import { OrderService } from "../services/orderService"
import { CustomerService, StationCustomer } from "../services/customerService"
import { ProductService, Product } from "@/modules/products/services/productService"
import { AthleteService } from "@/modules/athletes/services/athleteService"
import { Plus, Search, Check, X, Loader2, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn, normalizeString } from "@/lib/utils"

const openComandaSchema = z.object({
    quantity: z.string().min(1, "Informe a quantidade"),
})

type OpenComandaValues = z.infer<typeof openComandaSchema>

interface SelectedItem {
    product: Product
    quantity: number
}

interface OpenComandaModalProps {
    isOpen: boolean
    onClose: () => void
    arenaId: string
    stationId: string
    onSuccess: () => void
    onRegisterNewCustomer: () => void
}

export function OpenComandaModal({
    isOpen,
    onClose,
    arenaId,
    stationId,
    onSuccess,
    onRegisterNewCustomer
}: OpenComandaModalProps) {
    const [customerSearch, setCustomerSearch] = useState("")
    const [filteredCustomers, setFilteredCustomers] = useState<any[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)

    const [productSearch, setProductSearch] = useState("")
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
    const [isSearchingProducts, setIsSearchingProducts] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)

    const customerSearchTimeout = useRef<NodeJS.Timeout | null>(null)
    const productSearchTimeout = useRef<NodeJS.Timeout | null>(null)

    const form = useForm<OpenComandaValues>({
        resolver: zodResolver(openComandaSchema),
        defaultValues: {
            quantity: "1",
        },
    })

    const handleCustomerSearch = (value: string) => {
        setCustomerSearch(value)
        if (selectedCustomer) setSelectedCustomer(null)

        if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current)

        if (value.length < 2) {
            setFilteredCustomers([])
            return
        }

        setIsSearchingCustomers(true)
        customerSearchTimeout.current = setTimeout(async () => {
            try {
                const [customersData, athletesData] = await Promise.all([
                    CustomerService.getCustomersByArena(arenaId),
                    AthleteService.getAthletesByArena(arenaId) // Fetch all for frontend filtering
                ])

                const normalizedValue = normalizeString(value)

                const combined = [
                    ...customersData
                        .filter(c => normalizeString(c.name).includes(normalizedValue))
                        .map(c => ({ id: `customer:${c.id}`, name: c.name, origin: 'station' })),
                    ...athletesData
                        .filter(a => normalizeString(a.name).includes(normalizedValue))
                        .map(a => ({ id: `athlete:${a.id}`, name: a.name, origin: 'athlete' }))
                ]

                setFilteredCustomers(combined)
            } catch (error) {
                console.error("Customer search error:", error)
            } finally {
                setIsSearchingCustomers(false)
            }
        }, 500)
    }

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

    async function onSubmit(data: OpenComandaValues) {
        if (!selectedCustomer) {
            toast.error("Selecione um cliente")
            return
        }
        if (selectedItems.length === 0) {
            toast.error("Adicione pelo menos um item")
            return
        }

        setIsSubmitting(true)
        try {
            const totalPrice = selectedItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
            const isAthlete = selectedCustomer.id.startsWith('athlete:')
            const actualId = selectedCustomer.id.split(':')[1]

            await OrderService.createOrderWithItems(
                {
                    arena_id: arenaId,
                    station_id: stationId,
                    atleta_id: isAthlete ? actualId : undefined,
                    customer_id: !isAthlete ? actualId : undefined,
                    status: 'open',
                    total_value: totalPrice
                },
                selectedItems.map(item => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    unit_price: item.product.price,
                    total_price: item.product.price * item.quantity
                }))
            )

            toast.success("Comanda aberta com sucesso!")
            onSuccess()
            handleClose()
        } catch (error) {
            console.error("Error opening comanda:", error)
            toast.error("Erro ao abrir comanda.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        form.reset()
        setCustomerSearch("")
        setSelectedCustomer(null)
        setFilteredCustomers([])
        setProductSearch("")
        setSelectedItems([])
        setFilteredProducts([])
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-black text-[#002B40]">
                        Abrir nova comanda
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                        {/* Cliente Search */}
                        <div className="space-y-2 relative">
                            <Label className="text-[#002B40] font-bold">Cliente</Label>
                            {!selectedCustomer ? (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#002B40]/20" />
                                    <Input
                                        placeholder="Selecione um cliente vinculado ou insira um novo"
                                        value={customerSearch}
                                        onChange={(e) => handleCustomerSearch(e.target.value)}
                                        className="pl-10 h-12 border-[#002B40]/10 focus:ring-[#FF6B00] focus:border-[#FF6B00] rounded-xl"
                                    />
                                    {isSearchingCustomers && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#FF6B00]" />
                                    )}

                                    {(filteredCustomers.length > 0 || customerSearch.length >= 2) && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-[#002B40]/10 rounded-xl shadow-lg max-h-48 overflow-auto">
                                            {filteredCustomers.map((customer) => (
                                                <button
                                                    key={customer.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCustomer(customer)
                                                        setCustomerSearch(customer.name)
                                                        setFilteredCustomers([])
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-[#FFF5EF] transition-colors flex items-center justify-between border-b border-[#002B40]/5 last:border-0"
                                                >
                                                    <span className="font-semibold text-[#002B40] text-sm">{customer.name}</span>
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => onRegisterNewCustomer()}
                                                className="w-full text-left px-4 py-3 hover:bg-[#FFF5EF] transition-colors flex items-center gap-2 text-[#FF6B00] font-bold text-sm"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Cadastrar novo +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-[#FFF5EF] border border-[#FFE4D3] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-[#FF6B00]/10 flex items-center justify-center">
                                            <Check className="h-4 w-4 text-[#FF6B00]" />
                                        </div>
                                        <span className="font-semibold text-[#002B40] text-sm">{selectedCustomer.name}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        onClick={() => setSelectedCustomer(null)}
                                        className="hover:bg-red-50 text-red-500"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Multi-Item Section */}
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
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Abrir"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
