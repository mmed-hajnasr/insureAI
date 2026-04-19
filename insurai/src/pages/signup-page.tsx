import { type FormEvent, type ReactNode, useMemo, useState } from "react"
import { Building2, ShieldCheck, UserRound } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { AuthShell } from "@/components/shared/auth-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useI18n } from "@/lib/i18n"
import { mapFirebaseAuthError, signUpWithEmailPassword } from "@/lib/firebase-auth"
import { cn } from "@/lib/utils"

type AccountType = "individual" | "company" | "insurer"
type PlanId = "basic" | "pro"

const accountTypeOptions = [
  {
    id: "individual" as const,
    label: "I'm an individual",
    description: "Find and compare insurance for myself or my family",
    icon: UserRound,
  },
  {
    id: "company" as const,
    label: "I represent a company",
    description: "Get insurance coverage for my employees",
    icon: Building2,
  },
  {
    id: "insurer" as const,
    label: "I'm an insurer",
    description: "List my products and reach digital customers",
    icon: ShieldCheck,
  },
]

const insurerCategories = ["Life", "Health", "Auto", "Home", "Professional", "Travel"]

const insurerPlans = [
  {
    id: "basic" as const,
    title: "Basic",
    price: "200 TND/month",
    features: ["5 offers", "Standard placement"],
  },
  {
    id: "pro" as const,
    title: "Pro",
    price: "500 TND/month",
    features: ["Unlimited offers", "Priority placement", "Analytics report"],
    highlighted: true,
  },
]

