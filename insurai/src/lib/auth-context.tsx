import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { User } from "firebase/auth"

import { isFirebaseConfigured, observeAuthState } from "@/lib/firebase-auth"

type AuthContextValue = {
    user: User | null
    isLoading: boolean
    isFirebaseReady: boolean
    isPaid: boolean
    markUserAsPaid: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PAYMENT_STATUS_STORAGE_KEY = "insurai.payment-status"

function readPaymentStatus() {
    if (typeof window === "undefined") {
        return {} as Record<string, boolean>
    }

    const raw = window.localStorage.getItem(PAYMENT_STATUS_STORAGE_KEY)

    if (!raw) {
        return {} as Record<string, boolean>
    }

    try {
        const parsed = JSON.parse(raw)
        return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, boolean>) : {}
    } catch {
        return {} as Record<string, boolean>
    }
}

function writePaymentStatus(nextValue: Record<string, boolean>) {
    if (typeof window === "undefined") {
        return
    }

    window.localStorage.setItem(PAYMENT_STATUS_STORAGE_KEY, JSON.stringify(nextValue))
}

function ensureUnpaidByDefault(userId: string) {
    const statuses = readPaymentStatus()

    if (Object.prototype.hasOwnProperty.call(statuses, userId)) {
        return Boolean(statuses[userId])
    }

    const nextStatuses = {
        ...statuses,
        [userId]: false,
    }

    writePaymentStatus(nextStatuses)
    return false
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isPaid, setIsPaid] = useState(false)

    useEffect(() => {
        const unsubscribe = observeAuthState((nextUser) => {
            setUser(nextUser)

            if (!nextUser) {
                setIsPaid(false)
            } else {
                setIsPaid(ensureUnpaidByDefault(nextUser.uid))
            }

            setIsLoading(false)
        })

        return unsubscribe
    }, [])

    const markUserAsPaid = useCallback(() => {
        if (!user) {
            return
        }

        const statuses = readPaymentStatus()
        const nextStatuses = {
            ...statuses,
            [user.uid]: true,
        }

        writePaymentStatus(nextStatuses)
        setIsPaid(true)
    }, [user])

    const value = useMemo(
        () => ({
            user,
            isLoading,
            isFirebaseReady: isFirebaseConfigured,
            isPaid,
            markUserAsPaid,
        }),
        [isLoading, isPaid, markUserAsPaid, user]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }

    return context
}