"use client"

import * as React from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { completePendingArenaSignupAction } from "@/modules/auth/actions/authActions"

type CreateArenaFromPendingClientProps = {
  pendingId: string
  arenaName: string
  email: string
}

export function CreateArenaFromPendingClient({
  pendingId,
  arenaName,
  email,
}: CreateArenaFromPendingClientProps) {
  const [loading, setLoading] = React.useState(false)

  const handleComplete = async () => {
    setLoading(true)
    const result = await completePendingArenaSignupAction(pendingId)
    setLoading(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success("Arena criada com sucesso.")
    const arenaId = result.data?.arenaId
    window.location.replace(arenaId ? `/dashboard/arenas/${arenaId}` : "/dashboard")
  }

  return (
    <div className="w-full space-y-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-arena-button text-white">
        <CheckCircle2 className="h-6 w-6" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Criar arena</h1>
        <p className="text-sm leading-relaxed text-white/75">
          E-mail confirmado para <span className="font-semibold text-white">{email}</span>.
          Vamos criar a arena <span className="font-semibold text-white">{arenaName}</span> e liberar seu painel web.
        </p>
      </div>

      <Button
        type="button"
        onClick={handleComplete}
        disabled={loading}
        className="w-full bg-arena-button hover:bg-arena-button-hover h-12 rounded-lg text-lg font-bold shadow-lg"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Concluir criação
      </Button>
    </div>
  )
}
