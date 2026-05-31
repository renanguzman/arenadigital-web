'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CURRENT_ONBOARDING_VERSION } from '@/lib/onboarding'
import { useDbUser } from '@/contexts/UserContext'
import {
  TutorialScreenPreview,
  type TutorialPreviewKey,
} from '@/components/dashboard/TutorialScreenPreview'

const SPOTLIGHT_GAP = 8
const PANEL_WIDTH = 390
const PANEL_ESTIMATED_HEIGHT = 270
const VIEWPORT_GAP = 16

type TutorialStep = {
  selector: string
  eyebrow: string
  title: string
  description: string
  preview?: TutorialPreviewKey
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
      'Seu dia começa aqui. Acompanhe reservas, receita, espaços ativos e o movimento da arena em uma única visão.',
  },
  {
    selector: '[data-tutorial="arena-selector"]',
    eyebrow: 'Sua operação',
    title: 'Alterne entre suas arenas',
    description:
      'Quando houver mais de uma unidade, use este seletor para mudar o contexto de trabalho sem perder tempo.',
  },
  {
    selector: '[data-tutorial-menu="spaces"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Espaços e agenda',
    title: 'Organize cada espaço',
    description:
      'Cadastre quadras e espaços sociais, consulte horários e acompanhe as reservas do dia. A quantidade disponível respeita o plano contratado.',
    preview: 'spaces',
  },
  {
    selector: '[data-tutorial-menu="athletes"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Relacionamento',
    title: 'Conheça seus atletas',
    description:
      'Centralize os cadastros, consulte o histórico de reservas e mantenha os dados de contato sempre à mão.',
    preview: 'athletes',
  },
  {
    selector: '[data-tutorial-menu="stations"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Atendimento',
    title: 'Cuide da operação de balcão',
    description:
      'Use as estações para controlar comandas, vendas e o atendimento realizado em cada ponto da arena.',
    preview: 'stations',
  },
  {
    selector: '[data-tutorial-menu="catalog"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Catálogo',
    title: 'Gerencie produtos e serviços',
    description:
      'Organize bebidas, itens de estoque, locações e serviços oferecidos pela arena.',
    preview: 'catalog',
  },
  {
    selector: '[data-tutorial-menu="memberships"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Recorrência',
    title: 'Acompanhe os mensalistas',
    description:
      'Crie planos recorrentes para seus clientes e acompanhe as contratações da arena.',
    preview: 'memberships',
  },
  {
    selector: '[data-tutorial-menu="rotativo"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Partidas abertas',
    title: 'Preencha vagas com o Rotativo',
    description:
      'Monte partidas, venda créditos avulsos e acompanhe as vagas disponíveis em cada horário.',
    preview: 'rotativo',
  },
  {
    selector: '[data-tutorial-menu="loyalty"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Fidelização',
    title: 'Reconheça os clientes recorrentes',
    description:
      'Use pontos e benefícios para incentivar novas reservas e acompanhar os atletas mais engajados.',
    preview: 'loyalty',
  },
  {
    selector: '[data-tutorial-menu="finance"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Financeiro',
    title: 'Tenha clareza sobre o caixa',
    description:
      'Consulte entradas, saídas e resultados para entender a saúde financeira da operação.',
    preview: 'finance',
  },
  {
    selector: '[data-tutorial-menu="reports"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Indicadores',
    title: 'Acompanhe seus relatórios',
    description:
      'Analise ocupação, pagamentos e comportamento dos clientes para tomar decisões com mais contexto.',
    preview: 'reports',
  },
  {
    selector: '[data-tutorial-menu="settings"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Configurações',
    title: 'Finalize a preparação da arena',
    description:
      'Gerencie sua equipe, confira a assinatura e complete o perfil da arena. Ao sair do Dashboard pela primeira vez, você seguirá para o cadastro do cartão.',
    preview: 'settings',
  },
]

