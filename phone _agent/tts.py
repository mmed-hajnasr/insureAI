from __future__ import annotations

import base64
import subprocess
import uuid
from dataclasses import dataclass
from pathlib import Path

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

CLOUD_SCOPE = "https://www.googleapis.com/auth/cloud-platform"


@dataclass
class AsteriskPlaybackFile:
    wav_path: Path
    stream_target: str
    temp_paths: list[Path]


def _access_token(key_file: str) -> str:
    credentials = service_account.Credentials.from_service_account_file(
        key_file,
        scopes=[CLOUD_SCOPE],
    )
    credentials.refresh(Request())
    return credentials.token


def synthesize_tts_pcm24k(
    text: str,
    key_file: str,
    project_id: str,
    location: str = "us-central1",
    model: str = "gemini-3.1-flash-tts-preview",
    voice_name: str = "Aoede",
    timeout_seconds: int = 30,
) -> bytes:
    url = (
        f"https://{location}-aiplatform.googleapis.com/v1beta1/"
        f"projects/{project_id}/locations/{location}/"
        f"publishers/google/models/{model}:generateContent"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"Speak this exactly: {text}"}],
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice_name,
                    }
                }
            },
        },
    }

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {_access_token(key_file)}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=timeout_seconds,
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"Gemini TTS failed ({response.status_code}): {response.text}"
        )

    body = response.json()
    audio_b64 = (
        body.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("inlineData", {})
        .get("data")
    )

    if not audio_b64:
        raise RuntimeError(f"Gemini TTS response missing audio payload: {body}")

    return base64.b64decode(audio_b64)


def _convert_pcm24k_to_wav8k(raw_pcm_path: Path, wav_path: Path) -> None:
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "s16le",
        "-ar",
        "24000",
        "-ac",
        "1",
        "-i",
        str(raw_pcm_path),
        "-ar",
        "8000",
        "-ac",
        "1",
        "-acodec",
        "pcm_s16le",
        str(wav_path),
    ]

    process = subprocess.run(command, capture_output=True, text=True)
    if process.returncode != 0:
        raise RuntimeError(process.stderr.strip() or "ffmpeg conversion failed")


def _build_stream_target(wav_path: Path, sounds_root: Path) -> str:
    try:
        relative = wav_path.relative_to(sounds_root)
        return str(relative.with_suffix(""))
    except ValueError:
        return str(wav_path.with_suffix(""))


def render_tts_for_asterisk(
    text: str,
    output_dir: Path,
    sounds_root: Path,
    key_file: str,
    project_id: str,
    location: str,
    model: str,
    voice_name: str,
) -> AsteriskPlaybackFile:
    output_dir.mkdir(parents=True, exist_ok=True)
    token = f"tts_{uuid.uuid4().hex}"

    raw_pcm_path = output_dir / f"{token}.s16le"
    wav_path = output_dir / f"{token}.wav"

    pcm24k = synthesize_tts_pcm24k(
        text=text,
        key_file=key_file,
        project_id=project_id,
        location=location,
        model=model,
        voice_name=voice_name,
    )

    raw_pcm_path.write_bytes(pcm24k)
    _convert_pcm24k_to_wav8k(raw_pcm_path, wav_path)

    stream_target = _build_stream_target(wav_path=wav_path, sounds_root=sounds_root)
    return AsteriskPlaybackFile(
        wav_path=wav_path,
        stream_target=stream_target,
        temp_paths=[raw_pcm_path, wav_path],
    )
