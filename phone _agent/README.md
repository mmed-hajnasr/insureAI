# Voice Agent – Asterisk + Gemini/Google STT/TTS

A dockerised Asterisk PBX wired to Python AGI scripts that provide speech-to-text (Google Cloud Speech), LLM responses (Gemini), and text-to-speech — callable from any SIP softphone.

---

## Prerequisites

| Tool | Why |
|------|-----|
| Docker | Runs the Asterisk container |
| A SIP softphone | e.g. Linphone (free, cross-platform) |
| Google Cloud credentials | `key.json` / `auth.json` for STT |

---

## Project layout

```
.
├── deploy.sh              # ← this script
├── asterisk/
│   ├── extensions.conf
│   ├── sip.conf
│   ├── pjsip.conf
│   └── modules.conf
├── agent.py
├── gemini.py
├── rag.py
├── stt.py
├── tts.py
├── .env
└── key.json               # Google service-account credentials
```

---

## Quick start

```bash
# 1. Clone / unpack the project, then:
chmod +x deploy.sh

# 2. Run with defaults  (container name: asterisk, image: andrius/asterisk:latest)
./deploy.sh

# 3. Or specify a custom container name and/or image
./deploy.sh my-asterisk andrius/asterisk:22
```

The script will:
1. Pull the Asterisk Docker image if not already present
2. Start the container (host networking, auto-restart)
3. Copy all config & AGI scripts into the container
4. Install Python deps + ffmpeg inside the container
5. Reload Asterisk so the config is live

---

## Linphone setup

1. Open Linphone → **Use SIP account**
2. Username: `agent`
3. Password: `1234`
4. Domain: `<YOUR_LAPTOP_IP>` (the machine running Docker)
5. Transport: `UDP`

Dial any extension defined in `extensions.conf` to reach the voice agent.

---

## Environment variables (`.env`)

```env
GEMINI_API_KEY=your_gemini_key
GOOGLE_APPLICATION_CREDENTIALS=/var/lib/asterisk/agi-bin/key.json
```

---

## Customising the Docker image

The default image is `andrius/asterisk:latest`. Pass a different image as the second argument:

```bash
./deploy.sh asterisk andrius/asterisk:20-alpine
```

Popular community images:
- `andrius/asterisk` — Debian-based, most common
- `andrius/asterisk:<version>-alpine` — smaller footprint

---

## Troubleshooting

```bash
# Live Asterisk logs
docker logs -f asterisk

# Drop into the container
docker exec -it asterisk bash

# Check AGI script is executable
docker exec asterisk ls -la /var/lib/asterisk/agi-bin/

# Reload dialplan without restarting
docker exec asterisk asterisk -rx 'dialplan reload'
```