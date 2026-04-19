import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  Bot,
  Briefcase,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Heart,
  Home,
  MessageCircle,
  Plane,
  Search,
  SendHorizontal,
  Shield,
  Sparkles,
  SlidersHorizontal,
  Star,
  WandSparkles,
} from "lucide-react"

import { BrandLogo } from "@/components/shared/brand-logo"
import { HowItWorks } from "@/components/shared/how-it-works"
import { LanguageSwitcher } from "@/components/shared/language-switcher"
import { SiteFooter } from "@/components/shared/site-footer"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import ReactMarkdown from "react-markdown"
import { useNavigate, useSearchParams } from "react-router-dom"
import remarkGfm from "remark-gfm"
import { useAuth } from "@/lib/auth-context"
import { sendChatMessage, type ChatPack, type ChatRequestLanguage } from "@/lib/chat-api"
import { signOutCurrentUser } from "@/lib/firebase-auth"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type CategoryKey = "life" | "health" | "auto" | "home" | "pro" | "travel"
type CategoryFilter = "all" | CategoryKey

type InsuranceOffer = {
  insurer: string
  offerName: string
  category: CategoryKey
  features: string[]
  premium: string
}

type ChatMessage = {
  id: number
  role: "user" | "assistant"
  text: string
  packs?: ChatPack[]
  isError?: boolean
}

const categoryTabs = [
  { id: "all" as const, label: "All", icon: Search },
  { id: "life" as const, label: "Life", icon: Heart },
  { id: "health" as const, label: "Health", icon: Activity },
  { id: "auto" as const, label: "Auto", icon: Car },
  { id: "home" as const, label: "Home", icon: Home },
  { id: "pro" as const, label: "Professional", icon: Briefcase },
  { id: "travel" as const, label: "Travel", icon: Plane },
]

const insuranceOffers: InsuranceOffer[] = [
  {
    insurer: "STAR",
    offerName: "STAR Family Shield",
    category: "life",
    features: ["Family life cover", "Education benefit", "Flexible payout"],
    premium: "From 65 TND/month",
  },
  {
    insurer: "GAT",
    offerName: "GAT Health Plus",
    category: "health",
    features: ["Private clinic network", "Annual checkup", "Fast reimbursement"],
    premium: "From 54 TND/month",
  },
  {
    insurer: "COMAR",
    offerName: "COMAR Auto Protect",
    category: "auto",
    features: ["Civil liability", "Roadside support", "Quick claims hotline"],
    premium: "From 92 TND/month",
  },
  {
    insurer: "Maghrebia",
    offerName: "Maghrebia Home Secure",
    category: "home",
    features: ["Fire and flood protection", "Theft cover", "Apartment assistance"],
    premium: "From 48 TND/month",
  },
  {
    insurer: "BH Assurance",
    offerName: "BH Pro Continuity",
    category: "pro",
    features: ["SME liability", "Equipment damage", "Business interruption"],
    premium: "From 140 TND/month",
  },
  {
    insurer: "Lloyd Tunisien",
    offerName: "Lloyd Travel Smart",
    category: "travel",
    features: ["Visa-compliant cover", "Medical emergency", "Trip cancellation"],
    premium: "From 32 TND/month",
  },
  {
    insurer: "CTAMA",
    offerName: "CTAMA Rural Health",
    category: "health",
    features: ["Regional partner clinics", "Maternity support", "Pharmacy coverage"],
    premium: "From 46 TND/month",
  },
  {
    insurer: "Zitouna Takaful",
    offerName: "Zitouna Takaful Family",
    category: "life",
    features: ["Sharia-compliant model", "Savings component", "Family assistance"],
    premium: "From 70 TND/month",
  },
]

const quickReplies: Array<{ label: string; message: string }> = [
  {
    label: "Health packs",
    message: "List Health packs from RealAssurance",
  },
  {
    label: "Auto category",
    message: "In category Auto, what should I choose?",
  },
  {
    label: "Family coverage",
    message: "I have a car loan and a family, what assurance should I prioritize?",
  },
  {
    label: "Best overall",
    message: "Search all categories and all agencies, then give me the best recommendation.",
  },
]

