"""Chatbot endpoint for assurance and finance guidance."""

from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from assure_ai.agents.chat_agent import (
    ChatAgentDeps,
    ChatAgentOutput,
    PackSummary,
    assurance_chat_agent,
)
from assure_ai.agents.qdrant_retriever import QdrantRetriever
from assure_ai.settings import settings
from assure_ai.tracing.decorator import trace_span

router = APIRouter(prefix="/chat", tags=["chatbot"])


class ChatMessage(BaseModel):
    """A single message in the chat history."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    """Incoming chatbot message payload."""

    session_id: str = Field(default="default", min_length=1)
    message: str = Field(min_length=1)
    language: Literal["english", "french", "arabic"] = "english"


class ChatResponse(BaseModel):
    """Chatbot response payload with in-memory history."""

    session_id: str
    reply: str
    response_type: Literal["text", "pack_list"] = "text"
    packs: list[PackSummary] = Field(default_factory=list)
    history: list[ChatMessage]


def _build_language_instruction(language: Literal["english", "french", "arabic"]) -> str:
    """Build language policy for agent responses."""
    if language == "arabic":
        return (
            "Respond in Arabic using Tunisian dialect only. "
            "Do not use Modern Standard Arabic unless user explicitly asks for it."
        )
    if language == "french":
        return "Respond in French."
    return "Respond in English."


def _build_agent_prompt(
    message: str,
    history: list[ChatMessage],
    language: Literal["english", "french", "arabic"],
) -> str:
    """Build an agent prompt with concise prior conversation context."""
    language_instruction = _build_language_instruction(language)
    if not history:
        return f"{language_instruction}\n\nLatest user message: {message}"

    recent_history = history[-6:]
    history_lines = [f"{item.role}: {item.content}" for item in recent_history]
    history_block = "\n".join(history_lines)
    return (
        f"{language_instruction}\n\n"
        "Conversation history:\n"
        f"{history_block}\n\n"
        "Respond to the latest user message using tools when coverage advice is needed.\n"
        f"Latest user message: {message}"
    )


async def _generate_agent_reply(
    message: str,
    history: list[ChatMessage],
    retriever: QdrantRetriever,
    language: Literal["english", "french", "arabic"],
) -> ChatAgentOutput:
    """Run the retrieval-enabled agent and return its response text."""
    prompt = _build_agent_prompt(message, history, language)
    deps = ChatAgentDeps(
        retriever=retriever,
        default_limit=settings.qdrant_default_limit,
    )
    result = await assurance_chat_agent.run(prompt, deps=deps)
    return result.output


@router.post("", response_model=ChatResponse)
@trace_span("Chatbot advice")
async def chat(request: ChatRequest, app_request: Request) -> ChatResponse:
    """Handle user messages and persist chat history in memory by session."""
    if not hasattr(app_request.app.state, "chat_history"):
        raise HTTPException(status_code=500, detail="Chat history store unavailable")

    history_store: dict[str, list[ChatMessage]] = app_request.app.state.chat_history
    qdrant_retriever: QdrantRetriever | None = getattr(
        app_request.app.state,
        "qdrant_retriever",
        None,
    )

    session_history = history_store.setdefault(request.session_id, [])
    user_message = ChatMessage(role="user", content=request.message.strip())
    session_history.append(user_message)

    should_use_agent = bool(settings.google_api_key) and qdrant_retriever is not None

    if not should_use_agent:
        raise HTTPException(
            status_code=503,
            detail=(
                "Chat agent dependencies are unavailable. Ensure Google API key and Qdrant "
                "retriever are configured."
            ),
        )

    try:
        previous_history = session_history[:-1]
        agent_output = await _generate_agent_reply(
            message=request.message,
            history=previous_history,
            retriever=qdrant_retriever,
            language=request.language,
        )
    except Exception as exc:
        error_message = str(exc).strip() or "unknown_error"
        raise HTTPException(
            status_code=502,
            detail=(
                "Agent failed to produce a response from retrieval workflow. "
                f"Reason: {error_message}"
            ),
        ) from exc

    reply_text = agent_output.text.strip()
    assistant_message = ChatMessage(role="assistant", content=reply_text)
    session_history.append(assistant_message)

    return ChatResponse(
        session_id=request.session_id,
        reply=reply_text,
        response_type=agent_output.response_type,
        packs=agent_output.packs,
        history=session_history,
    )
