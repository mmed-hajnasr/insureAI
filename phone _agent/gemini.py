from __future__ import annotations

from dataclasses import dataclass, field
import random
import re
from typing import Any

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

CLOUD_SCOPE = "https://www.googleapis.com/auth/cloud-platform"

SYSTEM_PROMPT = (
    "You are Salma, a warm and knowledgeable customer support agent for InsurAi (pronounced 'Insure-AI'). "
    "Insur-Ai is Tunisia's first AI-powered insurance discovery platform — it is NOT an insurer. "
    "Insur-Ai helps Tunisian citizens compare insurance offers from multiple insurers, understand their options, "
    "and get matched with the right product for their needs — all in one place, for free. "
    "You are already on a live phone call — the customer has already heard your introduction. "
    "Never re-introduce yourself or say your name again — jump straight into helping. "
    "Always respond in Tunisian Darija using Arabic script. "
    "Use a natural, warm, human tone — like a helpful friend who knows insurance, not a robot reading a script. "
    "Use the provided retrieval context as supporting information, not your only source. "
    "If context is missing or partial, answer from your general insurance knowledge. "
    "Never say you don't have information if general knowledge can answer the question. "
    "When relevant, remind the user that InsurAi platform lets them compare all offers side by side for free. "
    "Always use correct Arabic/French insurance terminology regardless of how the user pronounces or spells it. "
    "If the user mispronounces a term like 'assurance' or 'contrat', use the correct term in your reply — never mirror their mistake. "
    "Never mention RAG, retrieval, context, prompts, or any technical internals. "
    "Never greet the user or say welcome phrases like 'أهلاً' or 'مرحباً' after the first message — the conversation is already ongoing. "
    "Keep responses to 2-3 short sentences. No markdown, no symbols, no lists."
)

TRANSLATE_TO_ENGLISH_PROMPT = (
    "You are an expert linguist specializing in North African dialects. "
    "Your task: Convert Tunisian Darija customer queries into optimized English search terms.\n"
    "Context: The customer is asking about insurance (cars, health, life).\n"
    "Instructions:\n"
    "- Handle mixed Arabic, French (Francarabe), and Latin script (Arabizi).\n"
    "- Extract the core insurance intent.\n"
    "- Return ONLY the English search query.\n"
    "Example Input: 'نحب نعرف كان الكنترات مالح يقبل لمرض لغلاء'\n"
    "Example Output: 'insurance coverage for chronic or expensive illnesses'"
)

_REMINDER = "وللتفاصيل الكاملة والمحيّنة، تلقاها ديما في منصة InsurAi."
_SENTENCE_BOUNDARY_RE = re.compile(r"(?<=[.!?؟])\s+")


def _access_token(key_file: str) -> str:
    credentials = service_account.Credentials.from_service_account_file(
        key_file,
        scopes=[CLOUD_SCOPE],
    )
    credentials.refresh(Request())
    return credentials.token


def _sanitize_reply(text: str) -> str:
    cleaned = (
        text.replace("```", " ")
        .replace("`", " ")
        .replace("**", " ")
        .replace("#", " ")
    )
    return " ".join(cleaned.split()).strip()


def _build_turn_text(user_text: str, retrieved_context: str) -> str:
    context = retrieved_context.strip()
    if not context:
        return user_text

    return (
        "Customer question:\n"
        f"{user_text}\n\n"
        "InsurAi support retrieval context (internal, may be partial):\n"
        f"{context}\n\n"
        "Use the retrieval context when relevant. If not enough, say so briefly."
    )


def _maybe_add_reminder(text: str, force: bool = False) -> str:
    normalized = " ".join(text.split()).strip()
    if not normalized:
        return normalized

    # Remind ~60% of the time
    if not force and random.random() > 0.8:
        return normalized

    if "insurai" in normalized.casefold():
        return normalized

    sentences = [p.strip() for p in _SENTENCE_BOUNDARY_RE.split(normalized) if p.strip()]
    if len(sentences) >= 3:
        sentences[-1] = _REMINDER
        return " ".join(sentences[:3])

    if normalized[-1] not in ".!?؟":
        normalized = f"{normalized}."
    return f"{normalized} {_REMINDER}"

@dataclass
class GeminiChatSession:
    key_file: str
    project_id: str
    location: str = "us-central1"
    model: str = "gemini-2.5-flash"
    system_prompt: str = SYSTEM_PROMPT
    max_turns: int = 8
    timeout_seconds: int = 30
    history: list[dict[str, Any]] = field(default_factory=list)

    def reply(self, user_text: str, retrieved_context: str = "") -> str:
        user_text = user_text.strip()
        if not user_text:
            return ""

        self.history.append({"role": "user", "parts": [{"text": user_text}]})
        self._trim_history()

        # Keep raw user history intact; inject retrieval context only for this turn
        contents = list(self.history)
        contents[-1] = {
            "role": "user",
            "parts": [{"text": _build_turn_text(user_text, retrieved_context)}],
        }

        payload = {
            "systemInstruction": {
                "parts": [{"text": self.system_prompt}],
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.8,
                "maxOutputTokens": 700,
            },
        }

        url = (
            f"https://{self.location}-aiplatform.googleapis.com/v1beta1/"
            f"projects/{self.project_id}/locations/{self.location}/"
            f"publishers/google/models/{self.model}:generateContent"
        )

        token = _access_token(self.key_file)
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=self.timeout_seconds,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"Gemini call failed ({response.status_code}): {response.text}"
            )

        body = response.json()
        parts = (
            body.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )

        reply_text = ""
        for part in parts:
            if "text" in part:
                reply_text = part["text"]
                break

        reply_text = _sanitize_reply(reply_text)
        if not reply_text:
            reply_text = "سماحلي، ما فهمتكش مليح. تنجم تعاود؟"

        reply_text = _maybe_add_reminder(reply_text)

        self.history.append({"role": "model", "parts": [{"text": reply_text}]})
        self._trim_history()
        return reply_text

    def _trim_history(self) -> None:
        max_messages = max(self.max_turns * 2, 2)
        if len(self.history) > max_messages:
            self.history = self.history[-max_messages:]


@dataclass
class GeminiTranslator:
    key_file: str
    project_id: str
    location: str = "us-central1"
    model: str = "gemini-2.5-flash"
    timeout_seconds: int = 20

    def to_english(self, source_text: str) -> str:
        source_text = source_text.strip()
        if not source_text:
            return ""

        payload = {
            "systemInstruction": {
                "parts": [{"text": TRANSLATE_TO_ENGLISH_PROMPT}],
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": source_text}],
                }
            ],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 300,
            },
        }

        url = (
            f"https://{self.location}-aiplatform.googleapis.com/v1beta1/"
            f"projects/{self.project_id}/locations/{self.location}/"
            f"publishers/google/models/{self.model}:generateContent"
        )

        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {_access_token(self.key_file)}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=self.timeout_seconds,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"Gemini translation failed ({response.status_code}): {response.text}"
            )

        body = response.json()
        parts = (
            body.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )

        translated = ""
        for part in parts:
            if "text" in part:
                translated = part["text"]
                break

        translated = _sanitize_reply(translated)
        return translated or source_text    