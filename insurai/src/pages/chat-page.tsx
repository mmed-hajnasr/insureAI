import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react"
import { ArrowLeft, SendHorizontal, Shield } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useNavigate } from "react-router-dom"
import remarkGfm from "remark-gfm"

import { BrandLogo } from "@/components/shared/brand-logo"
import { LanguageSwitcher } from "@/components/shared/language-switcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sendChatMessage, sendGuidedChatMessage, type ChatPack, type ChatRequestLanguage } from "@/lib/chat-api"
import { signOutCurrentUser } from "@/lib/firebase-auth"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type ChatMessage = {
    id: number
    role: "user" | "assistant"
    text: string
    packs?: ChatPack[]
    isError?: boolean
}

const GUIDED_MESSAGES_LIMIT = 4

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

export function ChatPage() {
    const navigate = useNavigate()
    const { language, t } = useI18n()
    const chatScrollRef = useRef<HTMLDivElement | null>(null)
    const sessionIdRef = useRef<string>(createSessionId())
    const [chatInput, setChatInput] = useState("")
    const [isSending, setIsSending] = useState(false)
    const initialAssistantText = t(
        "chat.opening",
        "Ahlan! I'm here to help you find the right insurance. Tell me — what would you like to protect today?"
    )
    const quickReplies: Array<{ label: string; message: string }> = [
        {
            label: t("chat.quick.health.label", "Health packs"),
            message: t("chat.quick.health.message", "List Health packs from RealAssurance"),
        },
        {
            label: t("chat.quick.auto.label", "Auto category"),
            message: t("chat.quick.auto.message", "In category Auto, what should I choose?"),
        },
        {
            label: t("chat.quick.family.label", "Family coverage"),
            message: t(
                "chat.quick.family.message",
                "I have a car loan and a family, what assurance should I prioritize?"
            ),
        },
        {
            label: t("chat.quick.best.label", "Best overall"),
            message: t(
                "chat.quick.best.message",
                "Search all categories and all agencies, then give me the best recommendation."
            ),
        },
    ]
    const [messages, setMessages] = useState<ChatMessage[]>([buildInitialAssistantMessage(initialAssistantText)])
    const [userMessageCount, setUserMessageCount] = useState(0)

    useEffect(() => {
        if (userMessageCount !== 0) {
            return
        }

        setMessages([buildInitialAssistantMessage(initialAssistantText)])
    }, [initialAssistantText, userMessageCount])

    const apiLanguage: ChatRequestLanguage =
        language === "fr" ? "french" : language === "tn" ? "arabic" : "english"

    const appendMessage = (message: Omit<ChatMessage, "id">) => {
        setMessages((prev) => [...prev, { ...message, id: prev.length + 1 }])
    }

    useEffect(() => {
        const scrollContainer = chatScrollRef.current

        if (!scrollContainer) {
            return
        }

        requestAnimationFrame(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
        })
    }, [messages.length])

    const submitChatMessage = async (rawText: string) => {
        const text = rawText.trim()

        if (!text || isSending) {
            return
        }

        appendMessage({ role: "user", text })
        const nextUserMessageCount = userMessageCount + 1
        setUserMessageCount(nextUserMessageCount)
        setChatInput("")
        setIsSending(true)

        try {
            const response =
                nextUserMessageCount <= GUIDED_MESSAGES_LIMIT
                    ? await sendGuidedChatMessage({
                        sessionId: sessionIdRef.current,
                        message: text,
                        language: apiLanguage,
                    })
                    : await sendChatMessage({
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
                        : t("chat.error.unexpected", "We hit an unexpected issue while contacting the assistant."),
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
        setMessages([buildInitialAssistantMessage(initialAssistantText)])
        setUserMessageCount(0)
        setChatInput("")
    }

    const handleSignOut = async () => {
        try {
            await signOutCurrentUser()
        } finally {
            navigate("/login")
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                    <BrandLogo to="/app" className="text-xl sm:text-2xl" />

                    <div className="flex items-center gap-2">
                        <LanguageSwitcher className="hidden rounded-full px-3 text-xs sm:inline-flex" />
                        <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
                            {t("chat.signOut", "Sign out")}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleStartNewConversation}>
                            {t("chat.newChat", "New chat")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={t("chat.aria.back", "Back to offers")}
                            onClick={() => navigate("/app")}
                        >
                            <ArrowLeft className="size-4" />
                            {t("chat.back", "Back to offers")}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
                <div className="chat-sheet-surface flex h-[calc(100vh-11rem)] min-h-[540px] flex-col overflow-hidden rounded-3xl border border-border p-0">
                    <div className="chat-sheet-header">
                        <div className="flex items-start justify-between gap-3">
                            <div className="chat-sheet-brand">
                                <span className="chat-sheet-mark" aria-hidden>
                                    <Shield className="size-4" />
                                </span>
                                <div>
                                    <h1 className="font-display text-base font-semibold text-[var(--palette-text-primary)]">
                                        {t("platform.assistant", "InsurAI Assistant")}
                                    </h1>
                                    <p className="chat-sheet-status">
                                        <span className="pulse-dot" aria-hidden />
                                        {t("platform.ready", "Ready to guide you")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

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
                        <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
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
                                                    <p className="font-display text-sm font-semibold tracking-[-0.01em]">{pack.title}</p>
                                                    <p className="chat-pack-agency mt-1 font-body text-xs">{pack.agencyName}</p>
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
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setChatInput(event.target.value)}
                                placeholder={t("platform.typeMessage", "Type your message")}
                                className="chat-input-field h-10"
                                disabled={isSending}
                            />
                            <Button
                                type="submit"
                                className="chat-send-btn"
                                aria-label={t("chat.aria.send", "Send message")}
                                disabled={isSending}
                            >
                                <SendHorizontal className="size-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    )
}
