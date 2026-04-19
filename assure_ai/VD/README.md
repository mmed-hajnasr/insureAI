# Qdrant Vector DB Builder for `fake_data`

This project builds **one Qdrant collection per category** under `fake_data/` and ingests all markdown files from each agency folder.

Each stored chunk includes payload metadata:
- `category`
- `assurance_agency`
- `source_file`
- `chunk_index`
- `text`

## 1) Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Build vector databases (local embedded Qdrant)

```bash
python scripts/build_qdrant_vector_dbs.py --data-dir fake_data
```

This creates local Qdrant storage in `.qdrant_data/` and recreates collections:
- `assurance_auto`
- `assurance_health`
- `assurance_life`

## 3) Optional: Use remote Qdrant

```bash
python scripts/build_qdrant_vector_dbs.py \
  --data-dir fake_data \
  --qdrant-url "http://localhost:6333"
```

If your remote instance requires auth:

```bash
python scripts/build_qdrant_vector_dbs.py \
  --data-dir fake_data \
  --qdrant-url "https://YOUR-CLUSTER.cloud.qdrant.io" \
  --qdrant-api-key "YOUR_API_KEY"
```

## Notes

- Collections are recreated on every run to keep data clean/idempotent.
- Folder structure is discovered dynamically:
  - `fake_data/<category>/<agency>/**/*.md`