import { MapPin, Search, Shield } from "lucide-react"

import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type HowItWorksProps = {
  compact?: boolean
}

export function HowItWorks({ compact = false }: HowItWorksProps) {
  const { t } = useI18n()
  const steps = [
    {
      icon: Shield,
      title: t("how.step1.title", "Answer 5 questions"),
      description: t(
        "how.step1.desc",
        "Our chatbot identifies your needs based on your life situation."
      ),
    },
    {
      icon: Search,
      title: t("how.step2.title", "We match you"),
      description: t("how.step2.desc", "See ranked offers from all Tunisian insurers in one place."),
    },
    {
      icon: MapPin,
      title: t("how.step3.title", "Visit your agency"),
      description: t(
        "how.step3.desc",
        "We prepare a summary card you bring to the insurer. No confusion, no guesswork."
      ),
    },
  ]

  return (
    <section
      id="how-it-works"
      className={cn(
        "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8",
        compact ? "py-12" : "py-20"
      )}
    >
      <div className={cn("grid gap-8", compact ? "grid-cols-1" : "lg:grid-cols-[280px_1fr]")}>
        <aside className={cn("how-intro-panel", compact && "text-center")}>
          <p className="how-intro-kicker">{t("how.kicker", "How it works")}</p>
          <h2 className="mt-3 font-display text-3xl tracking-[-0.02em] text-foreground sm:text-4xl">
            {t("how.title", "Three steps to the right coverage")}
          </h2>
          <p className="mt-4 font-body text-sm leading-relaxed text-[var(--palette-text-secondary)]">
            {t(
              "how.subtitle",
              "Structured guidance, transparent options, and a final shortlist you can bring to your insurer without confusion."
            )}
          </p>
        </aside>

        <div className={cn("relative", compact && "mt-2")}>
          <div
            className="how-connector pointer-events-none absolute top-[94px] left-[10%] hidden w-[80%] md:block"
            aria-hidden
          />

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon

              return (
                <article
                  key={step.title}
                  className="how-step-card relative p-6"
                >
                  <span className="how-step-number" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="how-icon-wrap mt-8">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="how-step-title mt-5 text-foreground">
                    {step.title}
                  </h3>
                  <p className="how-step-description mt-3 font-body">
                    {step.description}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
