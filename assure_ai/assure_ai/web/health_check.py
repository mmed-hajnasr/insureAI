"""Health check endpoint."""

from fastapi import APIRouter

from assure_ai.tracing.decorator import trace_span

router = APIRouter()

__all__ = ["router"]


@router.get("/health-check")
@trace_span("health_check")
def health_check() -> None:
    """
    Checks the health of a project.

    It returns 200 if the project is healthy.
    """
    return