export function SignupPage() {
  const navigate = useNavigate()
  const { isFirebaseReady } = useAuth()
  const { t } = useI18n()

  const [selectedType, setSelectedType] = useState<AccountType | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isInsurerFlow = selectedType === "insurer"

  const hasValidInsurerSelection = useMemo(() => {
    if (!isInsurerFlow) {
      return true
    }

    return selectedPlan !== null && selectedCategories.length > 0
  }, [isInsurerFlow, selectedCategories.length, selectedPlan])

  const selectAccountType = (type: AccountType) => {
    setSelectedType(type)
    setErrorMessage(null)
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedType) {
      setErrorMessage("Please choose an account type first.")
      return
    }

    if (!hasValidInsurerSelection) {
      setErrorMessage("Please choose at least one category and one plan.")
      return
    }

    const form = event.currentTarget
    const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]')
    const passwordInput = form.querySelector<HTMLInputElement>('input[type="password"]')
    const confirmPasswordInput = form.querySelector<HTMLInputElement>('input[id$="ConfirmPassword"]')

    const email = emailInput?.value.trim() ?? ""
    const password = passwordInput?.value ?? ""
    const confirmPassword = confirmPasswordInput?.value ?? ""

    if (!email || !password) {
      setErrorMessage("Email and password are required.")
      return
    }

    if (confirmPasswordInput && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await signUpWithEmailPassword(email, password)
      navigate("/app")
    } catch (error) {
      setErrorMessage(mapFirebaseAuthError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title={t("signup.title", "Create your account")}
      subtitle={t("signup.subtitle", "Choose your profile and get matched in minutes")}
    >
      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className={cn("signup-step-indicator", !selectedType && "signup-step-indicator-active")}>{t("signup.profile", "1. Profile")}</div>
        <div className={cn("signup-step-indicator", selectedType && "signup-step-indicator-active")}>{t("signup.details", "2. Details")}</div>
      </div>

      <div className="overflow-hidden">
        <div
          className={cn(
            "flex w-[200%] transition-transform duration-300 ease-out",
            selectedType ? "-translate-x-1/2" : "translate-x-0"
          )}
        >
          <section className="w-1/2 pr-0 sm:pr-4">
            <h2 className="font-display text-xl font-bold text-foreground">{t("signup.step1", "Step 1: Select account type")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {accountTypeOptions.map((option) => {
                const Icon = option.icon
                const isActive = selectedType === option.id

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectAccountType(option.id)}
                    className={cn(
                      "auth-account-type w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--palette-text-primary)]",
                      option.id === "insurer" && "sm:col-span-2",
                      isActive && "auth-account-type-active"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-[14px] bg-[var(--neutral-100)] text-[var(--palette-text-primary)]">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="font-display text-base font-bold text-foreground">
                          {option.id === "individual"
                            ? t("signup.individual", option.label)
                            : option.id === "company"
                              ? t("signup.company", option.label)
                              : t("signup.insurer", option.label)}
                        </p>
                        <p className="mt-1 font-body text-sm text-muted-foreground">
                          {option.id === "individual"
                            ? t("signup.individualDesc", option.description)
                            : option.id === "company"
                              ? t("signup.companyDesc", option.description)
                              : t("signup.insurerDesc", option.description)}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section
            className={cn(
              "w-1/2 pl-0 transition-all duration-300 ease-out sm:pl-4",
              selectedType ? "translate-x-0 opacity-100" : "translate-x-5 opacity-0"
            )}
          >
            {selectedType ? (
              <form onSubmit={handleSubmit} className="signup-step-card space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-foreground">{t("signup.step2", "Step 2: Account details")}</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="font-body"
                    onClick={() => setSelectedType(null)}
                  >
                    {t("signup.changeType", "Change type")}
                  </Button>
                </div>

                {selectedType === "individual" && (
                  <div className="space-y-4">
                    <Field label={t("signup.fullName", "Full name")} htmlFor="fullName">
                      <Input id="fullName" required className="auth-input" />
                    </Field>
                    <Field label={t("login.email", "Email")} htmlFor="individualEmail">
                      <Input id="individualEmail" type="email" required className="auth-input" />
                    </Field>
                    <Field label={t("login.password", "Password")} htmlFor="individualPassword">
                      <Input id="individualPassword" type="password" required className="auth-input" />
                    </Field>
                    <Field label={t("signup.confirmPassword", "Confirm password")} htmlFor="individualConfirmPassword">
                      <Input id="individualConfirmPassword" type="password" required className="auth-input" />
                    </Field>
                    <Button type="submit" className="auth-submit-btn" disabled={isSubmitting || !isFirebaseReady}>
                      {isSubmitting ? t("signup.creating", "Creating account...") : t("signup.createMyAccount", "Create My Account")}
                    </Button>
                    <p className="text-center font-body text-sm text-muted-foreground">
                      {t("signup.already", "Already have an account?")}{" "}
                      <Link to="/login" className="font-semibold text-[var(--palette-bg-tertiary-core)] hover:text-[var(--palette-bg-primary-core)]">
                        {t("signup.signIn", "Sign in")}
                      </Link>
                    </p>
                  </div>
                )}

                {selectedType === "company" && (
                  <div className="space-y-4">
                    <Field label={t("signup.companyName", "Company name")} htmlFor="companyName">
                      <Input id="companyName" required className="auth-input" />
                    </Field>
                    <Field label={t("signup.industry", "Industry")} htmlFor="industry">
                      <select
                        id="industry"
                        required
                        className="auth-select"
                      >
                        <option value="">Select industry</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="technology">Technology</option>
                        <option value="retail">Retail</option>
                        <option value="services">Services</option>
                      </select>
                    </Field>
                    <Field label={t("signup.employees", "Number of employees")} htmlFor="employees">
                      <select
                        id="employees"
                        required
                        className="auth-select"
                      >
                        <option value="">Select range</option>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="200+">200+</option>
                      </select>
                    </Field>
                    <Field label={t("login.email", "Email")} htmlFor="companyEmail">
                      <Input id="companyEmail" type="email" required className="auth-input" />
                    </Field>
                    <Field label={t("login.password", "Password")} htmlFor="companyPassword">
                      <Input id="companyPassword" type="password" required className="auth-input" />
                    </Field>
                    <Button type="submit" className="auth-submit-btn" disabled={isSubmitting || !isFirebaseReady}>
                      {isSubmitting ? t("signup.creating", "Creating account...") : t("signup.createCompany", "Create Company Account")}
                    </Button>
                  </div>
                )}

                {selectedType === "insurer" && (
                  <div className="space-y-4">
                    <Field label={t("signup.companyName", "Company name")} htmlFor="insurerCompanyName">
                      <Input id="insurerCompanyName" required className="auth-input" />
                    </Field>
                    <Field label="License number (CGA)" htmlFor="licenseNumber">
                      <Input id="licenseNumber" required className="auth-input" />
                    </Field>

                    <div>
                      <label className="font-display text-sm font-semibold text-foreground">
                        Insurance categories offered
                      </label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {insurerCategories.map((category) => {
                          const checked = selectedCategories.includes(category)
                          const categoryId = `category-${category.toLowerCase()}`

                          return (
                            <label
                              key={category}
                              htmlFor={categoryId}
                              className={cn(
                                "flex items-center gap-2 rounded-[14px] border border-[var(--neutral-300)] px-3 py-2 font-body text-sm transition-colors",
                                checked && "border-[var(--palette-text-primary)] bg-[var(--neutral-100)]"
                              )}
                            >
                              <input
                                id={categoryId}
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCategory(category)}
                                className="size-4 rounded border-border accent-[var(--palette-bg-primary-core)]"
                              />
                              <span>{category}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    <Field label={t("login.email", "Email")} htmlFor="insurerEmail">
                      <Input id="insurerEmail" type="email" required className="auth-input" />
                    </Field>
                    <Field label={t("login.password", "Password")} htmlFor="insurerPassword">
                      <Input id="insurerPassword" type="password" required className="auth-input" />
                    </Field>

                    <div>
                      <label className="font-display text-sm font-semibold text-foreground">
                        Select plan
                      </label>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {insurerPlans.map((plan) => {
                          const selected = selectedPlan === plan.id

                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedPlan(plan.id)}
                              className={cn(
                                "relative rounded-[20px] border border-[var(--neutral-300)] p-3 text-left transition-colors",
                                selected && "border-[var(--palette-text-primary)] bg-[var(--neutral-100)]",
                                plan.highlighted && "border-[var(--palette-bg-primary-core)]"
                              )}
                            >
                              {plan.highlighted && (
                                <Badge className="pricing-badge absolute -top-2 right-3">
                                  Most Popular
                                </Badge>
                              )}
                              <p className="font-display text-base font-bold text-foreground">{plan.title}</p>
                              <p className="font-display text-sm font-semibold text-muted-foreground">{plan.price}</p>
                              <ul className="mt-2 space-y-1 font-body text-xs text-muted-foreground">
                                {plan.features.map((feature) => (
                                  <li key={feature}>• {feature}</li>
                                ))}
                              </ul>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {errorMessage && (
                      <p className="rounded-xl bg-destructive/10 px-3 py-2 font-body text-sm text-destructive">
                        {errorMessage}
                      </p>
                    )}

                    <Button type="submit" className="auth-submit-btn" disabled={isSubmitting || !isFirebaseReady}>
                      {isSubmitting ? t("signup.submitting", "Submitting...") : t("signup.apply", "Apply for Listing")}
                    </Button>
                    <p className="font-body text-xs text-muted-foreground">
                      Our team will review and activate your account within 48 hours.
                    </p>
                  </div>
                )}
              </form>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                <p className="font-body text-sm text-muted-foreground">
                  {t("signup.selectTypeHint", "Select an account type on the left to continue.")}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {errorMessage && selectedType !== "insurer" && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 font-body text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {!isFirebaseReady && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 font-body text-sm text-destructive">
          Firebase is not configured. Add all `VITE_FIREBASE_*` variables in `.env`.
        </p>
      )}
    </AuthShell>
  )
}

type FieldProps = {
  label: string
  htmlFor: string
  children: ReactNode
}

function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="font-display text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
