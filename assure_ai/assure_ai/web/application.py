from fastapi import FastAPI
from fastapi.responses import UJSONResponse
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from assure_ai.web import chatbot, guided_chatbot, health_check, tel
from assure_ai.web.lifespan import lifespan_setup


def get_app() -> FastAPI:
    """
    Get FastAPI application.

    This is the main constructor of an application.

    :return: application.
    """
    app = FastAPI(
        title="assure_ai",
        lifespan=lifespan_setup,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        default_response_class=UJSONResponse,
    )

    # Main router for the API.
    app.include_router(router=health_check.router)
    app.include_router(router=chatbot.router)
    app.include_router(router=guided_chatbot.router)
    app.include_router(router=tel.router)

    # Instrument FastAPI for OpenTelemetry distributed tracing
    # This enables automatic extraction of trace context from incoming HTTP headers
    # and creates spans for all HTTP requests
    FastAPIInstrumentor.instrument_app(app)

    return app
