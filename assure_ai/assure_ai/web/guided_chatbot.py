"""Guided assurance chatbot endpoint with explicit multi-step flow."""

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

router = APIRouter(prefix="/guided-chat", tags=["guided-chatbot"])

GUIDED_INSTRUCTIONS = (
    "You are running inside a guided insurance workflow endpoint. "
    "Follow this strict sequence: "
    "(1) infer and confirm what the user wants to insure from their latest message; "
    "(2) ask concise in-depth follow-up questions (one question at a time) about risks, "
    "coverage expectations, budget, and optional preferred agency; "
    "(3) once information is enough, explain ways the user can be insured and the relevant "
    "insurance types for this scenario; "
    "(4) then provide assurance options using response_type='pack_list' with structured packs. "
    "If information is still missing, return response_type='text' and ask exactly one question. "
    "Do not ask 'What would you like to insure?' if the user already provided that information. "
    "Every response must include a short 'Options:' section with 2-4 numbered choices the user "
    "can pick next. If response_type='text', options must be possible answers to your one "
    "question (plus an optional 'Other' choice). If response_type='pack_list', options must be "
    "next actions (for example compare, refine budget, or select a pack)."
)


class GuidedChatMessage(BaseModel):
    """A single message in the guided chat history."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class GuidedChatRequest(BaseModel):
    """Incoming guided chatbot message payload."""

    session_id: str = Field(default="default", min_length=1)
    message: str = Field(min_length=1)
    language: Literal["english", "french", "arabic"] = "english"


class GuidedChatResponse(BaseModel):
    """Guided chatbot response payload with in-memory history."""

    session_id: str
    reply: str
    response_type: Literal["text", "pack_list"] = "text"
    packs: list[PackSummary] = Field(default_factory=list)
    history: list[GuidedChatMessage]


def _build_language_instruction(language: Literal["english", "french", "arabic"]) -> str:
    """Build language policy for guided-chat agent responses."""
    if language == "arabic":
        return (
            "Respond in Arabic using Tunisian dialect only. "
            "Do not use Modern Standard Arabic unless user explicitly asks for it."
        )
    if language == "french":
        return "Respond in French."
    return "Respond in English."


def _build_guided_prompt(
    message: str,
    history: list[GuidedChatMessage],
    language: Literal["english", "french", "arabic"],
) -> str:
    """Build prompt including strict guided workflow and recent context."""
    language_instruction = _build_language_instruction(language)
    if not history:
        return (
            f"{GUIDED_INSTRUCTIONS}\n\n"
            f"{language_instruction}\n\n"
            f"Latest user message: {message}"
        )

    recent_history = history[-8:]
    history_lines = [f"{item.role}: {item.content}" for item in recent_history]
    history_block = "\n".join(history_lines)
    return (
        f"{GUIDED_INSTRUCTIONS}\n\n"
        f"{language_instruction}\n\n"
        "Conversation history:\n"
        f"{history_block}\n\n"
        "Respond to the latest user message using tools when coverage advice is needed.\n"
        f"Latest user message: {message}"
    )


async def _generate_guided_reply(
    message: str,
    history: list[GuidedChatMessage],
    retriever: QdrantRetriever,
    language: Literal["english", "french", "arabic"],
) -> ChatAgentOutput:
    """Run retrieval-enabled guided flow and return structured agent output."""
    prompt = _build_guided_prompt(message, history, language)
    deps = ChatAgentDeps(
        retriever=retriever,
        default_limit=settings.qdrant_default_limit,
    )
    result = await assurance_chat_agent.run(prompt, deps=deps)
    return result.output


@router.post("", response_model=GuidedChatResponse)
@trace_span("Guided chatbot advice")
async def guided_chat(
    request: GuidedChatRequest,
    app_request: Request,
) -> GuidedChatResponse:
    """Handle guided chat by explicitly starting with an insurance target question."""
    if not hasattr(app_request.app.state, "guided_chat_history"):
        raise HTTPException(
            status_code=500,
            detail="Guided chat history store unavailable",
        )

    history_store: dict[str, list[GuidedChatMessage]] = (
        app_request.app.state.guided_chat_history
    )
    qdrant_retriever: QdrantRetriever | None = getattr(
        app_request.app.state,
        "qdrant_retriever",
        None,
    )

    session_history = history_store.setdefault(request.session_id, [])
    user_message = GuidedChatMessage(role="user", content=request.message.strip())

    should_use_agent = bool(settings.google_api_key) and qdrant_retriever is not None
    if not should_use_agent:
        raise HTTPException(
            status_code=503,
            detail=(
                "Chat agent dependencies are unavailable. Ensure Google API key and Qdrant "
                "retriever are configured."
            ),
        )

    session_history.append(user_message)

    try:
        previous_history = session_history[:-1]
        agent_output = await _generate_guided_reply(
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
    assistant_message = GuidedChatMessage(role="assistant", content=reply_text)
    session_history.append(assistant_message)

    return GuidedChatResponse(
        session_id=request.session_id,
        reply=reply_text,
        response_type=agent_output.response_type,
        packs=agent_output.packs,
        history=session_history,
    )
