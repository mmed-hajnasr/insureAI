"""OpenTelemetry tracing configuration."""

from assure_ai.tracing.config import init_tracing
from assure_ai.tracing.decorator import set_span_attributes, trace_span
from assure_ai.tracing.logging import configure_structlog, get_logger

__all__ = [
    "configure_structlog",
    "get_logger",
    "init_tracing",
    "set_span_attributes",
    "trace_span",
]