function getPanelPosition(spotlight: Spotlight | null, hasPreview = false): CSSProperties {
  if (!spotlight || typeof window === 'undefined' || window.innerWidth < 768) {
    return { bottom: VIEWPORT_GAP, left: VIEWPORT_GAP }
  }

  if (hasPreview) {
    return { bottom: VIEWPORT_GAP, right: VIEWPORT_GAP }
  }

  const availableRight = window.innerWidth - (spotlight.left + spotlight.width)
  if (availableRight >= PANEL_WIDTH + VIEWPORT_GAP * 2) {
    return {
      left: spotlight.left + spotlight.width + VIEWPORT_GAP,
      top: Math.min(
        Math.max(VIEWPORT_GAP, spotlight.top),
        window.innerHeight - PANEL_ESTIMATED_HEIGHT - VIEWPORT_GAP
      ),
    }
  }

  if (spotlight.left >= PANEL_WIDTH + VIEWPORT_GAP * 2) {
    return {
      left: spotlight.left - PANEL_WIDTH - VIEWPORT_GAP,
      top: Math.min(
        Math.max(VIEWPORT_GAP, spotlight.top),
        window.innerHeight - PANEL_ESTIMATED_HEIGHT - VIEWPORT_GAP
      ),
    }
  }

  return {
    bottom: VIEWPORT_GAP,
    left: Math.max(VIEWPORT_GAP, (window.innerWidth - PANEL_WIDTH) / 2),
  }
}

export function WelcomeTutorialDialog() {
  const pathname = usePathname()
  const { dbUser } = useDbUser()
  const [open, setOpen] = useState(false)
  const [completedLocally, setCompletedLocally] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null)
  const [panelPosition, setPanelPosition] = useState<CSSProperties>({
    bottom: VIEWPORT_GAP,
    left: VIEWPORT_GAP,
  })
  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  const finishTutorial = useCallback(async () => {
    setCompletedLocally(true)
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
    if (
      completedLocally ||
      pathname !== '/dashboard' ||
      !dbUser ||
      dbUser.onboarding_version >= CURRENT_ONBOARDING_VERSION
    ) {
      return
    }

    let timer: number | undefined
    const observer = new MutationObserver(() => showWhenDashboardIsReady())

    function showWhenDashboardIsReady() {
      const dashboard = document.querySelector('[data-tutorial="dashboard-content"]')
      if (!(dashboard instanceof HTMLElement) || dashboard.getBoundingClientRect().height === 0) return
      observer.disconnect()
      timer = window.setTimeout(() => {
        setStepIndex(0)
        setOpen(true)
      }, 350)
    }

    showWhenDashboardIsReady()
    if (!timer) {
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      observer.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [completedLocally, dbUser, pathname])

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
        setPanelPosition(getPanelPosition(null, Boolean(step.preview)))
        return
      }

      const rect = target.getBoundingClientRect()
      if (rect.top < VIEWPORT_GAP || rect.bottom > window.innerHeight - VIEWPORT_GAP) {
        target.scrollIntoView({ block: 'center' })
        window.requestAnimationFrame(updateSpotlight)
        return
      }

      const nextSpotlight = {
        top: Math.max(VIEWPORT_GAP / 2, rect.top - SPOTLIGHT_GAP),
        left: Math.max(VIEWPORT_GAP / 2, rect.left - SPOTLIGHT_GAP),
        width: Math.min(window.innerWidth - VIEWPORT_GAP, rect.width + SPOTLIGHT_GAP * 2),
        height: Math.min(window.innerHeight - VIEWPORT_GAP, rect.height + SPOTLIGHT_GAP * 2),
      }
      setSpotlight(nextSpotlight)
      setPanelPosition(getPanelPosition(nextSpotlight, Boolean(step.preview)))
    }

    updateSpotlight()
    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight, true)
    return () => {
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight, true)
    }
  }, [open, step.preview, step.selector])

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
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {spotlight && (
        <div
          className="pointer-events-none absolute z-[2] rounded-md border-2 border-arena-button bg-transparent shadow-[0_0_0_9999px_rgba(2,20,28,0.68),0_0_0_5px_rgba(255,107,0,0.18)] transition-all duration-300 ease-out"
          style={spotlight}
        />
      )}

      {!spotlight && <div className="absolute inset-0 z-[2] bg-slate-950/68" />}

      {step.preview && (
        <div className="pointer-events-none absolute inset-x-4 bottom-[17.5rem] top-[4.5rem] z-[3] md:bottom-4 md:left-[17rem] md:right-[26rem] md:top-4">
          <TutorialScreenPreview previewKey={step.preview} />
        </div>
      )}

      <section
        className="absolute z-[4] w-[min(390px,calc(100%-2rem))] rounded-md border border-slate-200 bg-white shadow-2xl transition-[top,left,bottom] duration-300 ease-out"
        style={panelPosition}
        aria-live="polite"
      >
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
            className="size-8 shrink-0 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fechar tutorial"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-slate-600">{step.description}</p>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <p className="shrink-0 text-xs font-semibold text-slate-500">
            {stepIndex + 1} de {steps.length}
          </p>

          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStepIndex((current) => current - 1)}
              >
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={goForward}
              className={cn('bg-arena-button text-white hover:bg-arena-button-hover')}
            >
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
