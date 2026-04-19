# insurai (Frontend)

`insurai` is a React + TypeScript + Vite frontend for the insurance assistant platform.

## Features

- Landing, auth, and platform pages
- Chat UI for regular and guided assistant modes
- Firebase Authentication (email/password + Google)
- Backend integration with `/chat` and `/guided-chat`

## Prerequisites

- Node.js `>=20` (recommended: `22`)
- npm
- Running backend (`assure_ai`) on `http://127.0.0.1:8001` or via Docker Compose

## Environment variables

Create local env from example:

```bash
cp .env.example .env
```

Required Firebase variables:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Backend API base URL:

- `VITE_ASSURE_API_URL=/api` (recommended in dev with Vite proxy)
- or direct backend URL if CORS is configured, for example `http://127.0.0.1:8001`

## Run locally

```bash
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173` (default Vite).

## Build and preview

```bash
npm run build
npm run preview
```

## Docker

Build frontend image:

```bash
docker build -t insurai-frontend .
```

Run frontend container:

```bash
docker run --rm -p 5173:80 insurai-frontend
```

Container serves static files with Nginx and proxies `/api/*` to the backend service name `assure_ai_backend` in Docker Compose.

## Full stack

For backend + frontend + qdrant together, use the root-level `../docker-compose.yaml`.
