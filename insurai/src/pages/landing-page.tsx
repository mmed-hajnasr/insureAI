import { Building2, Star, UserRound } from "lucide-react"
import { Link } from "react-router-dom"

import { BrandLogo } from "@/components/shared/brand-logo"
import { HowItWorks } from "@/components/shared/how-it-works"
import { LanguageSwitcher } from "@/components/shared/language-switcher"
import { SiteFooter } from "@/components/shared/site-footer"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const problemStats = [
  {
    stat: "2.46% GDP penetration vs 6.2% global average",
    source: "CGA 2024",
  },
  {
    stat: "1,200 agents for 12.5M people",
    source: "OECD 2024",
  },
  {
    stat: "Most people only have insurance because the law forces them to",
    source: "FTUSA 2025",
  },
]

const individualValueProps = [
  "Free needs assessment",
  "Compare all Tunisian insurers",
  "Get a summary card for your agency visit",
  "No agents, no pressure",
]

const insurerValueProps = [
  "List your offers and reach digital users",
  "Receive pre-qualified leads",
  "Access anonymized market analytics",
  "Replace cold outreach with warm intent",
]

const plans = [
  {
    name: "Basic",
    price: "200 TND/month",
    features: [
      "Up to 5 offers listed",
      "Standard placement",
      "Lead notifications",
    ],
  },
  {
    name: "Pro",
    price: "500 TND/month",
    highlighted: true,
    features: [
      "Unlimited offers",
      "PDF product documents",
      "Priority placement",
      "Quarterly analytics report",
      "Highlighted badge",
    ],
  },
]

const heroJourneys = [
  {
    title: "Family Health Starter",
    insurer: "GAT",
    note: "From 54 TND/month",
  },
  {
    title: "Auto Coverage Fast Track",
    insurer: "COMAR",
    note: "From 92 TND/month",
  },
  {
    title: "Home + Theft Protection",
    insurer: "Maghrebia",
    note: "From 48 TND/month",
  },
]

