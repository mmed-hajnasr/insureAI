# TEL Endpoint (`POST /tel`)

This document explains how to query top matching chunks from Qdrant using the TEL endpoint.

## Endpoint summary

- **Path:** `/tel`
- **Method:** `POST`
- **Purpose:** Return the best `k` chunks for a user query from the vector store.

## Request body

```json
{
  "query": "best insurance for a family with one car",
  "company": "ALL",
  "k": 5
}
```

Fields:

- `query` (**required**, `string`): natural-language search query.
- `company` (**optional**, `string`):
  - company name (for example: `"RealAssurance"`) to filter by one company,
  - `"ALL"` to search all categories and companies,
  - `"GENERAL"` to search only the `general` category.
- `k` (**optional**, `int`, default `5`, min `1`, max `100`): number of chunks to return.

## Response body

```json
{
  "query": "best insurance for a family with one car",
  "company": "ALL",
  "k": 5,
  "total": 5,
  "chunks": [
    {
      "category": "auto",
      "assurance_agency": "RealAssurance",
      "source_file": "Auto/RealAssurence/GuardianFamily_Pack.md",
      "chunk_index": 0,
      "text": "...",
      "score": 0.8123
    }
  ]
}
```

## `curl` examples

### 1) Search all companies (`ALL`)

```bash
curl -X POST http://127.0.0.1:8001/tel \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I need strong family health coverage",
    "company": "ALL",
    "k": 5
  }'
```

### 2) Search only general knowledge (`GENERAL`)

```bash
curl -X POST http://127.0.0.1:8001/tel \
  -H "Content-Type: application/json" \
  -d '{
    "query": "what should I consider before choosing a policy",
    "company": "GENERAL",
    "k": 4
  }'
```

### 3) Search by a specific company

```bash
curl -X POST http://127.0.0.1:8001/tel \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best auto plan for new drivers",
    "company": "RealAssurance",
    "k": 6
  }'
```

### 4) Omit `company` (defaults to all)

```bash
curl -X POST http://127.0.0.1:8001/tel \
  -H "Content-Type: application/json" \
  -d '{
    "query": "compare life and health plan priorities",
    "k": 3
  }'
```

## Error notes

- `503`: Qdrant unavailable or unreachable (retriever not initialized, Qdrant down, or bad `AGENTS_QDRANT_URL`).
- `422`: invalid payload (for example missing `query`, or `k` out of range).
