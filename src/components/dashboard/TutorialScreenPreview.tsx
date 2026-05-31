'use client'

import type { ReactNode } from 'react'
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Filter,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
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

type TableProps = {
  columns: string[]
  rows: ReactNode[][]
}

function MockTable({ columns, rows }: TableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-100 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-100">
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold text-[#007793]">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="whitespace-nowrap px-3 py-3 font-medium text-[#0D3B45]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'orange'
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-1 text-[10px] font-bold',
        tone === 'neutral' && 'bg-slate-100 text-slate-600',
        tone === 'success' && 'bg-emerald-100 text-emerald-700',
        tone === 'warning' && 'bg-amber-100 text-amber-700',
        tone === 'orange' && 'bg-orange-100 text-orange-700'
      )}
    >
      {children}
    </span>
  )
}

function PreviewHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-xl font-black tracking-tight text-[#0D3B45]">{title}</h3>
        <p className="mt-0.5 text-xs font-medium text-[#0D3B45]/60">{subtitle}</p>
      </div>
      {action && (
        <button className="flex shrink-0 items-center gap-1.5 rounded-md bg-arena-button px-3 py-2 text-[11px] font-bold text-white">
          <Plus className="size-3.5" />
          {action}
        </button>
      )}
    </div>
  )
}

function Tabs({ items, active = 0 }: { items: string[]; active?: number }) {
  return (
    <div className="flex gap-6 border-b border-[#0D3B45]/10">
      {items.map((item, index) => (
        <span
          key={item}
          className={cn(
            'relative pb-2 text-xs font-bold',
            index === active ? 'text-[#0D3B45]' : 'text-[#007793]'
          )}
        >
          {item}
          {index === active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#20B2AA]" />}
        </span>
      ))}
    </div>
  )
}

function SearchField({ label }: { label: string }) {
  return (
    <div className="flex h-9 min-w-[170px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[11px] text-slate-400">
      <Search className="size-3.5" />
      {label}
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase text-[#0D3B45]/40">{label}</p>
      <p className={cn('mt-1 text-lg font-black text-[#0D3B45]', tone)}>{value}</p>
    </div>
  )
}

function MediaCard({
  title,
  detail,
  icon,
}: {
  title: string
  detail: string
  icon: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-md bg-[linear-gradient(135deg,#F97415_0%,#F9A91F_48%,#FCE38A_100%)] text-white shadow-md">
      <div className="flex h-20 items-center justify-center bg-white/10 text-white/55">{icon}</div>
      <div className="p-3">
        <p className="text-xs font-bold">{title}</p>
        <p className="mt-1 text-lg font-black">{detail}</p>
        <p className="text-[10px] font-semibold text-white/90">hoje</p>
      </div>
    </div>
  )
}

function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-hidden rounded-md border border-slate-200 bg-[#F8FAFB] shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <p className="text-xs font-black uppercase text-[#0D3B45]">Arena Digital</p>
        <Badge tone="orange">Dados ilustrativos</Badge>
      </div>
      <div className="h-[calc(100%-42px)] overflow-hidden p-4">{children}</div>
    </div>
  )
}

function SpacesPreview() {
  return (
    <div className="space-y-4">
      <PreviewHeader title="Arena" subtitle="Gerencie quadras, reservas e disponibilidades." />
      <Tabs items={['Espaços', 'Cadastros']} />
      <div className="flex justify-end gap-2">
        <button className="rounded-md bg-[#0D3B45]/10 px-3 py-2 text-[11px] font-bold text-[#0D3B45]">
          Horários disponíveis
        </button>
        <button className="rounded-md bg-[#0D3B45] px-3 py-2 text-[11px] font-bold text-white">
          Ver operação do dia
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MediaCard title="Quadra Beach 01" detail="7 / 12 reservas" icon={<LayoutGrid className="size-8" />} />
        <MediaCard title="Quadra Society" detail="9 / 10 reservas" icon={<CalendarDays className="size-8" />} />
        <MediaCard title="Salão Gourmet" detail="3 / 5 reservas" icon={<Store className="size-8" />} />
      </div>
    </div>
  )
}

function AthletesPreview() {
  return (
    <div className="space-y-4">
      <PreviewHeader
        title="Atletas"
        subtitle="Faça a gestão dos atletas, envie e desconte moedas."
        action="Cadastrar atleta"
      />
      <div className="rounded-md border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-[#0D3B45]">Atletas vinculados</p>
        <SearchField label="Buscar por atleta" />
        <div className="mt-3">
          <MockTable
            columns={['Nome', 'CPF', 'Telefone', 'Moedas', 'Ações']}
            rows={[
              ['Marina Lopes', '***.982.***-10', '(11) 98821-3044', '2.480', <MoreHorizontal key="1" className="size-4" />],
              ['Rafael Lima', '***.456.***-32', '(11) 97654-1980', '1.960', <MoreHorizontal key="2" className="size-4" />],
              ['Camila Rocha', '***.104.***-51', '(11) 91234-5501', '1.720', <MoreHorizontal key="3" className="size-4" />],
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function StationsPreview() {
  return (
    <div className="space-y-4">
      <PreviewHeader title="Estações" subtitle="Gerencie suas estações, caixas, comandas e itens." action="Cadastrar estação" />
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-[#0D3B45]/45">
        <Filter className="size-3.5" />
        Filtros
        {['Todos os tipos', 'Mais recentes', 'Ativo'].map((filter) => (
          <span key={filter} className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 normal-case text-[#0D3B45]/70">
            {filter}
            <ChevronDown className="size-3" />
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MediaCard title="Bar principal" detail="8 comandas" icon={<Store className="size-8" />} />
        <MediaCard title="Recepção" detail="3 comandas" icon={<Store className="size-8" />} />
        <MediaCard title="Loja" detail="1 comanda" icon={<Store className="size-8" />} />
      </div>
    </div>
  )
}

function CatalogPreview() {
  return (
    <div className="space-y-4">
      <PreviewHeader title="Catálogo" subtitle="Produtos com estoque e serviços cobráveis." />
      <Tabs items={['Produtos', 'Serviços']} />
      <div className="rounded-md border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex justify-between gap-3">
          <SearchField label="Buscar produtos..." />
          <button className="rounded-md bg-arena-button px-3 text-[11px] font-bold text-white">Cadastrar produto</button>
        </div>
        <MockTable
          columns={['Nome', 'Tipo', 'Estação', 'Valor', 'Estoque', 'Status']}
          rows={[
            ['Água mineral 500ml', 'Produto', 'Bar', 'R$ 6,00', <b key="1" className="text-emerald-600">84 un.</b>, <Badge key="s1" tone="success">Ativo</Badge>],
            ['Isotônico', 'Produto', 'Bar', 'R$ 12,00', <b key="2" className="text-emerald-600">26 un.</b>, <Badge key="s2" tone="success">Ativo</Badge>],
            ['Bola beach tennis', 'Produto', 'Loja', 'R$ 42,00', <b key="3" className="text-amber-600">7 un.</b>, <Badge key="s3" tone="warning">Baixo</Badge>],
          ]}
        />
      </div>
    </div>
  )
}

function MembershipsPreview() {
  return (
    <div className="space-y-4">
      <PreviewHeader title="Mensalistas" subtitle="Gerencie todos os planos mensais de todos os espaços da arena." />
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Mensalistas ativos" value="128" />
        <Metric label="Receita mensal prevista" value="R$ 18.940" tone="text-emerald-600" />
        <Metric label="Aguardando confirmação" value="07" tone="text-orange-600" />
      </div>
      <MockTable
        columns={['Responsável', 'Espaço', 'Dia / Horário', 'Valor mensal', 'Status']}
        rows={[
          ['Marina Lopes', 'Quadra Beach 01', 'Terça, 18:00', 'R$ 320,00', <Badge key="1" tone="success">Ativo</Badge>],
          ['Rafael Lima', 'Quadra Society', 'Quinta, 20:00', 'R$ 480,00', <Badge key="2" tone="success">Ativo</Badge>],
          ['Camila Rocha', 'Quadra Beach 02', 'Sábado, 09:00', 'R$ 280,00', <Badge key="3" tone="warning">Pendente</Badge>],
        ]}
      />
    </div>
  )
}

function RotativoPreview() {
  return (
    <div className="space-y-4">
      <PreviewHeader title="Rotativo" subtitle="Organize sessões de jogo aberto e gerencie os participantes." />
      <Tabs items={['Cadastrados', 'Gestão de créditos']} />
      <div className="flex justify-between gap-3">
        <SearchField label="Buscar por atleta" />
        <button className="rounded-md bg-[#0D3B45] px-3 text-[11px] font-bold text-white">Cadastrar rotativo +</button>
      </div>
      <MockTable
        columns={['Status', 'Data', 'Modalidade', 'Horário', 'Valor', 'Inscritos']}
        rows={[
          [<Badge key="1" tone="success">Ativo</Badge>, '30/05/2026', 'Beach Tennis', '18:30 - 19:30', 'R$ 40,00', '3 de 4'],
          [<Badge key="2" tone="success">Ativo</Badge>, '30/05/2026', 'Futevôlei', '19:00 - 20:00', 'R$ 35,00', '4 de 4'],
          [<Badge key="3" tone="success">Ativo</Badge>, '31/05/2026', 'Beach Tennis', '20:30 - 21:30', 'R$ 40,00', '2 de 4'],
        ]}
      />
    </div>
  )
}

function LoyaltyPreview() {
  const activity = [
    ['Marina Lopes', '+ $ 120,00'],
    ['Rafael Lima', '+ $ 80,00'],
  ]
  return (
    <div className="space-y-4">
      <PreviewHeader title="Programa de Fidelidade" subtitle="Faça a gestão da sua moeda de fidelidade." />
      <div className="grid grid-cols-2 gap-3">
        {['Últimos envios', 'Últimos resgates'].map((title, index) => (
          <div key={title} className="rounded-md border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#0D3B45]">{title}</p>
              <span className="text-lg font-bold text-arena-button">+</span>
            </div>
            <div className="mt-2 space-y-2">
              {activity.map(([name, value], rowIndex) => (
                <div key={`${name}-${rowIndex}`} className="flex justify-between rounded-md bg-[#FFF5EF] p-2 text-[10px]">
                  <span className="font-semibold text-[#0D3B45]">{name}</span>
                  <span className={cn('font-bold', index === 0 ? 'text-arena-button' : 'text-red-500')}>
                    {index === 0 ? value : value.replace('+', '-')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="col-span-2 rounded-md border border-slate-100 bg-white p-3 shadow-sm">
          <p className="mb-2 text-sm font-bold text-[#0D3B45]">Top atletas com mais moedas</p>
          {['1. Marina Lopes — $ 2.480', '2. Rafael Lima — $ 1.960', '3. Camila Rocha — $ 1.720'].map((item) => (
            <p key={item} className="border-t border-slate-100 py-2 text-[11px] font-semibold text-[#0D3B45]">{item}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

function FinancePreview() {
  return (
    <div className="space-y-4">
      <PreviewHeader title="Financeiro" subtitle="Controle suas entradas e saídas em um só lugar." />
      <div className="grid grid-cols-[minmax(0,1fr)_1.2fr] gap-3">
        <div className="space-y-3">
          <div className="rounded-md bg-[linear-gradient(135deg,#FF7A00,#FFB800)] p-4 text-white shadow-md">
            <p className="text-xs font-bold text-white/80">Saldo atual</p>
            <p className="mt-1 text-2xl font-black">R$ 52.840,00</p>
            <p className="text-[10px] font-bold uppercase text-white/65">Lucro líquido acumulado</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Entradas do mês" value="R$ 84.320" tone="text-[#20B2AA]" />
            <Metric label="Despesas do mês" value="R$ 31.480" tone="text-arena-button" />
          </div>
        </div>
        <div className="rounded-md border border-slate-100 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-arena-button" />
            <p className="text-sm font-bold text-[#0D3B45]">Comparativo</p>
          </div>
          <div className="mt-6 flex h-32 items-end gap-2">
            {[44, 58, 52, 72, 66, 84, 94].map((height, index) => (
              <div key={index} className="flex flex-1 items-end">
                <div className="w-full rounded-t-sm bg-arena-button" style={{ height: `${height}%`, opacity: 0.5 + index * 0.06 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportsPreview() {
  return (
    <div className="space-y-4">
      <PreviewHeader title="Atletas e clientes" subtitle="Selecione uma barra para visualizar os clientes de cada grupo." />
      <div className="grid grid-cols-[190px_minmax(0,1fr)] gap-3">
        <div className="rounded-md border border-slate-100 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-[#0D3B45]/60">Funil de clientes</p>
          <div className="mt-4 space-y-3">
            {[
              ['Ativos', '100%'],
              ['Recorrentes', '76%'],
              ['Novos', '54%'],
              ['Inativos', '32%'],
            ].map(([label, width], index) => (
              <div key={label}>
                <p className="mb-1 text-[10px] font-semibold text-[#0D3B45]">{label}</p>
                <div className="h-3 rounded-r-full bg-[#20B2AA]" style={{ width, opacity: 1 - index * 0.15 }} />
              </div>
            ))}
          </div>
        </div>
        <MockTable
          columns={['Nome', 'Esportes', 'Reservas']}
          rows={[
            ['Marina Lopes', 'Beach Tennis', '24'],
            ['Rafael Lima', 'Society', '18'],
            ['Camila Rocha', 'Beach Tennis', '12'],
          ]}
        />
      </div>
    </div>
  )
}

function SettingsPreview() {
  return (
    <div className="space-y-4">
      <PreviewHeader title="Usuários" subtitle="Gerencie os usuários e permissões da arena." action="Cadastrar usuário" />
      <SearchField label="Buscar por nome ou e-mail..." />
      <MockTable
        columns={['Nome', 'E-mail', 'Perfil', 'Status']}
        rows={[
          ['André Martins', 'andre@arena.com', <Badge key="1">Gestor</Badge>, <Badge key="s1" tone="success">Ativo</Badge>],
          ['Paula Souza', 'paula@arena.com', <Badge key="2">Financeiro</Badge>, <Badge key="s2" tone="success">Ativo</Badge>],
          ['Lucas Lima', 'lucas@arena.com', <Badge key="3">Caixa</Badge>, <Badge key="s3" tone="success">Ativo</Badge>],
        ]}
      />
      <div className="grid grid-cols-3 gap-3">
        {[['Administrador', Settings], ['Gestor', Users], ['Caixa', Store]].map(([label, Icon]) => {
          const ProfileIcon = Icon as typeof Settings
          return (
            <div key={label as string} className="flex items-center gap-2 rounded-md border border-slate-100 bg-white p-3 shadow-sm">
              <ProfileIcon className="size-4 text-arena-button" />
              <span className="text-[11px] font-bold text-[#0D3B45]">{label as string}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const previews: Record<TutorialPreviewKey, () => ReactNode> = {
  spaces: SpacesPreview,
  athletes: AthletesPreview,
  stations: StationsPreview,
  catalog: CatalogPreview,
  memberships: MembershipsPreview,
  rotativo: RotativoPreview,
  loyalty: LoyaltyPreview,
  finance: FinancePreview,
  reports: ReportsPreview,
  settings: SettingsPreview,
}

export function TutorialScreenPreview({ previewKey }: { previewKey: TutorialPreviewKey }) {
  const Preview = previews[previewKey]
  return (
    <PreviewFrame>
      <Preview />
    </PreviewFrame>
  )
}
