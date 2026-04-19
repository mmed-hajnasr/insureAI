import { useEffect } from "react"
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"

import { useAuth } from "@/lib/auth-context"
import { useI18n } from "@/lib/i18n"
import { LandingPage } from "@/pages/landing-page"
import { LoginPage } from "@/pages/login-page"
import { ChatPage } from "@/pages/chat-page"
import { PlatformPage } from "@/pages/platform-page"
import { SignupPage } from "@/pages/signup-page"

function LoadingScreen() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-body text-sm text-muted-foreground">
      {t("app.loading", "Loading...")}
    </div>
  )
}

function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function PublicAuthRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}

function PaidChatRoute() {
  const { isPaid, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isPaid) {
    return <Navigate to="/app?paywall=1" replace />
  }

  return <Outlet />
}

function AppRoutes() {
  const location = useLocation()

  useEffect(() => {
    const hashId = location.hash.replace("#", "")

    if (!hashId) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(hashId)
      element?.scrollIntoView({ behavior: "smooth", block: "start" })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [location.hash, location.pathname])

  return (
    <div key={location.pathname} className="route-fade">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<PublicAuthRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<PlatformPage />} />
          <Route element={<PaidChatRoute />}>
            <Route path="/app/chat" element={<ChatPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
