from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import requests

_TEXT_KEYS = (
    "text",
    "content",
    "chunk",
    "snippet",
    "passage",
    "body",
    "answer",
    "response",
    "context",
    "document",
)

_LIST_KEYS = (
    "results",
    "documents",
    "chunks",
    "contexts",
    "data",
    "items",
    "matches",
    "retrievals",
    "sources",
)


def _normalize_text(value: str) -> str:
    return " ".join(value.split()).strip()


def _iter_text_candidates(value: Any) -> list[str]:
    texts: list[str] = []

    if isinstance(value, str):
        normalized = _normalize_text(value)
        if normalized:
            texts.append(normalized)
        return texts

    if isinstance(value, list):
        for item in value:
            texts.extend(_iter_text_candidates(item))
        return texts

    if isinstance(value, dict):
        for key in _TEXT_KEYS:
            field_value = value.get(key)
            if isinstance(field_value, str):
                normalized = _normalize_text(field_value)
                if normalized:
                    texts.append(normalized)

        for key in _LIST_KEYS:
            if key in value:
                texts.extend(_iter_text_candidates(value[key]))

    return texts


@dataclass
class RagRetriever:
    endpoint: str
    timeout_seconds: int = 6
    top_k: int = 3
    query_field: str = "query"
    top_k_field: str = "k"
    extra_payload: dict[str, Any] = field(default_factory=dict)
    include_legacy_aliases: bool = False

    def retrieve(self, question: str) -> str:
        question = _normalize_text(question)
        if not question:
            return ""

        headers = {"Content-Type": "application/json"}

        payload: dict[str, Any] = {
            self.query_field: question,
            self.top_k_field: self.top_k,
        }

        if self.include_legacy_aliases:
            payload.update(
                {
                    "query": question,
                    "question": question,
                    "top_k": self.top_k,
                    "k": self.top_k,
                }
            )

        payload.update(self.extra_payload)

        response = requests.post(
            self.endpoint,
            headers=headers,
            json=payload,
            timeout=self.timeout_seconds,
        )

        # Some endpoints expose a GET-only search route.
        if response.status_code == 405:
            response = requests.get(
                self.endpoint,
                headers=headers,
                params={
                    self.query_field: question,
                    self.top_k_field: self.top_k,
                    **({"query": question, "q": question, "k": self.top_k, "top_k": self.top_k}
                       if self.include_legacy_aliases
                       else {}),
                },
                timeout=self.timeout_seconds,
            )

        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "").lower()
        if "application/json" in content_type:
            body: Any = response.json()
        else:
            body = {"context": response.text}

        snippets = self._extract_snippets(body)
        if not snippets:
            return ""

        return "\n".join(f"{idx + 1}. {snippet}" for idx, snippet in enumerate(snippets))

    def _extract_snippets(self, body: Any) -> list[str]:
        candidates = _iter_text_candidates(body)
        unique: list[str] = []
        seen: set[str] = set()

        for text in candidates:
            if len(text) < 12:
                continue

            key = text.casefold()
            if key in seen:
                continue

            seen.add(key)
            unique.append(text[:320])

            if len(unique) >= max(self.top_k, 1):
                break

        return unique