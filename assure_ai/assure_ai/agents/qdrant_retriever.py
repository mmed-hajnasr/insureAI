from __future__ import annotations

import re
from dataclasses import dataclass

from fastembed import TextEmbedding
from qdrant_client import QdrantClient


@dataclass
class RetrievedChunk:
    """A single chunk returned from Qdrant search."""

    category: str
    assurance_agency: str
    source_file: str
    chunk_index: int
    text: str
    score: float


def normalize_collection_name(name: str) -> str:
    """Normalize text to Qdrant-safe collection naming rules."""
    lowered = name.lower().strip()
    return re.sub(r"[^a-z0-9_]+", "_", lowered).strip("_")


class QdrantRetriever:
    """Search assurance markdown chunks from category-based Qdrant collections."""

    def __init__(
        self,
        collection_prefix: str,
        embedding_model: str,
        local_qdrant_path: str,
        qdrant_url: str | None,
        qdrant_api_key: str | None,
    ) -> None:
        self.collection_prefix = normalize_collection_name(collection_prefix)
        self.embedding_model = embedding_model
        self.local_qdrant_path = local_qdrant_path
        self.qdrant_url = qdrant_url
        self.qdrant_api_key = qdrant_api_key

        self._client: QdrantClient | None = None
        self._embedder: TextEmbedding | None = None

    @property
    def client(self) -> QdrantClient:
        """Get lazily initialized Qdrant client."""
        if self._client is None:
            if self.qdrant_url:
                self._client = QdrantClient(
                    url=self.qdrant_url,
                    api_key=self.qdrant_api_key,
                )
            else:
                self._client = QdrantClient(path=self.local_qdrant_path)
        return self._client

    @property
    def embedder(self) -> TextEmbedding:
        """Get lazily initialized embedding model."""
        if self._embedder is None:
            self._embedder = TextEmbedding(model_name=self.embedding_model)
        return self._embedder

    def list_categories(self) -> list[str]:
        """Return available category names based on existing collections."""
        collection_names = [
            item.name for item in self.client.get_collections().collections
        ]
        prefix = f"{self.collection_prefix}_"

        categories: list[str] = []
        for name in collection_names:
            if name.startswith(prefix):
                categories.append(name[len(prefix) :])

        return sorted(set(categories))

    def search(
        self,
        query: str,
        category: str,
        assurance_company: str | None,
        limit: int,
    ) -> list[RetrievedChunk]:
        """Search one category or all categories and optionally filter by agency."""
        query_vector = next(self.embedder.embed([query]))
        collection_names = self._resolve_collections(category)

        if not collection_names:
            return []

        normalized_agency = self._normalize_optional_filter(assurance_company)
        scan_limit = max(limit, limit * 5) if normalized_agency else limit

        found_chunks: list[RetrievedChunk] = []
        prefix = f"{self.collection_prefix}_"

        for collection_name in collection_names:
            points = self._search_points(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=scan_limit,
            )

            for point in points:
                payload = point.payload or {}
                agency = str(payload.get("assurance_agency", ""))

                if normalized_agency and agency.casefold() != normalized_agency:
                    continue

                payload_category = str(payload.get("category", ""))
                fallback_category = (
                    collection_name[len(prefix) :]
                    if collection_name.startswith(prefix)
                    else ""
                )

                found_chunks.append(
                    RetrievedChunk(
                        category=payload_category or fallback_category,
                        assurance_agency=agency,
                        source_file=str(payload.get("source_file", "")),
                        chunk_index=int(payload.get("chunk_index", -1)),
                        text=str(payload.get("text", "")),
                        score=float(point.score),
                    )
                )

        found_chunks.sort(key=lambda chunk: chunk.score, reverse=True)
        return found_chunks[:limit]

    def _search_points(
        self,
        collection_name: str,
        query_vector: list[float],
        limit: int,
    ) -> list[object]:
        """Run a vector search compatible with both new and legacy qdrant-client APIs."""
        if hasattr(self.client, "query_points"):
            query_result = self.client.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=limit,
                with_payload=True,
            )
            return list(getattr(query_result, "points", []))

        return self.client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit,
            with_payload=True,
        )

    def _resolve_collections(self, category: str) -> list[str]:
        """Resolve target collection names for one category or all categories."""
        normalized_category = normalize_collection_name(category)
        all_categories = {"all", "any", "global", "*"}
        prefix = f"{self.collection_prefix}_"
        collection_names = [
            item.name for item in self.client.get_collections().collections
        ]
        existing_names = set(collection_names)

        if normalized_category in all_categories:
            return sorted(name for name in collection_names if name.startswith(prefix))

        if normalized_category in existing_names:
            return [normalized_category]

        if normalized_category.startswith(prefix):
            return (
                [normalized_category] if normalized_category in existing_names else []
            )

        collection_name = normalize_collection_name(
            f"{self.collection_prefix}_{category}"
        )

        if collection_name in existing_names:
            return [collection_name]

        return []

    @staticmethod
    def _normalize_optional_filter(value: str | None) -> str | None:
        """Normalize optional filter value and treat 'all' variants as no filter."""
        if value is None:
            return None

        normalized = value.strip().casefold()
        if not normalized or normalized in {"all", "any", "*"}:
            return None

        return normalized
