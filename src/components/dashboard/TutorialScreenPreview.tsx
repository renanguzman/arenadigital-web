'use client'

import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Package,
  RefreshCw,
  Settings,
  Star,
  Store,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type TutorialPreviewKey =
  | 'spaces'
  | 'athletes'
  | 'stations'
  | 'catalog'
  | 'memberships'
  | 'rotativo'
  | 'loyalty'
  | 'finance'
  | 'reports'
  | 'settings'

type TutorialPreview = {
  icon: LucideIcon
  title: string
  subtitle: string
  metrics: { label: string; value: string; tone?: string }[]
  tableTitle: string
  columns: string[]
  rows: string[][]
  bars: number[]
}

const previews: Record<TutorialPreviewKey, TutorialPreview> = {
  spaces: {
    icon: CalendarDays,
    title: 'Espaços',
    subtitle: 'Quadras e ambientes disponíveis para reserva',
    metrics: [
      { label: 'Espaços ativos', value: '08' },
      { label: 'Reservas hoje', value: '34', tone: 'text-emerald-600' },
      { label: 'Ocupação média', value: '72%' },
    ],
    tableTitle: 'Agenda de hoje',
    columns: ['Espaço', 'Horário', 'Atleta', 'Status'],
    rows: [
      ['Quadra Beach 01', '18:00 - 19:00', 'Marina Lopes', 'Confirmada'],
      ['Quadra Society', '19:30 - 20:30', 'Rafael Lima', 'Confirmada'],
      ['Salão Gourmet', '20:00 - 22:00', 'Camila Rocha', 'Pendente'],
    ],
    bars: [34, 48, 62, 54, 78, 88, 70],
  },
  athletes: {
    icon: Users,
    title: 'Atletas',
    subtitle: 'Cadastro e relacionamento com seus clientes',
    metrics: [
      { label: 'Atletas cadastrados', value: '1.248' },
      { label: 'Novos este mês', value: '+86', tone: 'text-emerald-600' },
      { label: 'Ativos no mês', value: '694' },
    ],
    tableTitle: 'Atletas recentes',
    columns: ['Nome', 'Contato', 'Última reserva', 'Perfil'],
    rows: [
      ['Marina Lopes', '(11) 98821-3044', 'Hoje, 18:00', 'Frequente'],
      ['Rafael Lima', '(11) 97654-1980', 'Hoje, 19:30', 'Frequente'],
      ['Camila Rocha', '(11) 91234-5501', 'Ontem, 20:00', 'Novo'],
    ],
    bars: [45, 52, 46, 70, 65, 78, 86],
  },
  stations: {
    icon: Store,
    title: 'Estações',
    subtitle: 'Operação de balcão, comandas e vendas',
    metrics: [
      { label: 'Comandas abertas', value: '12' },
      { label: 'Vendas hoje', value: 'R$ 2.840' },
      { label: 'Ticket médio', value: 'R$ 74,80' },
    ],
    tableTitle: 'Movimento da estação',
    columns: ['Comanda', 'Cliente', 'Itens', 'Total'],
    rows: [
      ['#1048', 'Mesa 04', '6 itens', 'R$ 186,00'],
      ['#1047', 'Marina Lopes', '3 itens', 'R$ 72,00'],
      ['#1046', 'Quadra Society', '8 itens', 'R$ 214,50'],
    ],
    bars: [28, 38, 44, 63, 58, 82, 76],
  },
  catalog: {
    icon: Package,
    title: 'Catálogo',
    subtitle: 'Produtos e serviços disponíveis na arena',
    metrics: [
      { label: 'Itens ativos', value: '96' },
      { label: 'Estoque baixo', value: '07', tone: 'text-amber-600' },
      { label: 'Serviços', value: '14' },
    ],
    tableTitle: 'Itens mais vendidos',
    columns: ['Item', 'Categoria', 'Estoque', 'Preço'],
    rows: [
      ['Água mineral 500ml', 'Bebidas', '84 un.', 'R$ 6,00'],
      ['Aluguel de raquete', 'Serviços', 'Disponível', 'R$ 18,00'],
      ['Bola de beach tennis', 'Produtos', '16 un.', 'R$ 42,00'],
    ],
    bars: [70, 54, 62, 84, 68, 76, 92],
  },
  memberships: {
    icon: ClipboardList,
    title: 'Mensalistas',
    subtitle: 'Planos recorrentes oferecidos pela sua arena',
    metrics: [
      { label: 'Planos ativos', value: '04' },
      { label: 'Mensalistas', value: '128' },
      { label: 'Receita recorrente', value: 'R$ 18.940' },
    ],
    tableTitle: 'Planos contratados',
    columns: ['Plano', 'Atletas', 'Vencimento', 'Situação'],
    rows: [
      ['Beach 2x por semana', '54 atletas', 'Dia 10', 'Ativo'],
      ['Society noturno', '38 atletas', 'Dia 15', 'Ativo'],
      ['Livre manhã', '36 atletas', 'Dia 05', 'Ativo'],
    ],
    bars: [44, 51, 58, 66, 72, 80, 88],
  },
  rotativo: {
    icon: RefreshCw,
    title: 'Rotativo',
    subtitle: 'Partidas abertas e créditos avulsos',
    metrics: [
      { label: 'Jogos hoje', value: '09' },
      { label: 'Vagas abertas', value: '14' },
      { label: 'Créditos vendidos', value: 'R$ 1.260' },
    ],
    tableTitle: 'Próximas partidas',
    columns: ['Horário', 'Modalidade', 'Inscritos', 'Status'],
    rows: [
      ['18:30', 'Beach Tennis', '3 de 4 atletas', '1 vaga'],
      ['19:00', 'Futevôlei', '4 de 4 atletas', 'Completo'],
      ['20:30', 'Beach Tennis', '2 de 4 atletas', '2 vagas'],
    ],
    bars: [24, 42, 56, 72, 64, 88, 80],
  },
  loyalty: {
    icon: Star,
    title: 'Programa de fidelidade',
    subtitle: 'Benefícios para aumentar a recorrência',
    metrics: [
      { label: 'Participantes', value: '582' },
      { label: 'Pontos emitidos', value: '24.680' },
      { label: 'Resgates no mês', value: '93' },
    ],
    tableTitle: 'Atletas em destaque',
    columns: ['Atleta', 'Pontos', 'Último movimento', 'Nível'],
    rows: [
      ['Marina Lopes', '2.480 pts', '+120 pontos', 'Ouro'],
      ['Rafael Lima', '1.960 pts', '+80 pontos', 'Prata'],
      ['Camila Rocha', '1.720 pts', '-400 pontos', 'Prata'],
    ],
    bars: [38, 46, 60, 72, 68, 84, 96],
  },
  finance: {
    icon: CircleDollarSign,
    title: 'Financeiro',
    subtitle: 'Entradas, saídas e visão de caixa',
    metrics: [
      { label: 'Receita no mês', value: 'R$ 84.320' },
      { label: 'Despesas', value: 'R$ 31.480' },
      { label: 'Resultado', value: 'R$ 52.840', tone: 'text-emerald-600' },
    ],
    tableTitle: 'Últimos lançamentos',
    columns: ['Descrição', 'Categoria', 'Data', 'Valor'],
    rows: [
      ['Reservas online', 'Receita', 'Hoje', '+ R$ 4.860,00'],
      ['Compra de bebidas', 'Estoque', 'Hoje', '- R$ 1.240,00'],
      ['Mensalidades', 'Receita', 'Ontem', '+ R$ 3.920,00'],
    ],
    bars: [44, 56, 50, 68, 74, 82, 92],
  },
  reports: {
    icon: BarChart3,
    title: 'Relatórios',
    subtitle: 'Indicadores para decisões mais rápidas',
    metrics: [
      { label: 'Taxa de ocupação', value: '72%' },
      { label: 'Inadimplência', value: '3,8%' },
      { label: 'Retenção', value: '84%' },
    ],
    tableTitle: 'Resumo por período',
    columns: ['Indicador', 'Este mês', 'Mês anterior', 'Variação'],
    rows: [
      ['Reservas', '842', '764', '+10,2%'],
      ['Receita média', 'R$ 100,14', 'R$ 94,80', '+5,6%'],
      ['Novos atletas', '86', '72', '+19,4%'],
    ],
    bars: [42, 54, 62, 58, 76, 84, 94],
  },
  settings: {
    icon: Settings,
    title: 'Configurações',
    subtitle: 'Equipe, assinatura e perfil da arena',
    metrics: [
      { label: 'Usuários da equipe', value: '08' },
      { label: 'Plano atual', value: 'Starter' },
      { label: 'Espaços utilizados', value: '08 de 10' },
    ],
    tableTitle: 'Equipe e permissões',
    columns: ['Usuário', 'Função', 'Unidade', 'Status'],
    rows: [
      ['André Martins', 'Gestor', 'Arena principal', 'Ativo'],
      ['Paula Souza', 'Financeiro', 'Arena principal', 'Ativo'],
      ['Lucas Lima', 'Caixa', 'Recepção', 'Ativo'],
    ],
    bars: [48, 52, 58, 64, 70, 76, 84],
  },
}

