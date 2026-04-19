import { type FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { AuthShell } from "@/components/shared/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useI18n } from "@/lib/i18n"
import {
  mapFirebaseAuthError,
  signInWithEmailPassword,
  signInWithGoogleProvider,
} from "@/lib/firebase-auth"

export function LoginPage() {
  const navigate = useNavigate()
  const { isFirebaseReady } = useAuth()
  const { t } = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await signInWithEmailPassword(email, password)
      navigate("/app")
    } catch (error) {
      setErrorMessage(mapFirebaseAuthError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await signInWithGoogleProvider()
      navigate("/app")
    } catch (error) {
      setErrorMessage(mapFirebaseAuthError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell title={t("login.title", "Welcome back")} subtitle={t("login.subtitle", "Sign in to your InsurAI account")}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="font-display text-sm font-semibold text-foreground">
            {t("login.email", "Email")}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.tn"
            className="auth-input"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="font-display text-sm font-semibold text-foreground">
            {t("login.password", "Password")}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="auth-input"
          />
          <div className="text-right">
            <Link
              to="/login"
              className="font-body text-sm text-[var(--palette-bg-tertiary-core)] transition-colors hover:text-[var(--palette-bg-primary-core)]"
            >
              {t("login.forgot", "Forgot password?")}
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          className="auth-submit-btn"
          disabled={isSubmitting || !isFirebaseReady}
        >
          {isSubmitting ? t("login.signingIn", "Signing in...") : t("login.signIn", "Sign In")}
        </Button>
      </form>

      {errorMessage && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 font-body text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-body text-xs text-muted-foreground">{t("login.continue", "or continue with")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-[8px] border border-[var(--neutral-400)] bg-transparent font-body text-[var(--palette-text-primary)] hover:border-[var(--palette-text-primary)] hover:bg-[var(--neutral-100)]"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting || !isFirebaseReady}
      >
        <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#EA4335"
            d="M12 11.8v4.9h6.8c-.3 1.6-2 4.8-6.8 4.8-4.1 0-7.4-3.4-7.4-7.5s3.3-7.5 7.4-7.5c2.4 0 4 1 4.9 1.9l3.4-3.3C18.2 2.8 15.4 1.7 12 1.7 6.3 1.7 1.7 6.3 1.7 12S6.3 22.3 12 22.3c6.9 0 11.4-4.8 11.4-11.6 0-.8-.1-1.4-.2-2H12z"
          />
        </svg>
        {t("login.google", "Continue with Google")}
      </Button>

      {!isFirebaseReady && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 font-body text-sm text-destructive">
          Firebase is not configured. Add all `VITE_FIREBASE_*` variables in `.env`.
        </p>
      )}

      <p className="mt-6 text-center font-body text-sm text-muted-foreground sm:text-left">
        {t("login.noAccount", "Don't have an account?")}{" "}
        <Link
          to="/signup"
          className="font-semibold text-[var(--palette-bg-tertiary-core)] transition-colors hover:text-[var(--palette-bg-primary-core)]"
        >
          {t("login.getStarted", "Get started →")}
        </Link>
      </p>
    </AuthShell>
  )
}
