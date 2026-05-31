'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CURRENT_ONBOARDING_VERSION } from '@/lib/onboarding'
import { useDbUser } from '@/contexts/UserContext'
import { useArena } from '@/contexts/ArenaContext'

const SPOTLIGHT_GAP = 8
const VIEWPORT_GAP = 16

type TutorialStep = {
  selector: string
  eyebrow: string
  title: string
  description: string
  route: (arenaId: string) => string
  dimBackground?: boolean
}

type Spotlight = {
  top: number
  left: number
  width: number
  height: number
}

const dashboardRoute = () => '/dashboard'
const arenaRoute = (path: string) => (arenaId: string) =>
  arenaId ? `/dashboard/${path.replace(':arenaId', arenaId)}` : '/dashboard'

const steps: TutorialStep[] = [
  {
    selector: '[data-tutorial="dashboard-main"]',
    eyebrow: 'Visao geral',
    title: 'Comece pelo Dashboard',
    description:
      'Seu dia comeca aqui. Acompanhe reservas, receita, espacos ativos e o movimento da arena em uma unica visao.',
    route: dashboardRoute,
    dimBackground: true,
  },
  {
    selector: '[data-tutorial="arena-selector"]',
    eyebrow: 'Sua operacao',
    title: 'Alterne entre suas arenas',
    description:
      'Quando houver mais de uma unidade, use este seletor para mudar o contexto de trabalho sem perder tempo.',
    route: dashboardRoute,
    dimBackground: true,
  },
  {
    selector: '[data-tutorial-menu="spaces"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Espacos e agenda',
    title: 'Organize cada espaco',
    description:
      'Esta e a agenda real da arena. Cadastre quadras e espacos sociais, consulte horarios e acompanhe as reservas do dia.',
    route: arenaRoute('arenas/:arenaId'),
  },
  {
    selector: '[data-tutorial-menu="athletes"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Relacionamento',
    title: 'Conheca seus atletas',
    description:
      'Nesta tela voce centraliza os cadastros, consulta o historico de reservas e mantem os dados de contato sempre a mao.',
    route: arenaRoute('athletes/:arenaId'),
  },
  {
    selector: '[data-tutorial-menu="stations"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Atendimento',
    title: 'Cuide da operacao de balcao',
    description:
      'As estacoes ajudam a controlar comandas, vendas e o atendimento realizado em cada ponto da arena.',
    route: arenaRoute('arenas/:arenaId/stations'),
  },
  {
    selector: '[data-tutorial-menu="catalog"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Catalogo',
    title: 'Gerencie produtos e servicos',
    description:
      'Organize bebidas, itens de estoque, locacoes e servicos oferecidos pela arena.',
    route: arenaRoute('settings/products/:arenaId'),
  },
  {
    selector: '[data-tutorial-menu="memberships"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Recorrencia',
    title: 'Acompanhe os mensalistas',
    description:
      'Crie planos recorrentes para seus clientes e acompanhe as contratacoes da arena.',
    route: arenaRoute('arenas/:arenaId/mensalistas'),
  },
  {
    selector: '[data-tutorial-menu="rotativo"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Partidas abertas',
    title: 'Preencha vagas com o Rotativo',
    description:
      'Monte partidas, venda creditos avulsos e acompanhe as vagas disponiveis em cada horario.',
    route: arenaRoute('rotativo/:arenaId'),
  },
  {
    selector: '[data-tutorial-menu="loyalty"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Fidelizacao',
    title: 'Reconheca os clientes recorrentes',
    description:
      'Use pontos e beneficios para incentivar novas reservas e acompanhar os atletas mais engajados.',
    route: arenaRoute('loyalty/:arenaId'),
  },
  {
    selector: '[data-tutorial-menu="finance"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Financeiro',
    title: 'Tenha clareza sobre o caixa',
    description:
      'Consulte entradas, saidas e resultados para entender a saude financeira da operacao.',
    route: arenaRoute('finance/:arenaId'),
  },
  {
    selector: '[data-tutorial-menu="reports"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Indicadores',
    title: 'Acompanhe seus relatorios',
    description:
      'Analise ocupacao, pagamentos e comportamento dos clientes para tomar decisoes com mais contexto.',
    route: arenaRoute('reports/:arenaId/clientes-overview'),
  },
  {
    selector: '[data-tutorial-menu="settings"], [data-tutorial="mobile-menu"]',
    eyebrow: 'Configuracoes',
    title: 'Finalize a preparacao da arena',
    description:
      'Gerencie sua equipe, confira a assinatura e complete o perfil da arena. Ao concluir, voce podera explorar sua operacao.',
    route: arenaRoute('settings/users/:arenaId'),
  },
]

function getPanelPosition(): CSSProperties {
  if (typeof window === 'undefined' || window.innerWidth < 768) {
    return { bottom: VIEWPORT_GAP, left: VIEWPORT_GAP }
  }
  return { right: VIEWPORT_GAP, top: VIEWPORT_GAP }
}

