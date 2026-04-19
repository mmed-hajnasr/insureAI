"""Tracing decorator for easy span creation."""

import functools
import inspect
from collections.abc import Callable
from typing import Any, ParamSpec, TypeVar

from opentelemetry import trace
from opentelemetry.trace import Span

P = ParamSpec("P")
R = TypeVar("R")

tracer = trace.get_tracer(__name__)


def trace_span(
    span_name: str | None = None,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Decorator to create an OpenTelemetry span for a function.

    This decorator automatically creates a span with minimal boilerplate.
    It supports both synchronous and asynchronous functions.

    :param span_name: Optional custom name for the span. If not provided,
                     uses the function name.
    :return: Decorated function with tracing enabled.

    Example:
        @trace_span()
        def my_function():
            # Your code here
            pass

        @trace_span("custom_operation")
        async def my_async_function():
            # Your async code here
            pass
    """

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        name = span_name or getattr(func, "__name__", "unknown")

        if inspect.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
                with tracer.start_as_current_span(name):
                    return await func(*args, **kwargs)  # type: ignore[return-value]

            return async_wrapper  # type: ignore[return-value]

        @functools.wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            with tracer.start_as_current_span(name):
                return func(*args, **kwargs)

        return sync_wrapper  # type: ignore[return-value]

    return decorator


def set_span_attributes(**attributes: Any) -> Span | None:
    """
    Set attributes on the current span.

    This is a convenience function to reduce boilerplate when setting
    attributes on the current OpenTelemetry span.

    :param attributes: Key-value pairs to set as span attributes.
    :return: The current span, or None if no span is active.

    Example:
        set_span_attributes(project_id="123", user_id="456")
    """
    span = trace.get_current_span()
    if span and span.is_recording():
        for key, value in attributes.items():
            span.set_attribute(key, value)
    return span
