# assure_ai (Backend)

`assure_ai` is a FastAPI backend that powers insurance recommendation chat flows.

## Features

- `POST /chat`: free-form insurance assistant chat.
- `POST /guided-chat`: guided, step-by-step insurance interview.
- `POST /tel`: top-k retrieval endpoint over Qdrant chunks.
- `GET /health-check`: liveness endpoint.
- In-memory conversation history keyed by `session_id`.

## Tech stack

- Python `3.13`
- FastAPI + Uvicorn
- `pydantic-ai` (Google Gemini provider)
- Qdrant (remote URL or local embedded storage)

## Prerequisites

- Python `>=3.12` (project targets `3.13`)
- `uv` package manager
- A valid `AGENTS_GOOGLE_API_KEY`

## Environment configuration

Create a local env file from the template:

```bash
cp .env.example .env
```

At minimum, set:

- `AGENTS_GOOGLE_API_KEY`

Qdrant options:

- **Remote Qdrant**: set `AGENTS_QDRANT_URL` (for example `http://localhost:6333`)
- **Embedded Qdrant**: leave `AGENTS_QDRANT_URL` empty and use `AGENTS_QDRANT_LOCAL_PATH`

## Run locally

```bash
uv sync --locked
uv run -m assure_ai
```

Backend starts on `http://127.0.0.1:8001` by default.

Interactive docs:

- Swagger: `http://127.0.0.1:8001/docs`
- ReDoc: `http://127.0.0.1:8001/redoc`

## Docker

Build backend image:

```bash
docker build -t assure-ai-backend .
```

Run backend container:

```bash
docker run --rm -p 8001:8001 \
  -e AGENTS_GOOGLE_API_KEY="<your-google-api-key>" \
  -e AGENTS_QDRANT_URL="http://host.docker.internal:6333" \
  assure-ai-backend
```

For full frontend + backend + qdrant orchestration, use the root-level `../docker-compose.yaml`.

## API quick examples

`POST /chat`:

```bash
curl -X POST http://127.0.0.1:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id":"demo-1","message":"I need car insurance advice","language":"english"}'
```

`POST /guided-chat`:

```bash
curl -X POST http://127.0.0.1:8001/guided-chat \
  -H "Content-Type: application/json" \
  -d '{"session_id":"guided-1","message":"I want to insure my family car","language":"english"}'
```

`POST /tel`:

```bash
curl -X POST http://127.0.0.1:8001/tel \
  -H "Content-Type: application/json" \
  -d '{"query":"best family auto coverage","company":"ALL","k":5}'
```

## Related docs

- `README_GUIDED_CHAT_ENDPOINT.md`
- `README_TEL_ENDPOINT.md`