export function WelcomeTutorialDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { dbUser } = useDbUser()
  const { selectedArena, isLoadingArenas } = useArena()
  const [open, setOpen] = useState(false)
  const [completedLocally, setCompletedLocally] = useState(false)
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null)
  const [panelPosition, setPanelPosition] = useState<CSSProperties>(getPanelPosition)
  const isTutorialUrl = searchParams.get('tutorial') === '1'
  const parsedStep = Number(searchParams.get('step') ?? 0)
  const stepIndex = Number.isInteger(parsedStep) && parsedStep >= 0 && parsedStep < steps.length
    ? parsedStep
    : 0
  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1
  const needsTutorial = Boolean(
    dbUser && dbUser.onboarding_version < CURRENT_ONBOARDING_VERSION
  )
  const isVisible = open && isTutorialUrl && needsTutorial && !completedLocally

  const tutorialUrl = useCallback((index: number) => {
    const route = steps[index].route(selectedArena)
    return `${route}?tutorial=1&step=${index}`
  }, [selectedArena])

  const finishTutorial = useCallback(async () => {
    setCompletedLocally(true)
    setOpen(false)
    router.replace('/dashboard')
    try {
      const response = await fetch('/api/user/me/onboarding', { method: 'POST' })
      if (!response.ok) {
        console.error('[WelcomeTutorialDialog] Failed to complete onboarding', await response.text())
      }
    } catch (error) {
      console.error('[WelcomeTutorialDialog] Failed to complete onboarding', error)
    }
  }, [router])

  const goToStep = useCallback((index: number) => {
    router.push(tutorialUrl(index))
  }, [router, tutorialUrl])

  const goForward = useCallback(() => {
    if (isLastStep) {
      void finishTutorial()
      return
    }
    goToStep(stepIndex + 1)
  }, [finishTutorial, goToStep, isLastStep, stepIndex])

  useEffect(() => {
    if (
      completedLocally ||
      pathname !== '/dashboard' ||
      isTutorialUrl ||
      isLoadingArenas ||
      !selectedArena ||
      !needsTutorial
    ) {
      return
    }
    router.replace(tutorialUrl(0))
  }, [
    completedLocally,
    isLoadingArenas,
    isTutorialUrl,
    needsTutorial,
    pathname,
    router,
    selectedArena,
    tutorialUrl,
  ])

  useEffect(() => {
    if (!isTutorialUrl || !selectedArena) return

    for (const index of [stepIndex + 1, stepIndex + 2]) {
      if (index < steps.length) {
        router.prefetch(tutorialUrl(index))
      }
    }
  }, [isTutorialUrl, router, selectedArena, stepIndex, tutorialUrl])

  useEffect(() => {
    if (!isTutorialUrl || !needsTutorial || completedLocally) return
    const timer = window.setTimeout(() => setOpen(true), 120)
    return () => window.clearTimeout(timer)
  }, [completedLocally, isTutorialUrl, needsTutorial])

  useLayoutEffect(() => {
    if (!isVisible) return

    function updateSpotlight() {
      const target = [...document.querySelectorAll(step.selector)].find((element) => {
        if (!(element instanceof HTMLElement)) return false
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })

      setPanelPosition(getPanelPosition())
      if (!(target instanceof HTMLElement)) {
        setSpotlight(null)
        return
      }

      const rect = target.getBoundingClientRect()
      setSpotlight({
        top: Math.max(VIEWPORT_GAP / 2, rect.top - SPOTLIGHT_GAP),
        left: Math.max(VIEWPORT_GAP / 2, rect.left - SPOTLIGHT_GAP),
        width: Math.min(window.innerWidth - VIEWPORT_GAP, rect.width + SPOTLIGHT_GAP * 2),
        height: Math.min(window.innerHeight - VIEWPORT_GAP, rect.height + SPOTLIGHT_GAP * 2),
      })
    }

    updateSpotlight()
    window.addEventListener('resize', updateSpotlight)
    return () => window.removeEventListener('resize', updateSpotlight)
  }, [isVisible, pathname, step.selector])

  useEffect(() => {
    if (!isVisible) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') void finishTutorial()
      if (event.key === 'ArrowRight') goForward()
      if (event.key === 'ArrowLeft' && stepIndex > 0) goToStep(stepIndex - 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [finishTutorial, goForward, goToStep, isVisible, stepIndex])

  const spotlightClassName = useMemo(() => cn(
    'pointer-events-none absolute z-[2] rounded-md border-2 border-arena-button bg-transparent transition-all duration-300 ease-out',
    step.dimBackground && 'shadow-[0_0_0_9999px_rgba(2,20,28,0.62),0_0_0_5px_rgba(255,107,0,0.18)]',
  ), [step.dimBackground])

  useEffect(() => {
    onOpenChange?.(isVisible)
    return () => onOpenChange?.(false)
  }, [isVisible, onOpenChange])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {spotlight && <div className={spotlightClassName} style={spotlight} />}

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
              <Button type="button" variant="outline" size="sm" onClick={() => goToStep(stepIndex - 1)}>
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
            )}
            <Button type="button" size="sm" onClick={goForward} className="bg-arena-button text-white hover:bg-arena-button-hover">
              {isLastStep ? (
                <>
                  <Check className="size-4" />
                  Concluir
                </>
              ) : (
                <>
                  Proximo
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
