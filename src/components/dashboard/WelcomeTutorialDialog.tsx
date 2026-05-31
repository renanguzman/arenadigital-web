'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CURRENT_ONBOARDING_VERSION } from '@/lib/onboarding'
import { useDbUser } from '@/contexts/UserContext'

const SPOTLIGHT_GAP = 8

type TutorialStep = {
  selector: string
  eyebrow: string
  title: string
  description: string
}

type Spotlight = {
  top: number
  left: number
  width: number
  height: number
}

const steps: TutorialStep[] = [
  {
    selector: '[data-tutorial="dashboard-content"]',
    eyebrow: 'Visão geral',
    title: 'Comece pelo Dashboard',
    description:
      'Aqui você acompanha reservas, receita, espaços ativos e o movimento da arena em um só lugar.',
  },
  {
    selector: '[data-tutorial="arena-selector"]',
    eyebrow: 'Sua operação',
    title: 'Selecione a arena',
    description:
      'Quando houver mais de uma unidade, use este seletor para alternar rapidamente o contexto de trabalho.',
  },
  {
    selector: '[data-tutorial="sidebar-navigation"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Navegação',
    title: 'Acesse cada área pelo menu',
    description:
      'Espaços, atletas, estações e financeiro ficam organizados aqui. No primeiro acesso fora do Dashboard, você será direcionado ao cadastro do cartão.',
  },
]

export function WelcomeTutorialDialog() {
  const { dbUser } = useDbUser()
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null)
  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1
  const finishTutorial = useCallback(async () => {
    setOpen(false)
    try {
      const response = await fetch('/api/user/me/onboarding', { method: 'POST' })
      if (!response.ok) {
        console.error('[WelcomeTutorialDialog] Failed to complete onboarding', await response.text())
      }
    } catch (error) {
      console.error('[WelcomeTutorialDialog] Failed to complete onboarding', error)
    }
  }, [])

  const goForward = useCallback(() => {
    if (isLastStep) {
      void finishTutorial()
      return
    }
    setStepIndex((current) => current + 1)
  }, [finishTutorial, isLastStep])

  useEffect(() => {
    if (!dbUser || dbUser.onboarding_version >= CURRENT_ONBOARDING_VERSION) return
    const timer = window.setTimeout(() => setOpen(true), 0)
    return () => window.clearTimeout(timer)
  }, [dbUser])

  useLayoutEffect(() => {
    if (!open) return

    function updateSpotlight() {
      const target = [...document.querySelectorAll(step.selector)].find((element) => {
        if (!(element instanceof HTMLElement)) return false
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })

      if (!(target instanceof HTMLElement)) {
        setSpotlight(null)
        return
      }

      const rect = target.getBoundingClientRect()
      setSpotlight({
        top: Math.max(8, rect.top - SPOTLIGHT_GAP),
        left: Math.max(8, rect.left - SPOTLIGHT_GAP),
        width: Math.min(window.innerWidth - 16, rect.width + SPOTLIGHT_GAP * 2),
        height: Math.min(window.innerHeight - 16, rect.height + SPOTLIGHT_GAP * 2),
      })
    }

    updateSpotlight()
    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight, true)
    return () => {
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight, true)
    }
  }, [open, step.selector])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') void finishTutorial()
      if (event.key === 'ArrowRight') goForward()
      if (event.key === 'ArrowLeft') setStepIndex((current) => Math.max(0, current - 1))
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [finishTutorial, goForward, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {spotlight && (
        <div
          className="pointer-events-none absolute rounded-md border-2 border-arena-button bg-transparent shadow-[0_0_0_9999px_rgba(2,20,28,0.68),0_0_0_5px_rgba(255,107,0,0.18)] transition-all duration-300 ease-out"
          style={spotlight}
        />
      )}

      {!spotlight && <div className="absolute inset-0 bg-slate-950/68" />}

      <section className="absolute bottom-5 left-1/2 w-[min(430px,calc(100%-2rem))] -translate-x-1/2 rounded-md border border-slate-200 bg-white shadow-2xl md:bottom-8">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-[#C65100]">{step.eyebrow}</p>
            <h2 className="mt-1 text-lg font-bold text-[#0D3B45]">{step.title}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void finishTutorial()}
            className="size-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fechar tutorial"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-slate-600">{step.description}</p>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <div className="flex gap-1.5" aria-label={`Etapa ${stepIndex + 1} de ${steps.length}`}>
            {steps.map((tutorialStep, index) => (
              <span
                key={tutorialStep.selector}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === stepIndex ? 'w-6 bg-arena-button' : 'w-1.5 bg-slate-300'
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button type="button" variant="outline" onClick={() => setStepIndex((current) => current - 1)}>
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
            )}
            <Button type="button" onClick={goForward} className="bg-arena-button text-white hover:bg-arena-button-hover">
              {isLastStep ? (
                <>
                  <Check className="size-4" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  )
}