export function TutorialScreenPreview({ previewKey }: { previewKey: TutorialPreviewKey }) {
  const preview = previews[previewKey]
  const Icon = preview.icon

  return (
    <div className="h-full overflow-hidden rounded-md border border-slate-200 bg-[#F8FAFB] shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#E7F3F4] text-[#0D6672]">
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#0D3B45]">{preview.title}</h3>
            <p className="text-xs text-slate-500">{preview.subtitle}</p>
          </div>
        </div>
        <span className="rounded-md border border-[#F4C89F] bg-[#FFF7ED] px-2 py-1 text-[10px] font-bold uppercase text-[#A74300]">
          Dados ilustrativos
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-3">
          {preview.metrics.map((metric) => (
            <div key={metric.label} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-[11px] text-slate-500">{metric.label}</p>
              <p className={cn('mt-1 text-lg font-bold text-[#0D3B45]', metric.tone)}>{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-bold text-[#0D3B45]">{preview.tableTitle}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {preview.columns.map((column) => (
                      <th key={column} className="px-4 py-2 font-semibold">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.join('-')} className="border-t border-slate-100 text-slate-700">
                      {row.map((cell) => (
                        <td key={cell} className="whitespace-nowrap px-4 py-3">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hidden rounded-md border border-slate-200 bg-white p-4 xl:block">
            <p className="text-sm font-bold text-[#0D3B45]">Evolução semanal</p>
            <div className="mt-5 flex h-32 items-end gap-2">
              {preview.bars.map((height, index) => (
                <div key={`${height}-${index}`} className="flex flex-1 items-end">
                  <div
                    className="w-full rounded-t-sm bg-[#1B7B8A]"
                    style={{ height: `${height}%`, opacity: 0.45 + index * 0.07 }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[10px] text-slate-400">
              <span>Seg</span>
              <span>Dom</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
