import { type ReactNode, useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"

import { BrandLogo } from "@/components/shared/brand-logo"
import { LanguageSwitcher } from "@/components/shared/language-switcher"
import { useI18n } from "@/lib/i18n"

type AuthShellProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const { t } = useI18n()
  const [quoteIndex, setQuoteIndex] = useState(0)
  const rotatingQuotes = [
    t("auth.quote1", "Find your coverage in minutes"),
    t("auth.quote2", "No agent needed"),
    t("auth.quote3", "Tunisia's smartest insurance tool"),
  ]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % rotatingQuotes.length)
    }, 3200)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="grid min-h-screen auth-form-shell md:grid-cols-[minmax(320px,42%)_1fr]">
      <aside className="auth-left-panel hidden overflow-hidden p-10 text-[var(--neutral-0)] md:flex md:flex-col">
        <div className="flex h-full flex-col gap-8">
          <div className="flex items-center justify-between">
            <BrandLogo tone="light" className="text-3xl text-[var(--neutral-0)]" />
            <span className="auth-kicker-pill">{t("auth.trusted", "Trusted by early users")}</span>
          </div>

          <div>
            <p className="max-w-sm font-display text-[2.1rem] leading-tight font-bold text-[var(--neutral-0)]">
              {t("auth.leftTitle", "Insurance guidance made for Tunisia.")}
            </p>
            <div className="auth-stat-chip mt-6 inline-flex items-center gap-2 px-3 py-1.5 font-body text-sm">
              <ShieldCheck className="size-4" />
              {t("auth.leftStat", "1,200 agents for 12.5M people. You need clarity before you visit.")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <article className="auth-metric-card">
              <p className="font-display text-xl font-bold">12.5M</p>
              <p className="mt-1 text-xs">{t("auth.metric1", "Residents navigating insurance choices")}</p>
            </article>
            <article className="auth-metric-card">
              <p className="font-display text-xl font-bold">2.46%</p>
              <p className="mt-1 text-xs">{t("auth.metric2", "Current insurance penetration rate")}</p>
            </article>
          </div>

          <div className="auth-quote-slide rounded-[20px] border border-white/25 bg-white/12 p-5">
            <p className="font-display text-2xl leading-tight font-semibold text-white/90">{rotatingQuotes[quoteIndex]}</p>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[420px]">
          <div className="mb-4 hidden items-center justify-between sm:flex">
            <p className="auth-helper-line mb-0 font-body text-xs font-semibold uppercase tracking-[0.32px] text-[var(--palette-text-secondary)]">
              {t("auth.secure", "Secure onboarding")}
            </p>
            <LanguageSwitcher className="h-8 rounded-full px-3 text-xs" />
          </div>

          <div className="mb-8 md:hidden">
            <div className="mb-3 flex justify-center">
              <LanguageSwitcher className="h-8 rounded-full px-3 text-xs" />
            </div>
            <BrandLogo className="justify-center" />
          </div>

          <section className="auth-form-card w-full p-8 sm:p-10">
            <header className="mb-7 text-center sm:mb-8 sm:text-left">
              <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="mt-2 font-body text-sm text-muted-foreground">{subtitle}</p>
            </header>
            {children}
          </section>
        </div>
      </main>
    </div>
  )
}
