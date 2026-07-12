import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { Logo } from "@/components/shared/Logo"
import { Button } from "@/components/ui/button"
import { CreateArenaFromPendingClient } from "@/components/auth/CreateArenaFromPendingClient"
import { getPendingArenaSignupAction } from "@/modules/auth/actions/authActions"

type CreateArenaPageProps = {
  searchParams: Promise<{ pending?: string }>
}

function buildSignInRedirect(pendingId: string) {
  const redirectTo = `/criar-arena?${new URLSearchParams({ pending: pendingId }).toString()}`
  return `/sign-in?${new URLSearchParams({ redirect_to: redirectTo }).toString()}`
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="w-full space-y-5 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Não foi possível criar a arena</h1>
        <p className="text-sm leading-relaxed text-white/75">{message}</p>
      </div>
      <Link href="/sign-up" className="block">
        <Button type="button" className="w-full bg-arena-button hover:bg-arena-button-hover h-12 rounded-lg text-lg font-bold shadow-lg">
          Voltar ao cadastro
        </Button>
      </Link>
    </div>
  )
}

export default async function CreateArenaPage({ searchParams }: CreateArenaPageProps) {
  const { pending } = await searchParams
  const pendingId = typeof pending === "string" ? pending : ""

  if (!pendingId) {
    return (
      <PageShell>
        <ErrorState message="O link de confirmação não trouxe uma solicitação válida. Faça o cadastro da arena novamente." />
      </PageShell>
    )
  }

  const pendingResult = await getPendingArenaSignupAction(pendingId)

  if (!pendingResult.success) {
    if (pendingResult.error === "Usuário não autenticado") {
      redirect(buildSignInRedirect(pendingId))
    }

    return (
      <PageShell>
        <ErrorState message={pendingResult.error} />
      </PageShell>
    )
  }

  if (!pendingResult.data) {
    return (
      <PageShell>
        <ErrorState message="Não encontramos os dados dessa solicitação. Faça o cadastro da arena novamente." />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <CreateArenaFromPendingClient
        pendingId={pendingResult.data.id}
        arenaName={pendingResult.data.arenaName}
        email={pendingResult.data.email}
      />
    </PageShell>
  )
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-y-auto bg-[#F0E6D2] p-4 py-8 md:py-12">
      <div className="m-auto flex w-full max-w-[520px] flex-col items-center rounded-3xl bg-arena-navy-800 p-6 shadow-2xl sm:p-8 md:p-12">
        <Link href="/">
          <Logo className="mb-8 cursor-pointer transition-opacity hover:opacity-80" />
        </Link>
        {children}
      </div>
    </div>
  )
}
