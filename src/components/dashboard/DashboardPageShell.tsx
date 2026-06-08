import type { ComponentType, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface DashboardPageProps {
  children: ReactNode
  className?: string
}

export function DashboardPage({ children, className }: DashboardPageProps) {
  return <div className={cn("space-y-8", className)}>{children}</div>
}

interface DashboardPageHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: ComponentType<{ className?: string }>
  actions?: ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

export function DashboardPageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
  titleClassName,
  descriptionClassName,
}: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center",
        className
      )}
    >
      <div className="space-y-1">
        <h1
          className={cn(
            "flex items-center gap-2 text-3xl font-black tracking-tight text-arena-navy-800",
            titleClassName
          )}
        >
          {Icon ? <Icon className="h-8 w-8 text-primary" /> : null}
          {title}
        </h1>
        {description ? (
          <p className={cn("font-medium text-arena-navy-800/60", descriptionClassName)}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}
