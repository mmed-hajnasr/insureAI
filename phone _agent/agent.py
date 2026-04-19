#!/usr/bin/env python3
from __future__ import annotations

import logging
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv  # type: ignore[import-not-found]

from gemini import GeminiChatSession, GeminiTranslator, SYSTEM_PROMPT
from rag import RagRetriever
from stt import transcribe_wav_file
from tts import render_tts_for_asterisk

RESPONSE_RE = re.compile(r"^\d+\s+result=(-?\d+)(?:\s+\((.*)\))?")
SMALL_TALK_RE = re.compile(
    r"^\s*(?:"
    r"salam|aslema|marhbe|marhba|ahlan|labes|"
    r"chokran|merci|thanks|bye|ok|okay|yes|no|ey|le|"
    r"hi|hello"
    r")\s*[!.?؟]*\s*$",
    re.IGNORECASE,
)


class AgiHangup(Exception):
    pass


class AgiProtocolError(RuntimeError):
    pass


class AgiSession:
    def __init__(self) -> None:
        self.env = self._read_env()

    def _read_env(self) -> dict[str, str]:
        env: dict[str, str] = {}
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip()
            if not line:
                break
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            env[key.strip()] = value.strip()
        return env

    def command(self, command: str) -> str:
        sys.stdout.write(f"{command}\n")
        sys.stdout.flush()

        response = sys.stdin.readline()
        if not response:
            raise AgiHangup("No AGI response (caller likely hung up)")

        response = response.strip()
        if response.startswith("HANGUP"):
            raise AgiHangup(response)
        if response.startswith("510") or response.startswith("520"):
            raise AgiProtocolError(response)
        return response

    def _result_code(self, response: str) -> int:
        match = RESPONSE_RE.match(response)
        if not match:
            raise AgiProtocolError(f"Unexpected AGI response: {response}")
        return int(match.group(1))

    def answer(self) -> None:
        self.command("ANSWER")

    def record_file(
        self,
        path_without_extension: Path,
        timeout_ms: int,
        silence_seconds: int,
    ) -> int:
        response = self.command(
            f"RECORD FILE {path_without_extension} wav # {timeout_ms} 0 s={silence_seconds}"
        )
        return self._result_code(response)

    def stream_file(self, stream_target_without_extension: str) -> int:
        response = self.command(
            f"STREAM FILE {stream_target_without_extension} \"\""
        )
        return self._result_code(response)


@dataclass
class AgentConfig:
    key_file: str
    project_id: str
    location: str
    chat_model: str
    tts_model: str
    tts_voice: str
    tmp_dir: Path
    sounds_root: Path
    sounds_dir: Path
    record_timeout_ms: int
    record_silence_seconds: int
    rag_endpoint: str | None
    rag_timeout_seconds: int
    rag_top_k: int
    rag_query_field: str
    rag_top_k_field: str


def _resolve_key_file(path_from_env: str | None) -> str:
    here = Path(__file__).resolve().parent
    candidates: list[Path] = []

    if path_from_env:
        env_path = Path(path_from_env)
        if env_path.is_absolute():
            candidates.append(env_path)
        else:
            candidates.append((here / env_path).resolve())

    candidates.extend(
        [
            (here / "key.json").resolve(),
            (here / "auth.json").resolve(),
            (here.parent / "key.json").resolve(),
            (here.parent / "auth.json").resolve(),
        ]
    )

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    raise FileNotFoundError(
        "Google credentials were not found. Set GOOGLE_APPLICATION_CREDENTIALS "
        "or place key.json/auth.json next to agent.py."
    )


