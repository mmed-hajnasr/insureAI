export type ChatPack = {
    agencyName: string
    title: string
    description: string
}

type ChatApiResponseRaw = {
    reply?: string
    response_type?: "text" | "pack_list"
    packs?: Array<{
        agency_name?: string
        title?: string
        description?: string
    }>
}

export type ChatApiResponse = {
    reply: string
    responseType: "text" | "pack_list"
    packs: ChatPack[]
}

export type ChatRequestLanguage = "english" | "french" | "arabic"

type SendChatMessageInput = {
    sessionId: string
    message: string
    language: ChatRequestLanguage
    signal?: AbortSignal
}

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8001"

const configuredApiBaseUrl =
    import.meta.env.VITE_ASSURE_API_URL ??
    import.meta.env.VITE_API_BASE_URL

const shouldUseDevProxy =
    import.meta.env.DEV &&
    (!configuredApiBaseUrl ||
        configuredApiBaseUrl === "http://127.0.0.1:8001" ||
        configuredApiBaseUrl === "http://localhost:8001")

const apiBaseUrl = shouldUseDevProxy
    ? "/api"
    : configuredApiBaseUrl ?? DEFAULT_API_BASE_URL

function normalizeBaseUrl(url: string) {
    return url.endsWith("/") ? url.slice(0, -1) : url
}

function buildErrorMessage(status: number, detail?: string) {
    if (detail) {
        return detail
    }

    if (status === 503) {
        return "Assistant is temporarily unavailable. Please try again in a moment."
    }

    if (status === 502) {
        return "The recommendation pipeline failed. Please retry your request."
    }

    if (status === 500) {
        return "Chat session storage is unavailable right now. Please retry shortly."
    }

    return `Chat failed with status ${status}`
}

async function postChatMessage({
    endpoint,
    sessionId,
    message,
    language,
    signal,
}: SendChatMessageInput & { endpoint: "/chat" | "/guided-chat" }) {
    let response: Response

    try {
        response = await fetch(`${normalizeBaseUrl(apiBaseUrl)}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                session_id: sessionId,
                message,
                language,
            }),
            signal,
        })
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(
                `Cannot reach ${endpoint} backend from the browser. If \`${endpoint}\` works in curl, this is usually CORS. In dev, run frontend with Vite proxy (\`VITE_ASSURE_API_URL=/api\`).`
            )
        }

        throw error
    }

    if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null
        throw new Error(buildErrorMessage(response.status, errorBody?.detail))
    }

    const raw = (await response.json()) as ChatApiResponseRaw

    return {
        reply: raw.reply ?? "I processed your message, but no reply text was returned.",
        responseType: raw.response_type ?? "text",
        packs:
            raw.packs?.map((pack) => ({
                agencyName: pack.agency_name ?? "Unknown agency",
                title: pack.title ?? "Untitled pack",
                description: pack.description ?? "No description available.",
            })) ?? [],
    } satisfies ChatApiResponse
}

export async function sendChatMessage({ sessionId, message, language, signal }: SendChatMessageInput) {
    return postChatMessage({
        endpoint: "/chat",
        sessionId,
        message,
        language,
        signal,
    })
}

export async function sendGuidedChatMessage({ sessionId, message, language, signal }: SendChatMessageInput) {
    return postChatMessage({
        endpoint: "/guided-chat",
        sessionId,
        message,
        language,
        signal,
    })
}
