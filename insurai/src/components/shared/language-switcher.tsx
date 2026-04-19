import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

type LanguageSwitcherProps = {
    className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
    const { language, setLanguage, t } = useI18n()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!isOpen) {
            return
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false)
            }
        }

        window.addEventListener("mousedown", handlePointerDown)
        window.addEventListener("keydown", handleEscape)

        return () => {
            window.removeEventListener("mousedown", handlePointerDown)
            window.removeEventListener("keydown", handleEscape)
        }
    }, [isOpen])

    const currentLanguageLabel =
        language === "en"
            ? t("lang.en")
            : language === "fr"
                ? t("lang.fr")
                : t("lang.tn")

    const options = [
        { code: "en", label: t("lang.en") },
        { code: "fr", label: t("lang.fr") },
        { code: "tn", label: t("lang.tn") },
    ] as const

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen((previous) => !previous)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={t("lang.switch")}
                title={t("lang.switch")}
                className="gap-2"
            >
                {t("lang.switch")}: {currentLanguageLabel}
                <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
            </Button>

            {isOpen && (
                <div
                    role="menu"
                    aria-label={t("lang.switch")}
                    className="absolute right-0 z-40 mt-2 min-w-40 rounded-[8px] border border-[var(--neutral-300)] bg-[var(--neutral-0)] p-1 shadow-lg"
                >
                    {options.map((option) => (
                        <button
                            key={option.code}
                            type="button"
                            role="menuitemradio"
                            aria-checked={language === option.code}
                            className={cn(
                                "w-full rounded-[6px] px-2.5 py-2 text-left text-sm transition-colors",
                                language === option.code
                                    ? "bg-[var(--neutral-200)] text-[var(--palette-text-primary)]"
                                    : "text-[var(--palette-text-secondary)] hover:bg-[var(--neutral-100)] hover:text-[var(--palette-text-primary)]"
                            )}
                            onClick={() => {
                                setLanguage(option.code)
                                setIsOpen(false)
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
