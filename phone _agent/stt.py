from __future__ import annotations

import base64
import os
from pathlib import Path

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

CLOUD_SCOPE = "https://www.googleapis.com/auth/cloud-platform"


def _access_token(credentials_path: str) -> str:
    credentials = service_account.Credentials.from_service_account_file(
        credentials_path,
        scopes=[CLOUD_SCOPE],
    )
    credentials.refresh(Request())
    return credentials.token


def transcribe_wav_file(
    wav_path: Path,
    credentials_path: str | None = None,
    language_code: str = "ar-TN",
    project_id: str | None = None,
    location: str = "us-central1",
    model: str = "gemini-2.0-flash",
) -> str:
    if not credentials_path:
        credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")

    # Read and encode audio
    with open(wav_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode()

    token = _access_token(credentials_path)

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": "audio/wav",
                            "data": audio_b64,
                        }
                    },
                    {
                        "text": (
                            "Transcribe exactly what is said in this audio. "
                            "The speaker is Tunisian and may speak Tunisian Darija (dialect). "
                            "Return ONLY the transcription text, nothing else. "
                            "If the audio is silent or unintelligible, return empty string."
                        )
                    },
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 300,
        },
    }

    if not project_id:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")

    url = (
        f"https://{location}-aiplatform.googleapis.com/v1beta1/"
        f"projects/{project_id}/locations/{location}/"
        f"publishers/google/models/{model}:generateContent"
    )

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )

    if response.status_code != 200:
        raise RuntimeError(f"Gemini STT failed ({response.status_code}): {response.text}")

    body = response.json()
    parts = (
        body.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )

    text = ""
    for part in parts:
        if "text" in part:
            text = part["text"].strip()
            break

    # If Gemini says nothing/silence indicators
    if not text or text.lower() in ("", "...", "[silence]", "[inaudible]", "silent"):
        return ""

    return text