import { Link } from "react-router-dom"
import logoImage from "@/assets/logo.png"

import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  to?: string
  tone?: "brand" | "light"
  className?: string
}

export function BrandLogo({
  to = "/",
  tone = "brand",
  className,
}: BrandLogoProps) {
  const { t } = useI18n()
  const logoToneClass = tone === "light" ? "brightness-0 invert" : ""

  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center",
        className
      )}
      aria-label={t("brand.home", "InsurAI home")}
    >
      <img
        src={logoImage}
        alt="InsurAI"
        className={cn("h-8 w-auto object-contain", logoToneClass)}
      />
      <span className="sr-only">InsurAI</span>
    </Link>
  )
}
