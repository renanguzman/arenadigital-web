'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CreditCard, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDbUser } from '@/contexts/UserContext'

const STORAGE_PREFIX = 'arena-welcome-tutorial-seen'

export function WelcomeTutorialDialog() {
  const { dbUser } = useDbUser()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!dbUser?.id) return
    const key = `${STORAGE_PREFIX}:${dbUser.id}`
    if (window.localStorage.getItem(key)) return
    const timer = window.setTimeout(() => setOpen(true), 0)
    return () => window.clearTimeout(timer)
  }, [dbUser?.id])

  function finishTutorial() {
    if (dbUser?.id) {
      window.localStorage.setItem(`${STORAGE_PREFIX}:${dbUser.id}`, 'true')
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : finishTutorial())}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-xl border-slate-200 p-0 sm:max-w-xl">
        <div className="border-b border-slate-200 bg-arena-navy-800 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Bem-vindo à Arena Digital</DialogTitle>
            <DialogDescription className="text-white/70">
              Seu painel já está pronto para organizar a operação da arena.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-4 px-6 py-5">
          <div className="flex gap-3">
            <LayoutDashboard className="mt-0.5 size-5 shrink-0 text-[#1B7B8A]" />
            <div>
              <p className="text-sm font-semibold text-[#0D3B45]">Comece pelo Dashboard</p>
              <p className="text-sm text-slate-600">Acompanhe reservas, espaços ativos e o resumo do dia.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-[#C65100]" />
            <div>
              <p className="text-sm font-semibold text-[#0D3B45]">Cadastre o cartão</p>
              <p className="text-sm text-slate-600">Ao acessar outra área pela primeira vez, escolha um plano para liberar a gestão.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-[#0D3B45]">Respeite o limite do plano</p>
              <p className="text-sm text-slate-600">A criação de espaços segue a quantidade contratada para a arena.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 px-6 py-4">
          <Button onClick={finishTutorial} className="bg-arena-button text-white hover:bg-arena-button-hover">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
