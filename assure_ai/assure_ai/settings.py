import enum
from pathlib import Path
from tempfile import gettempdir

from pydantic_settings import BaseSettings, SettingsConfigDict

TEMP_DIR = Path(gettempdir())


class LogLevel(enum.StrEnum):
    """Possible log levels."""

    NOTSET = "notset"
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    FATAL = "fatal"


class Settings(BaseSettings):
    """
    Application settings.

    These parameters can be configured
    with environment variables.
    """

    host: str = "0.0.0.0"
    port: int = 8001
    # quantity of workers for uvicorn
    workers_count: int = 1
    # Enable uvicorn reloading
    reload: bool = False

    # Current environment
    environment: str = "dev"

    log_level: LogLevel = LogLevel.INFO

    # Grpc endpoint for opentelemetry.
    # E.G. http://localhost:4317
    opentelemetry_endpoint: str = "http://localhost:4317"
    rust_endpoint: str = "http://localhost:8000"

    langfuse_secret_key: str = ""
    langfuse_public_key: str = ""
    langfuse_base_url: str = "https://cloud.langfuse.com"

    # Database Configuration
    database_host: str = "localhost"
    database_name: str = "assure_ai"
    database_port: int = 5432
    database_username: str = "postgres"
    database_password: str = "postgres"
    database_require_ssl: bool = False

    # External API Keys
    mistral_api_key: str = ""
    openrouter_api_key: str = ""
    google_api_key: str = ""
    groq_api_key: str = ""

    # Qdrant Vector Database Configuration
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_local_path: Path = Path(".qdrant_data")
    qdrant_collection_prefix: str = "assurance"
    qdrant_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    qdrant_default_limit: int = 6

    # Pydantic Settings Config

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="AGENTS_",
        env_file_encoding="utf-8",
    )


# NOTE: ignore is ok because the values are provided via environment variables
settings = Settings()  # type: ignore[call-arg]