def load_config() -> AgentConfig:
    here = Path(__file__).resolve().parent
    load_dotenv(here / ".env")

    key_file = _resolve_key_file(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
    if not project_id:
        raise SystemExit("GOOGLE_CLOUD_PROJECT is required in .env")

    rag_endpoint = os.getenv("RAG_ENDPOINT", "").strip() or None
    return AgentConfig(
        key_file=key_file,
        project_id=project_id,
        location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
        chat_model=os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash"),
        tts_model=os.getenv("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview"),
        tts_voice=os.getenv("GEMINI_TTS_VOICE", "Aoede"),
        tmp_dir=Path(os.getenv("AGENT_TMP_DIR", "/tmp/voice-agent")),
        sounds_root=Path(os.getenv("ASTERISK_SOUNDS_ROOT", "/var/lib/asterisk/sounds")),
        sounds_dir=Path(
            os.getenv("ASTERISK_SOUNDS_DIR", "/var/lib/asterisk/sounds/voice-agent")
        ),
        record_timeout_ms=int(os.getenv("RECORD_TIMEOUT_MS", "10000")),
        record_silence_seconds=int(os.getenv("RECORD_SILENCE_SECONDS", "2")),
        rag_endpoint=rag_endpoint,
        rag_timeout_seconds=int(os.getenv("RAG_TIMEOUT_SECONDS", "6")),
        rag_top_k=max(int(os.getenv("RAG_TOP_K", "3")), 1),
        rag_query_field=os.getenv("RAG_QUERY_FIELD", "query").strip() or "query",
        rag_top_k_field=os.getenv("RAG_TOP_K_FIELD", "k").strip() or "k",
    )


def _cleanup(paths: list[Path]) -> None:
    for path in paths:
        try:
            if path.exists():
                path.unlink()
        except OSError:
            continue


def _should_use_rag(transcript: str) -> bool:
    normalized = transcript.strip()
    if not normalized:
        return False

    if SMALL_TALK_RE.match(normalized):
        return False

    word_count = len(normalized.split())
    if word_count <= 2 and "?" not in normalized and "؟" not in normalized:
        return False

    return True


def run_agi() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    agi = AgiSession()
    if not agi.env:
        logging.error("No AGI environment detected. Run this script from Asterisk AGI.")
        return 2

    config = load_config()
    config.tmp_dir.mkdir(parents=True, exist_ok=True)
    config.sounds_dir.mkdir(parents=True, exist_ok=True)

    chat = GeminiChatSession(
        key_file=config.key_file,
        project_id=config.project_id,
        location=config.location,
        model=config.chat_model,
        system_prompt=SYSTEM_PROMPT,
    )
    translator = GeminiTranslator(
        key_file=config.key_file,
        project_id=config.project_id,
        location=config.location,
        model=config.chat_model,
    )

    rag_retriever: RagRetriever | None = None
    if config.rag_endpoint:
        rag_retriever = RagRetriever(
            endpoint=config.rag_endpoint,
            timeout_seconds=config.rag_timeout_seconds,
            top_k=config.rag_top_k,
            extra_payload={"company": "ALL"},
            query_field=config.rag_query_field,
            top_k_field=config.rag_top_k_field,
        )
        logging.info(
            "RAG retrieval enabled: %s (company=%s)",
            config.rag_endpoint,
            "ALL",
        )
    else:
        logging.info("RAG retrieval disabled (RAG_ENDPOINT is not set)")

    call_id = agi.env.get("agi_uniqueid", f"call-{int(time.time())}")
    logging.info("Call started: %s", call_id)

    generated_paths: list[Path] = []

    try:
        agi.answer()

        greeting = "3aslema, ena Salma, l'experte mte3kom fel assurance mel platforme Insur-Ai. Najem n3awnkom f'ay 7aja?"
        greeting_file = render_tts_for_asterisk(
            text=greeting,
            output_dir=config.sounds_dir,
            sounds_root=config.sounds_root,
            key_file=config.key_file,
            project_id=config.project_id,
            location=config.location,
            model=config.tts_model,
            voice_name=config.tts_voice,
        )
        generated_paths.extend(greeting_file.temp_paths)
        if agi.stream_file(greeting_file.stream_target) == -1:
            return 0

        turn_index = 0
        while True:
            turn_index += 1
            filename = f"{call_id}_{turn_index}_{int(time.time() * 1000)}"
            basename = config.tmp_dir / filename
            wav_path = config.tmp_dir / f"{filename}.wav"

            logging.info("TURN %d: recording...", turn_index)
            import time as _t; _t.sleep(0.8)
            record_result = agi.record_file(
                path_without_extension=basename,
                timeout_ms=config.record_timeout_ms,
                silence_seconds=config.record_silence_seconds,
            )

            # Asterisk writes the file slightly after sending the AGI response
            import time as _time
            _time.sleep(0.5)

            logging.info("TURN %d: record_result=%s wav_exists=%s wav_size=%s",
                turn_index, record_result,
                wav_path.exists(),
                wav_path.stat().st_size if wav_path.exists() else 0)

            if record_result == -1:
                logging.info("TURN %d: hangup detected", turn_index)
                break

            if not wav_path.exists():
                logging.info("TURN %d: wav missing after wait, skipping", turn_index)
                continue

            import struct, math
            with open(wav_path, 'rb') as f:
                f.seek(44)
                raw = f.read()
            if len(raw) < 2:
                logging.info("TURN %d: wav too short, skipping", turn_index)
                _cleanup([wav_path])
                continue
            samples = struct.unpack('<' + 'h' * (len(raw) // 2), raw)
            rms = math.sqrt(sum(s * s for s in samples) / len(samples))
            logging.info("TURN %d: RMS=%.1f", turn_index, rms)
            if rms < 300:
                logging.info("TURN %d: silence/comfort noise, skipping", turn_index)
                _cleanup([wav_path])
                continue

            logging.info("TURN %d: transcribing...", turn_index)
            transcript = transcribe_wav_file(
                wav_path=wav_path,
                credentials_path=config.key_file,
                language_code="ar-TN",
                project_id=config.project_id,
                location=config.location,
                model="gemini-2.5-pro",
            )
            _cleanup([wav_path])
            logging.info("TURN %d: transcript=%r", turn_index, transcript)

            if not transcript:
                logging.info("TURN %d: empty transcript, skipping", turn_index)
                continue

            logging.info("[%s] user: %s", call_id, transcript)
            rag_context = ""
            if rag_retriever and _should_use_rag(transcript):
                rag_query = transcript
                try:
                    rag_query = translator.to_english(transcript)
                    logging.info("TURN %d: translated query for RAG=%r", turn_index, rag_query)
                except Exception as exc:
                    logging.warning(
                        "TURN %d: translation failed, using original transcript for RAG: %s",
                        turn_index,
                        exc,
                    )

                try:
                    rag_context = rag_retriever.retrieve(rag_query)
                    if rag_context:
                        logging.info(
                            "TURN %d: RAG context chars=%d",
                            turn_index,
                            len(rag_context),
                        )
                    else:
                        logging.info("TURN %d: RAG returned no context", turn_index)
                except Exception as exc:
                    logging.warning("TURN %d: RAG retrieval failed: %s", turn_index, exc)

            try:
                reply = chat.reply(transcript, retrieved_context=rag_context)
            except Exception as exc:
                logging.exception("TURN %d: Gemini failed: %s", turn_index, exc)
                reply = "Smahli, fama mouchkla taw. Aawed baad chwaya."

            logging.info("[%s] dalanda: %s", call_id, reply)
            logging.info("TURN %d: generating TTS...", turn_index)
            tts_file = render_tts_for_asterisk(
                text=reply,
                output_dir=config.sounds_dir,
                sounds_root=config.sounds_root,
                key_file=config.key_file,
                project_id=config.project_id,
                location=config.location,
                model=config.tts_model,
                voice_name=config.tts_voice,
            )
            generated_paths.extend(tts_file.temp_paths)
            logging.info("TURN %d: playing TTS %s", turn_index, tts_file.stream_target)
            result = agi.stream_file(tts_file.stream_target)
            logging.info("TURN %d: stream_file result=%s", turn_index, result)
            if result == -1:
                break

    except AgiHangup:
        logging.info("Caller hung up: %s", call_id)
    except Exception as exc:
        logging.exception("Unhandled AGI exception: %s", exc)
    finally:
        _cleanup(generated_paths)

    return 0


def main() -> None:
    raise SystemExit(run_agi())


if __name__ == "__main__":
    main()
