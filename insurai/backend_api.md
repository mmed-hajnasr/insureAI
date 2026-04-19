# assure_ai

This project exposes a simple FastAPI chatbot endpoint that:

- keeps chat history in server memory per `session_id`
- advises users on assurance coverage choices
- answers finance-related questions with practical guidance
- uses Qdrant vector collections for grounded assurance recommendations

## Run locally

```bash
uv sync --locked
uv run -m assure_ai
```

Optional environment variables for Qdrant retrieval:

```bash
export AGENTS_MISTRAL_API_KEY="<your-mistral-key>"
export AGENTS_QDRANT_LOCAL_PATH=".qdrant_data"
export AGENTS_QDRANT_COLLECTION_PREFIX="assurance"
export AGENTS_QDRANT_EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
```

If `AGENTS_QDRANT_URL` is provided, remote Qdrant is used instead of local embedded storage.

## API

- `GET /health-check`
- `POST /chat`

### `POST /chat` integration guide (frontend)

Endpoint behavior in short:

- You send one user message at a time.
- Backend keeps conversation history in memory by `session_id`.
- Response always includes:
	- `reply` (assistant text for chat bubble)
	- `response_type` (`"text"` or `"pack_list"`)
	- `packs` (structured packs when listing is requested)
	- `history` (full in-memory session history)

Request body:

```json
{
	"session_id": "demo-1",
	"message": "List Health packs from RealAssurance",
	"language": "english"
}
```

Response shape:

```json
{
	"session_id": "demo-1",
	"reply": "Here are the most relevant Health packs from RealAssurance.",
	"response_type": "pack_list",
	"packs": [
		{
			"agency_name": "RealAssurance",
			"title": "AegisLife Pack",
			"description": "Comprehensive health coverage with preventive care and hospitalization support."
		}
	],
	"history": [
		{ "role": "user", "content": "List Health packs from RealAssurance" },
		{
			"role": "assistant",
			"content": "Here are the most relevant Health packs from RealAssurance."
		}
	]
}
```

`response_type` handling in UI:

- `"text"`: render normal assistant text bubble using `reply`.
- `"pack_list"`: render `reply` plus a list/cards from `packs[]` with:
	- `agency_name`
	- `title`
	- `description`

Recommended frontend flow:

1. Create and keep a stable `session_id` per user conversation.
2. On send, `POST /chat` with `{ session_id, message, language }` where `language` is one of `english`, `french`, `arabic`.
3. Render `reply` immediately as assistant message.
4. If `response_type === "pack_list"`, render `packs` as structured cards/table.
5. Reuse same `session_id` for next user message to keep context.

Minimal browser `fetch` example:

```js
async function sendChatMessage({ baseUrl, sessionId, message, language }) {
	const response = await fetch(`${baseUrl}/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ session_id: sessionId, message, language }),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.detail ?? `Chat failed with status ${response.status}`);
	}

	const data = await response.json();

	return {
		reply: data.reply,
		responseType: data.response_type,
		packs: data.packs ?? [],
		history: data.history ?? [],
	};
}
```

Common error responses:

- `503`: chatbot dependencies unavailable (missing Mistral key / retriever not ready).
- `502`: retrieval/agent pipeline failed while generating a response.
- `500`: in-memory chat store unavailable.

Example request:

```bash
curl -X POST http://127.0.0.1:8001/chat \
	-H "Content-Type: application/json" \
	-d '{"session_id":"demo-1","message":"I have a car loan and a family, what assurance should I prioritize?","language":"english"}'
```

`POST /chat` response now supports two modes:

- `response_type: "text"` for standard conversational replies.
- `response_type: "pack_list"` when the user asks to list/compare packs, with a
	structured `packs` array where each item contains:
	- `agency_name`
	- `title`
	- `description`

Examples that use the new retrieval tools via the agent:

```bash
curl -X POST http://127.0.0.1:8001/chat \
	-H "Content-Type: application/json" \
	-d '{"session_id":"demo-2","message":"In category Auto, what should I choose?","language":"english"}'

curl -X POST http://127.0.0.1:8001/chat \
	-H "Content-Type: application/json" \
	-d '{"session_id":"demo-2","message":"For category Health, only use FakeAssurance agency.","language":"english"}'

curl -X POST http://127.0.0.1:8001/chat \
	-H "Content-Type: application/json" \
	-d '{"session_id":"demo-2","message":"Search all categories and all agencies, then give me the best recommendation.","language":"english"}'
```
