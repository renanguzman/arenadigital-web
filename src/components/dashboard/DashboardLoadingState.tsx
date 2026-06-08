import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface DashboardBlocksLoadingProps {
  className?: string
  headerClassName?: string
  gridClassName?: string
  cardClassName?: string
  cardCount?: number
  contentClassName?: string
}

export function DashboardBlocksLoading({
  className,
  headerClassName = "h-10 w-64",
  gridClassName = "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
  cardClassName = "h-40 w-full",
  cardCount = 3,
  contentClassName = "h-[400px] w-full",
}: DashboardBlocksLoadingProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <Skeleton className={headerClassName} />
      <div className={gridClassName}>
        {Array.from({ length: cardCount }).map((_, index) => (
          <Skeleton key={index} className={cardClassName} />
        ))}
      </div>
      {contentClassName ? <Skeleton className={contentClassName} /> : null}
    </div>
  )
}

interface DashboardHeaderLoadingProps {
  className?: string
  titleClassName?: string
  subtitleClassName?: string
  actionClassName?: string
}

export function DashboardHeaderLoading({
  className,
  titleClassName = "h-8 w-40",
  subtitleClassName = "h-4 w-56",
  actionClassName,
}: DashboardHeaderLoadingProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="space-y-2">
        <Skeleton className={titleClassName} />
        <Skeleton className={subtitleClassName} />
      </div>
      {actionClassName ? <Skeleton className={actionClassName} /> : null}
    </div>
  )
}

interface DashboardTableLoadingProps {
  columns: number
  rows?: number
  className?: string
}

export function DashboardTableLoading({
  columns,
  rows = 8,
  className,
}: DashboardTableLoadingProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border", className)}>
      <div className="border-b bg-muted/40 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-4" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b p-4">
          <div
            className="grid items-center gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton key={columnIndex} className="h-4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
