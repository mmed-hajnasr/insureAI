from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, model_validator
from pydantic_ai import Agent, RunContext

from assure_ai.agents.llm_model import small_model
from assure_ai.agents.qdrant_retriever import QdrantRetriever, RetrievedChunk

SYSTEM_PROMPT = """
You are an assurance advisor chatbot.

Workflow (strict):
1) Discovery phase: ask concise clarification questions to identify the most adequate
    assurance category for the user.
2) Retrieval phase: once enough information is available, call retrieval tools and base
    the recommendation on vector database results.

Discovery requirements:
- Ask one question at a time.
- Ask only what is needed: life situation, key risks, budget tolerance, and optional
  preferred assurance company.
- If information is insufficient, ask follow-up questions and do not recommend offers yet.

Tool usage requirements:
- Choose the category yourself when the user does not explicitly provide one.
- Valid categories are: Auto, Health, Life.
- If user asks broad/unclear comparison or says "all", search category="all".
- If user gives a company/agency filter, pass it as assurance_company.
- If user asks for all companies, set assurance_company="all".
- Always send retrieval tool query in English, even if user writes in another language.

Category selection policy:
- Auto: vehicle, car, driving, accident, mobility risk.
- Health: medical, treatment, hospital, doctor, wellness risk.
- Life: family income protection, dependents, death/disability financial impact.

Your final answer should:
- Recommend the best offer from retrieved results and explain why it fits the user profile.
- Mention when recommendations are based on a specific agency filter.
- Cite source file names in a short "Sources" line.
- Never invent offers that are not supported by retrieved tool output.

Structured response mode:
- If the user asks to list, show, or compare available packs/offers, return
    response_type="pack_list".
- In pack_list mode, fill packs with items containing exactly:
    agency_name, title, description.
- Keep text as a short summary sentence before the list.
- If request is not about listing packs, return response_type="text" and leave packs empty.
""".strip()

QUERY_TRANSLATION_PROMPT = """
You convert retrieval queries into concise English.

Rules:
- Translate to English if needed.
- Preserve insurance intent, product names, and company names.
- Return only the English query text, without quotes or extra commentary.
""".strip()


@dataclass
class ChatAgentDeps:
    """Dependencies used by the assurance chatbot agent."""

    retriever: QdrantRetriever
    default_limit: int


class PackSummary(BaseModel):
    """Structured pack summary item used by the chat endpoint."""

    agency_name: str = Field(min_length=1)
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)


class ChatAgentOutput(BaseModel):
    """Chat agent output that supports plain text and structured pack lists."""

    response_type: Literal["text", "pack_list"] = "text"
    text: str = Field(min_length=1)
    packs: list[PackSummary] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_pack_mode(self) -> ChatAgentOutput:
        """Validate output consistency between response mode and payload."""
        if self.response_type == "pack_list" and not self.packs:
            raise ValueError("packs must be provided when response_type is 'pack_list'")
        return self


assurance_chat_agent: Agent[ChatAgentDeps, ChatAgentOutput] = Agent(
    model=small_model,
    output_type=ChatAgentOutput,
    deps_type=ChatAgentDeps,
    system_prompt=SYSTEM_PROMPT,
    model_settings={"temperature": 0.2, "top_p": 1},
    instrument=True,
)

query_translation_agent: Agent[None, str] = Agent(
    model=small_model,
    output_type=str,
    deps_type=None,
    system_prompt=QUERY_TRANSLATION_PROMPT,
    model_settings={"temperature": 0.0, "top_p": 1},
    instrument=True,
)


def _query_to_english(query: str) -> str:
    """Translate retrieval query to English with safe fallback."""
    stripped_query = query.strip()
    if not stripped_query:
        return stripped_query

    try:
        translation = query_translation_agent.run_sync(stripped_query).output.strip()
    except Exception:
        return stripped_query

    return translation or stripped_query


def _format_chunks(chunks: list[RetrievedChunk]) -> str:
    """Format retrieved chunks into compact context for the language model."""
    lines: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        text = chunk.text.strip().replace("\n", " ")
        compact_text = text[:500]
        lines.append(
            f"[{index}] category={chunk.category}, agency={chunk.assurance_agency}, "
            f"source={chunk.source_file}, chunk={chunk.chunk_index}, score={chunk.score:.4f}"
        )
        lines.append(compact_text)
    return "\n".join(lines)


def _extract_title(chunk: RetrievedChunk) -> str:
    """Extract a readable pack title from markdown chunk or source file name."""
    heading_match = re.search(r"^\s*#\s+(.+)$", chunk.text, flags=re.MULTILINE)
    if heading_match:
        title = heading_match.group(1).strip()
        if title:
            return title

    stem = Path(chunk.source_file).stem.replace("_", " ").strip()
    return stem or "Untitled Pack"


