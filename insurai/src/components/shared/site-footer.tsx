import { Link } from "react-router-dom"

import { BrandLogo } from "@/components/shared/brand-logo"
import { useI18n } from "@/lib/i18n"

export function SiteFooter() {
  const { t } = useI18n()
  const productLinks = [
    { label: t("nav.browseOffers", "Browse Offers"), to: "/app" },
    { label: t("nav.how", "How it Works"), to: "/#how-it-works" },
    { label: "Pricing", to: "/#insurer-pricing" },
  ]

  const companyLinks = [
    { label: "About", to: "/" },
    { label: t("nav.insurers", "For Insurers"), to: "/#insurer-pricing" },
    { label: "Contact", to: "/signup" },
  ]

  const legalLinks = [
    { label: "Privacy Policy", to: "/" },
    { label: "Terms", to: "/" },
  ]

  return (
    <footer className="border-t border-[var(--neutral-300)] bg-[var(--neutral-0)]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <BrandLogo />
            <p className="max-w-sm font-body text-sm text-muted-foreground">
              {t("footer.tagline", "Tunisia's insurance discovery platform.")}
            </p>
          </div>

          <div>
            <h4 className="font-display text-xs font-semibold uppercase tracking-[0.32px] text-foreground">
              {t("footer.product", "Product")}
            </h4>
            <ul className="mt-4 space-y-2.5 font-body text-sm text-muted-foreground">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link className="transition-colors hover:text-[var(--palette-text-primary)]" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-xs font-semibold uppercase tracking-[0.32px] text-foreground">
              {t("footer.company", "Company")}
            </h4>
            <ul className="mt-4 space-y-2.5 font-body text-sm text-muted-foreground">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link className="transition-colors hover:text-[var(--palette-text-primary)]" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-xs font-semibold uppercase tracking-[0.32px] text-foreground">
              {t("footer.legal", "Legal")}
            </h4>
            <ul className="mt-4 space-y-2.5 font-body text-sm text-muted-foreground">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link className="transition-colors hover:text-[var(--palette-text-primary)]" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--neutral-300)] pt-5 font-body text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} InsurAI. {t("footer.rights", "All rights reserved.")}</p>
          <p>{t("footer.made", "Made in Tunisia")}</p>
        </div>
      </div>
    </footer>
  )
}