export function LandingPage() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50">
        <div className="nav-shell mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="landing-nav-row">
            <BrandLogo />

            <nav className="landing-nav-center hidden md:inline-flex" aria-label="Primary">
              <Link to="/#how-it-works" className="landing-nav-link">
                {t("nav.how", "How It Works")}
              </Link>
              <Link to="/#insurer-pricing" className="landing-nav-link">
                {t("nav.insurers", "For Insurers")}
              </Link>
              <Link to="/app" className="landing-nav-link">
                {t("nav.browseOffers", "Browse Offers")}
              </Link>
            </nav>

            <nav className="landing-nav-actions" aria-label="Account">
              <LanguageSwitcher className="hidden rounded-full px-3 text-[12px] sm:inline-flex" />
              <Link
                to="/app"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "hidden rounded-full border-[var(--neutral-300)] px-4 text-[13px] font-medium text-[var(--palette-text-primary)] hover:bg-[var(--neutral-100)] sm:inline-flex"
                )}
              >
                {t("nav.browse", "Browse")}
              </Link>
              <Link
                to="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden rounded-full px-3.5 text-[13px] font-medium text-[var(--neutral-700)] hover:text-[var(--palette-text-primary)] sm:inline-flex"
                )}
              >
                {t("nav.login", "Login")}
              </Link>
              <Link
                to="/signup"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "rounded-full bg-[var(--palette-text-primary)] px-4 text-[13px] font-medium text-[var(--neutral-0)] hover:bg-[var(--palette-bg-primary-core)] sm:px-5"
                )}
              >
                {t("nav.getStarted", "Get Started")}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-gradient relative overflow-hidden border-b border-[var(--neutral-200)]">
          <div className="hero-orb" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="max-w-3xl">
                <Badge className="mb-6 h-auto rounded-[14px] bg-[color-mix(in_srgb,var(--palette-bg-primary-core)_10%,#fff)] px-3 py-1 text-[11px] font-semibold text-[var(--palette-bg-tertiary-core)]">
                  {t("hero.badge", "Tunisia's first insurance discovery layer")}
                </Badge>
                <h1 className="hero-title font-display font-bold text-foreground">
                  {t("hero.title", "Insurance in Tunisia, finally explained.")}
                </h1>
                <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  {t("hero.subtitle", "Answer a few questions. We match you with the right coverage. You walk into the agency ready.")}
                </p>

                <div className="hero-search-panel mt-8">
                  <div className="hero-search-block">
                    <p className="hero-search-label">{t("hero.who", "Who")}</p>
                    <p className="hero-search-value">My family</p>
                  </div>
                  <div className="hero-search-block">
                    <p className="hero-search-label">{t("hero.coverage", "Coverage")}</p>
                    <p className="hero-search-value">Health + Life</p>
                  </div>
                  <div className="hero-search-block">
                    <p className="hero-search-label">{t("hero.budget", "Budget")}</p>
                    <p className="hero-search-value">50-120 TND</p>
                  </div>
                  <Link
                    to="/signup"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-12 rounded-[32px] bg-[var(--palette-bg-primary-core)] px-7 font-display text-[16px] font-medium text-[var(--neutral-0)] hover:bg-[var(--palette-bg-tertiary-core)]"
                    )}
                  >
                    {t("hero.start", "Start matching")}
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-2">
                  <span className="trust-pill">2.46% insurance penetration in Tunisia</span>
                  <span className="trust-pill">12.5M people, 60 brokers</span>
                  <span className="trust-pill">You deserve better</span>
                </div>
              </div>

              <Card className="hero-preview-card p-0">
                <CardHeader className="border-b border-[var(--neutral-300)] pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Popular insurance journeys</CardTitle>
                    <Badge variant="secondary">Updated daily</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 py-5">
                  {heroJourneys.map((journey) => (
                    <article key={journey.title} className="hero-journey-item">
                      <div className="hero-journey-image" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[15px] font-semibold text-[var(--palette-text-primary)]">
                          {journey.title}
                        </p>
                        <p className="mt-0.5 font-body text-[13px] text-[var(--palette-text-secondary)]">
                          {journey.insurer}
                        </p>
                        <p className="mt-1 font-body text-[13px] font-semibold text-[var(--palette-bg-tertiary-core)]">
                          {journey.note}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-[14px] bg-[var(--neutral-100)] px-2 py-1 text-[12px] font-semibold text-[var(--palette-text-primary)]">
                        <Star className="size-3 fill-current" />
                        4.8
                      </div>
                    </article>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <HowItWorks />

        <section className="border-y border-[var(--neutral-300)] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="max-w-3xl font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight font-bold text-[var(--palette-text-primary)]">
              Tunisia needs transparent insurance discovery, not offline guesswork.
            </p>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {problemStats.map((item, index) => (
                <Card key={item.stat} className="problem-card p-0">
                  <CardHeader className="space-y-0 px-0 pb-0">
                    <CardTitle className="problem-value">{String(index + 1).padStart(2, "0")}</CardTitle>
                    <p className="problem-label font-body">{item.stat}</p>
                    <CardDescription className="problem-source font-body">
                      {item.source}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-[32px] border border-transparent bg-card p-6 shadow-[var(--shadow-card)] md:grid-cols-[1fr_auto_1fr] md:p-8">
            <article>
              <div className="flex items-center gap-2.5">
                <UserRound className="size-5 text-[var(--palette-bg-primary-core)]" />
                <h3 className="font-display text-2xl font-bold">For individuals</h3>
              </div>
              <ul className="mt-5 space-y-3.5 font-body text-sm text-muted-foreground">
                {individualValueProps.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--palette-bg-primary-core)]"
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>

            <Separator orientation="vertical" className="hidden md:block" />
            <Separator className="md:hidden" />

            <article>
              <div className="flex items-center gap-2.5">
                <Building2 className="size-5 text-[var(--palette-bg-primary-plus)]" />
                <h3 className="font-display text-2xl font-bold">For insurers</h3>
              </div>
              <ul className="mt-5 space-y-3.5 font-body text-sm text-muted-foreground">
                {insurerValueProps.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--palette-bg-primary-plus)]"
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section id="insurer-pricing" className="border-y border-[var(--neutral-300)] bg-[var(--neutral-50)] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl tracking-[-0.02em] text-foreground sm:text-4xl">
                Simple pricing for insurance companies
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {plans.map((plan) => {
                const [amount, currency] = plan.price.split(" ")

                return (
                  <Card
                    key={plan.name}
                    className={cn(
                      "pricing-card relative gap-0",
                      plan.highlighted && "pricing-pro"
                    )}
                  >
                    {plan.highlighted && (
                      <Badge className="pricing-badge absolute -top-3 right-6">Most Popular</Badge>
                    )}
                    <CardHeader className="px-0 pb-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="flex items-end gap-2">
                        <span className="pricing-amount">{amount}</span>
                        <span className="pricing-currency">{currency}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0">
                      <ul className="space-y-2.5 font-body text-sm text-muted-foreground">
                        {plan.features.map((feature) => (
                          <li key={feature} className="feature-item flex items-start gap-2.5">
                            <svg className="feature-check" viewBox="0 0 16 16" aria-hidden>
                              <path
                                d="M3.2 8.3 6.5 11.4 12.8 4.8"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                              />
                            </svg>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={cn(
                          "mt-7 h-11 w-full rounded-[8px] font-body text-[16px] font-medium",
                          plan.highlighted
                            ? "bg-[var(--palette-text-primary)] text-[var(--neutral-0)] hover:bg-[var(--palette-bg-primary-core)]"
                            : "border border-[var(--neutral-400)] bg-transparent text-[var(--palette-text-primary)] hover:border-[var(--palette-text-primary)] hover:bg-[var(--neutral-100)]"
                        )}
                        variant={plan.highlighted ? "default" : "outline"}
                      >
                        {t("nav.insurers", "For Insurers")}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