def _clean_markdown_text(text: str) -> str:
    """Remove common markdown syntax and normalize whitespace."""
    cleaned = text
    cleaned = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", cleaned)
    cleaned = re.sub(r"`([^`]*)`", r"\1", cleaned)
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)
    cleaned = re.sub(r"\*(.*?)\*", r"\1", cleaned)
    cleaned = re.sub(r"_(.*?)_", r"\1", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _skip_leading_fragment(text: str) -> str:
    """Skip likely truncated leading text when chunk starts mid-sentence."""
    if not text:
        return text

    stripped = text.lstrip("-:;,. ")
    if not stripped:
        return text

    if stripped[0].islower():
        sentence_parts = re.split(r"(?<=[.!?])\s+", stripped)
        for index, sentence in enumerate(sentence_parts):
            if sentence and sentence[0].isupper():
                return " ".join(sentence_parts[index:]).strip()

    return stripped


def _truncate_summary(text: str, max_length: int = 220) -> str:
    """Trim summary text without cutting words whenever possible."""
    if len(text) <= max_length:
        return text

    candidate = text[:max_length].rstrip()
    last_space = candidate.rfind(" ")
    if last_space > max_length // 2:
        candidate = candidate[:last_space].rstrip()
    return f"{candidate}."


def _extract_description(chunk: RetrievedChunk) -> str:
    """Extract a compact plain-language description from chunk content."""
    lines = [line.strip() for line in chunk.text.splitlines() if line.strip()]
    cleaned_lines: list[str] = []
    for line in lines:
        if line.startswith("#"):
            continue
        if re.fullmatch(r"[-*_]{3,}", line):
            continue
        normalized = re.sub(r"^[-*]\s+", "", line)
        cleaned_lines.append(normalized)

    description = _clean_markdown_text(" ".join(cleaned_lines).strip())
    description = _skip_leading_fragment(description)
    if not description:
        description = "No description available."

    return _truncate_summary(description)


def _format_pack_candidates(chunks: list[RetrievedChunk]) -> str:
    """Format unique candidate packs with agency/title/description fields."""
    seen_keys: set[tuple[str, str]] = set()
    lines: list[str] = []

    for index, chunk in enumerate(chunks, start=1):
        dedupe_key = (
            chunk.assurance_agency.strip().casefold(),
            chunk.source_file.strip().casefold(),
        )
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)

        lines.append(f"[{index}] agency_name={chunk.assurance_agency}")
        lines.append(f"title={_extract_title(chunk)}")
        lines.append(f"description={_extract_description(chunk)}")
        lines.append(f"source={chunk.source_file}, score={chunk.score:.4f}")

    return "\n".join(lines)


@assurance_chat_agent.tool
def list_assurance_categories(ctx: RunContext[ChatAgentDeps]) -> str:
    """List available assurance categories currently indexed in Qdrant."""
    try:
        categories = ctx.deps.retriever.list_categories()
    except Exception as exc:
        return f"Failed to access Qdrant categories. Retriever error: {exc}"

    if not categories:
        return "No assurance categories are currently available in Qdrant."
    return ", ".join(categories)


@assurance_chat_agent.tool
def retrieve_assurance_knowledge(
    ctx: RunContext[ChatAgentDeps],
    query: str,
    category: str,
    assurance_company: str = "all",
    limit: int | None = None,
) -> str:
    """Retrieve relevant assurance chunks by category with optional agency filter."""
    final_limit = limit if limit is not None else ctx.deps.default_limit
    bounded_limit = min(max(final_limit, 1), 12)
    english_query = _query_to_english(query)

    try:
        chunks = ctx.deps.retriever.search(
            query=english_query,
            category=category,
            assurance_company=assurance_company,
            limit=bounded_limit,
        )
    except Exception as exc:
        return f"Failed to query Qdrant assurance knowledge. Retriever error: {exc}"

    if not chunks:
        return (
            "No matching records were found for the requested category and company filter. "
            "Try category='all' or assurance_company='all'."
        )

    return _format_chunks(chunks)


@assurance_chat_agent.tool
def retrieve_pack_catalog(
    ctx: RunContext[ChatAgentDeps],
    query: str,
    category: str,
    assurance_company: str = "all",
    limit: int | None = None,
) -> str:
    """Retrieve unique assurance packs for structured listing answers."""
    final_limit = limit if limit is not None else ctx.deps.default_limit
    bounded_limit = min(max(final_limit, 1), 20)
    english_query = _query_to_english(query)

    try:
        chunks = ctx.deps.retriever.search(
            query=english_query,
            category=category,
            assurance_company=assurance_company,
            limit=bounded_limit,
        )
    except Exception as exc:
        return f"Failed to query Qdrant assurance packs. Retriever error: {exc}"

    if not chunks:
        return (
            "No matching packs were found for the requested category and company filter. "
            "Try category='all' or assurance_company='all'."
        )

    return _format_pack_candidates(chunks)
