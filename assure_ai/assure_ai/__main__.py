import uvicorn

from assure_ai.settings import settings


def main() -> None:
    """Entrypoint of the application."""
    uvicorn.run(
        "assure_ai.web.application:get_app",
        workers=settings.workers_count,
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.value,
        factory=True,
    )


if __name__ == "__main__":
    main()
