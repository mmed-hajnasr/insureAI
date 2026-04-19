"""TEL retrieval endpoint for top-k chunks."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from qdrant_client.http.exceptions import ResponseHandlingException

from assure_ai.agents.qdrant_retriever import QdrantRetriever, RetrievedChunk
from assure_ai.tracing.decorator import trace_span

router = APIRouter(prefix="/tel", tags=["tel"])


class TelRequest(BaseModel):
    """Incoming TEL retrieval payload."""

    query: str = Field(min_length=1)
    company: str | None = None
    k: int = Field(default=5, ge=1, le=100)


class TelChunk(BaseModel):
    """Serialized retrieved chunk."""

    category: str
    assurance_agency: str
    source_file: str
    chunk_index: int
    text: str
    score: float


class TelResponse(BaseModel):
    """TEL retrieval response payload."""

    query: str
    company: str
    k: int
    total: int
    chunks: list[TelChunk]


def _resolve_search_scope(company: str | None) -> tuple[str, str | None, str]:
    """Map company filter to retriever category and agency filter."""
    if company is None:
        return "all", None, "ALL"

    normalized = company.strip()
    if not normalized:
        return "all", None, "ALL"

    flag = normalized.casefold()
    if flag == "general":
        return "general", None, "GENERAL"
    if flag == "all":
        return "all", None, "ALL"

    return "all", normalized, normalized


def _to_tel_chunk(chunk: RetrievedChunk) -> TelChunk:
    """Convert retriever result into response model."""
    return TelChunk(
        category=chunk.category,
        assurance_agency=chunk.assurance_agency,
        source_file=chunk.source_file,
        chunk_index=chunk.chunk_index,
        text=chunk.text,
        score=chunk.score,
    )


@router.post("", response_model=TelResponse)
@trace_span("TEL chunk retrieval")
async def tel_search(request: TelRequest, app_request: Request) -> TelResponse:
    """Return top-k chunks for a query with optional company filter."""
    retriever: QdrantRetriever | None = getattr(
        app_request.app.state,
        "qdrant_retriever",
        None,
    )
    if retriever is None:
        raise HTTPException(status_code=503, detail="Qdrant retriever is unavailable")

    category, assurance_company, selected_company = _resolve_search_scope(
        request.company
    )

    try:
        chunks = retriever.search(
            query=request.query,
            category=category,
            assurance_company=assurance_company,
            limit=request.k,
        )
    except ResponseHandlingException as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Qdrant is unreachable. Verify AGENTS_QDRANT_URL or use local "
                "Qdrant storage."
            ),
        ) from exc
    except (ConnectionError, OSError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Qdrant connection failed. Ensure the Qdrant service is running.",
        ) from exc

    return TelResponse(
        query=request.query,
        company=selected_company,
        k=request.k,
        total=len(chunks),
        chunks=[_to_tel_chunk(chunk) for chunk in chunks],
    )
