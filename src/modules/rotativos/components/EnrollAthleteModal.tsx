"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { z } from "zod"
import { enrollAthleteAction } from "@/modules/rotativos/actions/rotativoActions"
import { getAthletesByArenaAction } from "@/modules/athletes/actions/athleteActions"
import { getModoPagamentoAction } from "@/modules/finance/actions/financeActions"
import { CREDITO_PAYMENT_METHOD, type ModoPagamentoOption, type Rotativo } from "@/modules/rotativos/types/rotativo.types"

const schema = z.object({
  athleteId: z.string().min(1, "Selecione o atleta"),
  paymentMethod: z.string().min(1, "Selecione a forma de pagamento"),
  observacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  isOpen: boolean
  onClose: () => void
  arenaId: string
  rotativo: Rotativo | null
  onSuccess: () => void
}

export function EnrollAthleteModal({ isOpen, onClose, arenaId, rotativo, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [athletes, setAthletes] = useState<{ id: string; nome_perfil: string }[]>([])
  const [paymentMethods, setPaymentMethods] = useState<ModoPagamentoOption[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { athleteId: "", paymentMethod: "", observacao: "" },
  })

  useEffect(() => {
    if (!isOpen) return
    form.reset({ athleteId: "", paymentMethod: "", observacao: "" })

    Promise.all([
      getAthletesByArenaAction(arenaId),
      getModoPagamentoAction(),
    ]).then(([athletesRes, methodsRes]) => {
      if (athletesRes.success) {
        setAthletes(
          (athletesRes.data ?? []).map((a) => ({
            id: a.id,
            nome_perfil: a.name,
          }))
        )
      }
      if (methodsRes.success) {
        setPaymentMethods(methodsRes.data ?? [])
      }
    })
  }, [isOpen, arenaId, form])

  async function onSubmit(values: FormValues) {
    if (!rotativo) return
    setIsSubmitting(true)
    try {
      const result = await enrollAthleteAction({
        rotativoId: rotativo.id,
        arenaId,
        athleteId: values.athleteId,
        paymentMethod: values.paymentMethod,
        observacao: values.observacao,
      })

      if (result.success) {
        toast.success("Atleta inscrito com sucesso!")
        onSuccess()
        onClose()
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrever atleta no rotativo</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="athleteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Atleta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o atleta ou insira um novo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {athletes.map((athlete) => (
                        <SelectItem key={athlete.id} value={athlete.id}>
                          {athlete.nome_perfil}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={CREDITO_PAYMENT_METHOD}>Crédito de rotativo</SelectItem>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Fechar
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Inscrever
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
