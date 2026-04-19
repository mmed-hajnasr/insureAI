#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.http import models


@dataclass
class ChunkRecord:
    source_file: str
    chunk_index: int
    text: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build TEL assistant Qdrant vector database from fake_data/General only."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("fake_data/General"),
        help="Path to General fake data directory.",
    )
    parser.add_argument(
        "--collection-name",
        type=str,
        default="tel_assistant_general",
        help="Qdrant collection name.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=900,
        help="Target chunk size (characters).",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=120,
        help="Chunk overlap (characters).",
    )
    parser.add_argument(
        "--embedding-model",
        type=str,
        default="BAAI/bge-small-en-v1.5",
        help="FastEmbed model name.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=64,
        help="Batch size for embedding/upsert.",
    )
    parser.add_argument(
        "--qdrant-url",
        type=str,
        default="http://localhost:6335",
        help="Qdrant URL for TEL assistant DB.",
    )
    parser.add_argument(
        "--qdrant-api-key",
        type=str,
        default=None,
        help="Qdrant API key (optional).",
    )
    parser.add_argument(
        "--local-qdrant-path",
        type=Path,
        default=Path(".qdrant_data_tel"),
        help="Local Qdrant storage path when --qdrant-url is not set.",
    )
    return parser.parse_args()


def normalize_collection_name(name: str) -> str:
    lowered = name.lower().strip()
    return re.sub(r"[^a-z0-9_]+", "_", lowered).strip("_")


def split_markdown_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    del chunk_size
    del chunk_overlap

    cleaned = text.replace("\r\n", "\n").strip()
    if not cleaned:
        return []

    return [
        part.strip() for part in re.split(r"(?m)^\s*---\s*$", cleaned) if part.strip()
    ]


def sliding_char_chunks(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text]

    step = max(1, chunk_size - chunk_overlap)
    parts: list[str] = []
    start = 0

    while start < len(text):
        end = min(len(text), start + chunk_size)
        piece = text[start:end].strip()
        if piece:
            parts.append(piece)
        if end == len(text):
            break
        start += step

    return parts


def iter_general_records(
    data_dir: Path, chunk_size: int, chunk_overlap: int
) -> Iterable[ChunkRecord]:
    for md_file in sorted(data_dir.rglob("*.md")):
        content = md_file.read_text(encoding="utf-8")
        chunks = split_markdown_text(
            content, chunk_size=chunk_size, chunk_overlap=chunk_overlap
        )

        for chunk_index, chunk_text in enumerate(chunks):
            yield ChunkRecord(
                source_file=str(md_file.relative_to(data_dir)),
                chunk_index=chunk_index,
                text=chunk_text,
            )


def batched(items: list[ChunkRecord], size: int) -> Iterable[list[ChunkRecord]]:
    for start in range(0, len(items), size):
        yield items[start : start + size]


def get_qdrant_client(args: argparse.Namespace) -> QdrantClient:
    if args.qdrant_url:
        return QdrantClient(url=args.qdrant_url, api_key=args.qdrant_api_key)

    return QdrantClient(path=str(args.local_qdrant_path))


def main() -> None:
    args = parse_args()

    if not args.data_dir.exists() or not args.data_dir.is_dir():
        raise FileNotFoundError(f"General data directory not found: {args.data_dir}")

    records = list(
        iter_general_records(
            data_dir=args.data_dir,
            chunk_size=args.chunk_size,
            chunk_overlap=args.chunk_overlap,
        )
    )

    if not records:
        print("No markdown chunks found in General data. Nothing to ingest.")
        return

    embedder = TextEmbedding(model_name=args.embedding_model)
    qdrant = get_qdrant_client(args)

    collection_name = normalize_collection_name(args.collection_name)

    sample_vector = next(embedder.embed([records[0].text]))
    vector_size = len(sample_vector)

    if qdrant.collection_exists(collection_name=collection_name):
        qdrant.delete_collection(collection_name=collection_name)

    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(
            size=vector_size, distance=models.Distance.COSINE
        ),
    )

    total_points = 0
    for batch in batched(records, args.batch_size):
        texts = [item.text for item in batch]
        vectors = list(embedder.embed(texts))
        points = []

        for item, vector in zip(batch, vectors):
            points.append(
                models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "dataset": "General",
                        "source_file": item.source_file,
                        "chunk_index": item.chunk_index,
                        "text": item.text,
                    },
                )
            )

        qdrant.upsert(collection_name=collection_name, points=points)
        total_points += len(points)

    print(
        f"Collection '{collection_name}' ready: {total_points} chunks from General data."
    )


if __name__ == "__main__":
    main()
