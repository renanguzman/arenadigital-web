"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type StandardModalSize = "default" | "wide"

const SIZE_TO_MAX_WIDTH: Record<StandardModalSize, string> = {
    default: "sm:max-w-[588px]",
    wide: "sm:max-w-[960px]",
}

const STANDARD_SHADOW =
    "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_rgba(16,24,40,0.06),0_16px_40px_rgba(16,24,40,0.08)]"

export interface StandardModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: React.ReactNode
    description?: React.ReactNode
    size?: StandardModalSize
    /** Largura customizada em px quando `size` não atende (ex.: 720). Sobrescreve `size`. */
    maxWidth?: number
    showCloseButton?: boolean
    /** Slot do rodapé (botões de ação). Renderizado fora da área de scroll. */
    footer?: React.ReactNode
    /** Classes extras para o `DialogContent`. */
    className?: string
    /** Classes extras para o container do corpo (scroll area). */
    bodyClassName?: string
    children: React.ReactNode
}

export function StandardModal({
    open,
    onOpenChange,
    title,
    description,
    size = "default",
    maxWidth,
    showCloseButton = true,
    footer,
    className,
    bodyClassName,
    children,
}: StandardModalProps) {
    const widthClass = maxWidth ? "" : SIZE_TO_MAX_WIDTH[size]
    const widthStyle = maxWidth ? { maxWidth: `${maxWidth}px` } : undefined

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
                />
                <DialogPrimitive.Content
                    style={widthStyle}
                    className={cn(
                        "fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "outline-none duration-200",
                        "w-full max-w-[calc(100%-2rem)]",
                        widthClass,
                        "rounded-[16px] border border-[#C2C7CE] bg-white",
                        STANDARD_SHADOW,
                        "flex flex-col p-10 gap-[30px]",
                        "max-h-[calc(100vh-4rem)]",
                        className,
                    )}
                >
                    <div className="flex h-10 shrink-0 items-center justify-between gap-4">
                        <DialogPrimitive.Title className="truncate font-['Manrope'] text-[24px] font-semibold leading-[140%] text-[#003049]">
                            {title}
                        </DialogPrimitive.Title>
                        {showCloseButton && (
                            <DialogPrimitive.Close
                                aria-label="Fechar"
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#003049] opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-arena-button"
                            >
                                <XIcon className="h-5 w-5" />
                            </DialogPrimitive.Close>
                        )}
                    </div>

                    {description ? (
                        <DialogPrimitive.Description className="sr-only">
                            {description}
                        </DialogPrimitive.Description>
                    ) : (
                        <DialogPrimitive.Description className="sr-only">{
                            typeof title === "string" ? title : "Modal"
                        }</DialogPrimitive.Description>
                    )}

                    <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>
                        {children}
                    </div>

                    {footer && <div className="shrink-0">{footer}</div>}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}
