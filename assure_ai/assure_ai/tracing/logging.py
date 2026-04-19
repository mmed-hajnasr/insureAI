"""Structured logging configuration with OpenTelemetry integration."""

import logging
from collections.abc import MutableMapping
from typing import Any

import structlog
from opentelemetry import trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource

from assure_ai.settings import settings


def configure_structlog() -> None:
    """
    Configure structlog with OpenTelemetry context integration.

    This sets up structlog to automatically include trace and span IDs
    in all log messages, allowing correlation between logs and traces.
    It also configures OpenTelemetry logging to export logs to the backend.
    """
    # Set up OpenTelemetry logging
    resource = Resource(attributes={SERVICE_NAME: "assure_ai"})
    logger_provider = LoggerProvider(resource=resource)
    set_logger_provider(logger_provider)

    # Add OTLP log exporter
    otlp_log_exporter = OTLPLogExporter(
        endpoint=settings.opentelemetry_endpoint,
        insecure=True,
    )
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(otlp_log_exporter))

    # Create OpenTelemetry logging handler
    otel_handler = LoggingHandler(level=logging.NOTSET, logger_provider=logger_provider)

    structlog.configure(
        processors=[
            # Add log level to event dict
            structlog.stdlib.add_log_level,
            # Add timestamp
            structlog.processors.TimeStamper(fmt="iso"),
            # Add trace context (trace_id, span_id) from OpenTelemetry
            _add_trace_context,
            # Add span events for logs
            _add_span_event,
            # Render to stdlib logging (bridges to OpenTelemetry handler)
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Set logging level and add OpenTelemetry handler
    logging.basicConfig(
        format="%(message)s",
        level=logging.INFO,
        handlers=[otel_handler],
    )

    # Configure structlog formatter for stdlib logging
    formatter = structlog.stdlib.ProcessorFormatter(
        processor=structlog.dev.ConsoleRenderer(),
    )

    for handler in logging.root.handlers:
        handler.setFormatter(formatter)


def _add_trace_context(
    logger: logging.Logger, method_name: str, event_dict: MutableMapping[str, Any]
) -> MutableMapping[str, Any]:
    """
    Add OpenTelemetry trace context to log events.

    :param logger: The logger instance.
    :param method_name: The name of the method being called.
    :param event_dict: The event dictionary to modify.
    :return: Modified event dictionary with trace context.
    """
    span = trace.get_current_span()
    if span and span.get_span_context().is_valid:
        ctx = span.get_span_context()
        event_dict["trace_id"] = format(ctx.trace_id, "032x")
        event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict


def _add_span_event(
    logger: logging.Logger, method_name: str, event_dict: MutableMapping[str, Any]
) -> MutableMapping[str, Any]:
    """
    Add log as a span event to the current OpenTelemetry span.

    :param logger: The logger instance.
    :param method_name: The name of the method being called.
    :param event_dict: The event dictionary to process.
    :return: The unmodified event dictionary.
    """
    span = trace.get_current_span()
    if span and span.get_span_context().is_valid:
        # Create event name from the log message
        event_name = event_dict.get("event", "log")

        # Copy event_dict to avoid modifying the original
        attributes = {k: str(v) for k, v in event_dict.items() if k != "event"}

        # Add the log event to the span
        span.add_event(event_name, attributes=attributes)

    return event_dict


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """
    Get a structured logger instance.

    :param name: Optional logger name. Defaults to the caller's module.
    :return: Configured structlog logger.
    """
    return structlog.get_logger(name)
