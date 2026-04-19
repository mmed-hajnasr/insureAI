# insureAI Monorepo

This workspace contains three projects:

- `assure_ai/`: FastAPI backend for insurance chat and retrieval
- `insurai/`: React frontend for authentication and chat experience
- `phone _agent/`: Voice phone agent (Asterisk + Python) with scripted setup

## Architecture

- Frontend (`insurai`) calls backend endpoints (`/chat`, `/guided-chat`, `/tel`).
- Backend (`assure_ai`) uses a Google Gemini model and Qdrant retrieval.
- Phone agent (`phone _agent`) provides voice-call interaction flow.
- Docker Compose runs frontend + backend + qdrant in one stack.

## Repository layout

```text
.
├── assure_ai/   # Python backend
├── insurai/     # React frontend
├── phone _agent/ # Voice phone agent
└── docker-compose.yaml
```

## Prerequisites

- Docker + Docker Compose
- For local non-docker setup:
  - Python `>=3.12` and `uv`
  - Node.js `>=20` and npm
- A valid Google API key for backend model calls (`AGENTS_GOOGLE_API_KEY`)

## Option 1: Run full stack with Docker Compose (recommended)

From repo root (`/home/mmed/hackathon`):

```bash
export AGENTS_GOOGLE_API_KEY="<your-google-api-key>"
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8001`
- Backend docs: `http://localhost:8001/docs`
- Qdrant: `http://localhost:6333`

Stop:

```bash
docker compose down
```

To remove persisted qdrant data volume too:

```bash
docker compose down -v
```

## Option 2: Run backend and frontend locally (without Docker)

### 1) Start backend

```bash
cd assure_ai
cp .env.example .env
uv sync --locked
uv run -m assure_ai
```

Make sure `.env` includes at least:

```dotenv
AGENTS_GOOGLE_API_KEY=<your-google-api-key>
```

Configure Qdrant using either:

- `AGENTS_QDRANT_URL=http://127.0.0.1:6333` (remote service)
- or embedded local storage with `AGENTS_QDRANT_LOCAL_PATH=.qdrant_data`

### 2) Start frontend

```bash
cd insurai
cp .env.example .env
npm install
npm run dev
```

Set Firebase variables in `insurai/.env` and keep:

```dotenv
VITE_ASSURE_API_URL=/api
```

Vite proxy forwards `/api` to backend at `http://127.0.0.1:8001`.

## Option 3: Run phone agent

From repo root:

```bash
cd "phone _agent"
bash setup.sh
```

The setup script installs and configures what the phone agent needs.

## Per-project Dockerfiles

- Backend Dockerfile: `assure_ai/Dockerfile`
- Frontend Dockerfile: `insurai/Dockerfile`

## API endpoints

- `GET /health-check`
- `POST /chat`
- `POST /guided-chat`
- `POST /tel`

## Project-specific docs

- Backend setup/details: `assure_ai/README.md`
- Frontend setup/details: `insurai/README.md`
- Phone agent setup/details: `phone _agent/README.md`
- Guided endpoint details: `assure_ai/README_GUIDED_CHAT_ENDPOINT.md`
- TEL endpoint details: `assure_ai/README_TEL_ENDPOINT.md`