function buildInitialAssistantMessage(text: string): ChatMessage {
  return {
    id: 1,
    role: "assistant",
    text,
  }
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `session-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

const categoryRating: Record<CategoryKey, string> = {
  life: "4.9",
  health: "4.8",
  auto: "4.7",
  home: "4.8",
  pro: "4.9",
  travel: "4.7",
}

const categoryTint: Record<CategoryKey, string> = {
  life: "var(--palette-bg-primary-core)",
  health: "color-mix(in srgb, var(--palette-bg-primary-core) 84%, #ffffff)",
  auto: "color-mix(in srgb, var(--palette-bg-primary-core) 70%, #ffffff)",
  home: "color-mix(in srgb, var(--palette-bg-primary-core) 92%, #000000 8%)",
  pro: "var(--palette-bg-primary-plus)",
  travel: "color-mix(in srgb, var(--palette-bg-primary-core) 72%, var(--palette-bg-primary-plus) 28%)",
}

type PendingChatAccess = "sheet" | "route" | null

export function PlatformPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isPaid, markUserAsPaid } = useAuth()
  const { language, t } = useI18n()
  const categoryScrollerRef = useRef<HTMLDivElement | null>(null)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  const sessionIdRef = useRef<string>(createSessionId())
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [chatOpen, setChatOpen] = useState(false)
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)
  const [pendingChatAccess, setPendingChatAccess] = useState<PendingChatAccess>(null)
  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const openingMessage = t(
    "chat.opening",
    "Ahlan! I'm here to help you find the right insurance. Tell me — what would you like to protect today?"
  )
  const apiLanguage: ChatRequestLanguage =
    language === "fr" ? "french" : language === "tn" ? "arabic" : "english"
  const [messages, setMessages] = useState<ChatMessage[]>([buildInitialAssistantMessage(openingMessage)])

  useEffect(() => {
    setMessages((prev) => {
      const hasOnlyOpeningMessage = prev.length === 1 && prev[0]?.role === "assistant"

      if (!hasOnlyOpeningMessage || prev[0].text === openingMessage) {
        return prev
      }

      return [buildInitialAssistantMessage(openingMessage)]
    })
  }, [openingMessage])

  const filteredOffers = useMemo(() => {
    return insuranceOffers.filter((offer) => {
      const matchesCategory = activeCategory === "all" || offer.category === activeCategory
      const query = searchTerm.trim().toLowerCase()
      const matchesSearch =
        query.length === 0 ||
        offer.offerName.toLowerCase().includes(query) ||
        offer.insurer.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchTerm])

  const appendMessage = (message: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...message, id: prev.length + 1 }])
  }

  useEffect(() => {
    const shouldShowPaywall = searchParams.get("paywall") === "1"

    if (!shouldShowPaywall) {
      return
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete("paywall")
    setSearchParams(nextParams, { replace: true })

    if (!isPaid) {
      setPendingChatAccess("route")
      setShowPaymentPopup(true)
    }
  }, [isPaid, searchParams, setSearchParams])

  useEffect(() => {
    if (!chatOpen) {
      return
    }

    const scrollContainer = chatScrollRef.current

    if (!scrollContainer) {
      return
    }

    requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    })
  }, [chatOpen, messages.length])

  const hasActiveFilters = activeCategory !== "all" || searchTerm.trim().length > 0

  const activeCategoryIndex = categoryTabs.findIndex((tab) => tab.id === activeCategory)

  const selectCategoryByStep = (direction: "left" | "right") => {
    const step = direction === "left" ? -1 : 1
    let nextIndex = activeCategoryIndex + step

    if (nextIndex < 0) {
      nextIndex = categoryTabs.length - 1
    }

    if (nextIndex >= categoryTabs.length) {
      nextIndex = 0
    }

    const nextCategory = categoryTabs[nextIndex].id
    setActiveCategory(nextCategory)

    const nextTabElement = categoryScrollerRef.current?.querySelector<HTMLElement>(
      `[data-category-tab="${nextCategory}"]`
    )
    nextTabElement?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }

  const scrollCategories = (direction: "left" | "right") => {
    const amount = direction === "left" ? -220 : 220
    categoryScrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" })
  }

  const submitChatMessage = async (rawText: string) => {
    const text = rawText.trim()

    if (!text || isSending) {
      return
    }

    appendMessage({ role: "user", text })
    setChatInput("")
    setIsSending(true)

    try {
      const response = await sendChatMessage({
        sessionId: sessionIdRef.current,
        message: text,
        language: apiLanguage,
      })

      appendMessage({
        role: "assistant",
        text: response.reply,
        packs: response.responseType === "pack_list" ? response.packs : undefined,
      })
    } catch (error) {
      appendMessage({
        role: "assistant",
        text:
          error instanceof Error
            ? error.message
            : "We hit an unexpected issue while contacting the assistant.",
        isError: true,
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleQuickReply = (message: string) => {
    void submitChatMessage(message)
  }

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitChatMessage(chatInput)
  }

  const handleStartNewConversation = () => {
    sessionIdRef.current = createSessionId()
    setMessages([buildInitialAssistantMessage(openingMessage)])
    setChatInput("")
  }

  const handleSignOut = async () => {
    try {
      await signOutCurrentUser()
    } finally {
      navigate("/login")
    }
  }

  const requirePaymentForChat = (accessType: Exclude<PendingChatAccess, null>) => {
    if (isPaid) {
      if (accessType === "route") {
        navigate("/app/chat")
      } else {
        setChatOpen(true)
      }

      return
    }

    setPendingChatAccess(accessType)
    setShowPaymentPopup(true)
  }

  const handleChatSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setChatOpen(false)
      return
    }

    requirePaymentForChat("sheet")
  }

  const handleConfirmPayment = () => {
    markUserAsPaid()
    setShowPaymentPopup(false)

    if (pendingChatAccess === "route") {
      navigate("/app/chat")
    }

    if (pendingChatAccess === "sheet") {
      setChatOpen(true)
    }

    setPendingChatAccess(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40">
        <div className="nav-shell mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            <div className="flex items-center gap-3">
              <BrandLogo className="text-xl sm:text-2xl" />

              <div className="hidden flex-1 justify-center md:flex">
                <div className="w-full max-w-xl">
                  <Input
                    value={searchTerm}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder={t("platform.search", "Search coverage, insurer, or benefit")}
                    className="nav-search"
                    aria-label="Search insurance offers"
                  />
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <LanguageSwitcher className="hidden rounded-full px-3 text-xs sm:inline-flex" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10"
                  onClick={() => void handleSignOut()}
                >
                  {t("platform.signOut", "Sign out")}
                </Button>
                <Button
                  className="nav-cta hidden h-10 lg:inline-flex"
                  onClick={() => requirePaymentForChat("route")}
                >
                  {t("platform.profile", "Get My Insurance Profile")}
                </Button>

                <Sheet open={chatOpen} onOpenChange={handleChatSheetOpenChange}>
                  <SheetTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="nav-chat-btn"
                        aria-label="Open assistant chat"
                      />
                    }
                  >
                    <MessageCircle className="size-4" />
                  </SheetTrigger>

                  <SheetContent
                    side="right"
                    className="chat-sheet-surface data-[side=right]:w-full data-[side=right]:sm:max-w-[430px] border-l border-border p-0"
                  >
                    <SheetHeader className="chat-sheet-header">
                      <div className="flex items-start justify-between gap-3">
                        <div className="chat-sheet-brand">
                          <span className="chat-sheet-mark" aria-hidden>
                            <Shield className="size-4" />
                          </span>
                          <div>
                            <SheetTitle className="font-display text-base font-semibold text-[var(--palette-text-primary)]">
                              {t("platform.assistant", "InsurAI Assistant")}
                            </SheetTitle>
                            <p className="chat-sheet-status">
                              <span className="pulse-dot" aria-hidden />
                              {t("platform.ready", "Ready to guide you")}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleStartNewConversation}
                          disabled={isSending}
                        >
                          {t("platform.newChat", "New chat")}
                        </Button>
                      </div>
                      <SheetDescription className="sr-only">
                        Chat with InsurAI Assistant to get recommendations.
                      </SheetDescription>
                    </SheetHeader>

                    <div className="border-b border-border px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {quickReplies.map((reply) => (
                          <Button
                            key={reply.label}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="quick-reply-pill"
                            onClick={() => handleQuickReply(reply.message)}
                            disabled={isSending}
                          >
                            {reply.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col p-4">
                      <div
                        ref={chatScrollRef}
                        className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
                      >
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              "max-w-[88%] rounded-2xl px-3.5 py-2.5 font-body text-sm leading-relaxed",
                              message.role === "user"
                                ? "chat-user-msg ml-auto"
                                : cn("chat-assistant-msg", message.isError && "chat-assistant-msg-error")
                            )}
                          >
                            {message.role === "assistant" ? (
                              <div className="chat-message-markdown">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {message.text}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="chat-message-copy">{message.text}</p>
                            )}
                            {message.packs && message.packs.length > 0 && (
                              <div className="chat-pack-list mt-3 space-y-2.5">
                                {message.packs.map((pack, index) => (
                                  <article
                                    key={`${pack.agencyName}-${pack.title}-${index}`}
                                    className="chat-pack-card p-3 text-foreground"
                                  >
                                    <p className="font-display text-sm font-semibold tracking-[-0.01em]">
                                      {pack.title}
                                    </p>
                                    <p className="chat-pack-agency mt-1 font-body text-xs">
                                      {pack.agencyName}
                                    </p>
                                    <p className="chat-pack-description mt-2 font-body text-xs leading-relaxed">
                                      {pack.description}
                                    </p>
                                  </article>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <form className="chat-input-bar mt-4 -mx-4 -mb-4 flex items-center gap-2" onSubmit={handleSendMessage}>
                        <Input
                          value={chatInput}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setChatInput(event.target.value)
                          }
                          placeholder={t("platform.typeMessage", "Type your message")}
                          className="chat-input-field h-10"
                          disabled={isSending}
                        />
                        <Button
                          type="submit"
                          className="chat-send-btn"
                          aria-label="Send message"
                          disabled={isSending}
                        >
                          <SendHorizontal className="size-4" />
                        </Button>
                      </form>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="mt-3 md:hidden">
              <Input
                value={searchTerm}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(event.target.value)
                }
                placeholder={t("platform.search", "Search coverage, insurer, or benefit")}
                className="nav-search"
                aria-label="Search insurance offers"
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="circle-nav-btn hidden md:inline-flex"
                aria-label="Previous categories"
                onClick={() => {
                  selectCategoryByStep("left")
                  scrollCategories("left")
                }}
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div ref={categoryScrollerRef} className="category-scroll flex-1 md:justify-center">
                {categoryTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeCategory === tab.id

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      data-category-tab={tab.id}
                      onClick={() => setActiveCategory(tab.id)}
                      className={cn("category-pill whitespace-nowrap", isActive && "category-pill-active")}
                    >
                      <Icon className="mr-1.5 size-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="circle-nav-btn hidden md:inline-flex"
                aria-label="Next categories"
                onClick={() => {
                  selectCategoryByStep("right")
                  scrollCategories("right")
                }}
              >
                <ChevronRight className="size-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="nav-filter-btn"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setActiveCategory("all")
                  setSearchTerm("")
                }}
              >
                <SlidersHorizontal className="mr-1.5 size-4" />
                {t("platform.reset", "Reset Filters")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOffers.map((offer) => {
              const initials = offer.insurer
                .split(" ")
                .map((chunk) => chunk[0])
                .join("")
                .slice(0, 2)
              const premiumValue = offer.premium.replace(/^From\s*/i, "")

              return (
                <Card
                  key={`${offer.insurer}-${offer.offerName}`}
                  className="insurance-card group h-full py-0"
                >
                  <div className="px-4 pt-4">
                    <div
                      className="insurance-media"
                      style={{ ["--offer-tint" as string]: categoryTint[offer.category] }}
                    >
                      <div className="insurance-media-meta">
                        <span className="insurance-media-tag">{offer.category}</span>
                        <button
                          type="button"
                          className="insurance-heart-btn"
                          aria-label={`Save ${offer.offerName}`}
                        >
                          <Heart className="size-4" />
                        </button>
                      </div>
                      <div className="insurance-skeleton" aria-hidden>
                        <span className="insurance-skeleton-initials">{initials}</span>
                        <span className="insurance-skeleton-label">{offer.insurer}</span>
                      </div>
                      <div className="insurance-dot-row" aria-hidden>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>

                  <CardHeader className="pt-4 pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="company-avatar after:hidden">
                          <AvatarFallback className="company-avatar-fallback">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="insurance-insurer">
                            {offer.insurer}
                          </p>
                          <CardTitle className="insurance-product min-h-[2.5rem] text-foreground">
                            {offer.offerName}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="insurance-rating">
                        <Star className="size-3.5 fill-current" />
                        <span>{categoryRating[offer.category]}</span>
                      </div>
                    </div>
                    <p className="insurance-meta-line mt-2">
                      <span className="insurance-meta-dot" aria-hidden />
                      Tunisia · Agency onboarding
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1 pt-3">
                    <ul className="space-y-2 font-body">
                      {offer.features.slice(0, 2).map((feature) => (
                        <li key={feature} className="feature-item flex items-start gap-2">
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
                  </CardContent>

                  <CardFooter className="block pb-5 pt-2">
                    <p className="insurance-price font-display">
                      <span className="insurance-price-prefix">From</span>
                      <span className="insurance-price-amount">{premiumValue}</span>
                    </p>
                    <Button variant="outline" className="learn-more-btn mt-3">
                      Review offer
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          {filteredOffers.length === 0 && (
            <Card className="no-results-card mt-6 p-8 text-center">
              <h3 className="font-display text-xl font-semibold text-[var(--palette-text-primary)]">
                No offers matched your search
              </h3>
              <p className="mt-2 font-body text-sm text-[var(--palette-text-secondary)]">
                Try another keyword or clear filters to view all available insurance offers.
              </p>
              <div className="mt-5">
                <Button
                  type="button"
                  onClick={() => {
                    setActiveCategory("all")
                    setSearchTerm("")
                  }}
                  className="nav-cta h-10"
                >
                  Reset Search
                </Button>
              </div>
            </Card>
          )}
        </section>

        <HowItWorks compact />
      </main>

      {showPaymentPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-[1px] shadow-[0_24px_70px_-20px_rgba(76,29,149,0.8)]">
            <div className="relative rounded-[calc(1.5rem-1px)] bg-background px-6 py-6 sm:px-7">
              <span className="pointer-events-none absolute -top-10 -left-8 h-32 w-32 rounded-full bg-violet-300/30 blur-2xl" />
              <span className="pointer-events-none absolute -right-10 -bottom-14 h-36 w-36 rounded-full bg-cyan-300/30 blur-2xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  <Sparkles className="size-3.5" />
                  Premium Chat Access
                </div>

                <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.01em] text-foreground">
                  Upgrade to Paid Access
                </h2>
                <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                  Get unlimited chatbot access and smarter AI guidance built around your profile, budget, and insurance priorities.
                </p>

                <ul className="mt-5 space-y-2.5">
                  <li className="flex items-start gap-3 rounded-xl border border-violet-200/80 bg-violet-50/80 px-3 py-2.5">
                    <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-violet-600 text-white">
                      <WandSparkles className="size-3.5" />
                    </span>
                    <span className="font-body text-sm text-foreground">AI guidance tailored to your real insurance goals.</span>
                  </li>
                  <li className="flex items-start gap-3 rounded-xl border border-cyan-200/80 bg-cyan-50/80 px-3 py-2.5">
                    <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-cyan-600 text-white">
                      <Bot className="size-3.5" />
                    </span>
                    <span className="font-body text-sm text-foreground">Full access to all chatbot options and recommendation flows.</span>
                  </li>
                  <li className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2.5">
                    <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Crown className="size-3.5" />
                    </span>
                    <span className="font-body text-sm text-foreground">Priority-quality answers for faster insurance decisions.</span>
                  </li>
                </ul>

                <Button
                  type="button"
                  className="mt-6 h-11 w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 transition-transform hover:scale-[1.01] hover:from-violet-500 hover:to-fuchsia-500"
                  onClick={handleConfirmPayment}
                >
                  <CheckCircle2 className="size-4" />
                  Confirm payment 10dt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
