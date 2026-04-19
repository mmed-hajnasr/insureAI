"""OpenTelemetry tracing configuration for Jaeger."""

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.propagate import set_global_textmap
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

from assure_ai.settings import settings


def init_tracing() -> None:
    """
    Initialize OpenTelemetry tracing with OTLP exporter to Jaeger.

    This sets up the global tracer provider with an OTLP exporter
    configured to send traces to the gRPC endpoint specified in settings.
    Also configures W3C Trace Context propagation for distributed tracing.
    """
    # CRITICAL: Set up W3C TraceContext propagator for distributed tracing
    # This must be set BEFORE creating spans to ensure trace context is properly
    # extracted from incoming requests (from the Rust backend service)
    set_global_textmap(TraceContextTextMapPropagator())

    # Create resource with service name
    resource = Resource(attributes={SERVICE_NAME: "assure_ai"})

    # Create OTLP exporter pointing to the configured endpoint
    otlp_exporter = OTLPSpanExporter(
        endpoint=settings.opentelemetry_endpoint,
        insecure=True,  # Use insecure connection (no TLS)
    )

    # Create tracer provider with the resource
    provider = TracerProvider(resource=resource)

    # Add span processor with OTLP exporter
    processor = BatchSpanProcessor(otlp_exporter)
    provider.add_span_processor(processor)

    # Set the global tracer provider
    trace.set_tracer_provider(provider)
