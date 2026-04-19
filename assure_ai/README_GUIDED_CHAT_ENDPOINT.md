# Guided Chat Endpoint (`POST /guided-chat`)

This document explains the guided insurance conversation endpoint.

## Endpoint summary

- **Path:** `/guided-chat`
- **Method:** `POST`
- **Purpose:** Run a step-by-step insurance chat that:
  1. uses the user's first message as what they want to insure,
  2. asks in-depth follow-up questions,
  3. explains coverage approaches and insurance types,
  4. returns insurance options in the same structured format as `/chat`.

## Request body

```json
{
  "session_id": "guided-1",
  "message": "I want to insure my family car",
  "language": "english"
}
```

Fields:

- `session_id` (**optional**, `string`, default `"default"`): chat session identifier.
- `message` (**required**, `string`): latest user message.
- `language` (**optional**, `"english" | "french" | "arabic"`, default `"english"`):
  response language. For `"arabic"`, assistant replies use Tunisian dialect.

Behavior notes:

- Retrieval queries sent to Qdrant are always converted to English.

## Response body

```json
{
  "session_id": "guided-1",
  "reply": "Based on your profile, here are suitable options...",
  "response_type": "pack_list",
  "packs": [
    {
      "agency_name": "RealAssurance",
      "title": "GuardianFamily Pack",
      "description": "Family-focused auto coverage with liability and assistance features."
    }
  ],
  "history": [
    { "role": "user", "content": "I want to insure my family car" },
    { "role": "assistant", "content": "What budget range are you targeting?" }
  ]
}
```

Notes:

- `response_type` can be:
  - `"text"` for follow-up questions and explanations,
  - `"pack_list"` when returning structured assurance options.
- `packs` is populated when `response_type` is `"pack_list"`.
- The endpoint does not force a first-turn question like "What would you like to insure?" when the user already provides that in the first message.

## `curl` example

```bash
curl -X POST http://127.0.0.1:8001/guided-chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "guided-1",
    "message": "I want to insure my family car",
    "language": "english"
  }'
```

## Error notes

- `503`: chat dependencies unavailable (missing Google API key/retriever).
- `502`: agent/retrieval pipeline failed.
- `422`: invalid payload.
