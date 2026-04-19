"""Langfuse configuration and initialization for agent tracing."""

import os

from langfuse import get_client
from pydantic_ai import Agent

from assure_ai.settings import settings


def init_langfuse() -> None:
    """Initialize Langfuse client and instrument Pydantic AI agents.

    This function:
    1. Sets up environment variables for Langfuse authentication
    2. Initializes the Langfuse client
    3. Enables Pydantic AI instrumentation for all agents

    The Langfuse credentials are loaded from the application settings.
    """
    # Set environment variables for Langfuse
    os.environ["LANGFUSE_PUBLIC_KEY"] = settings.langfuse_public_key
    os.environ["LANGFUSE_SECRET_KEY"] = settings.langfuse_secret_key
    os.environ["LANGFUSE_BASE_URL"] = settings.langfuse_base_url

    # Initialize Langfuse client
    langfuse = get_client()

    # Verify authentication
    if not langfuse.auth_check():
        return

    # Enable Pydantic AI instrumentation for all agents
    Agent.instrument_all()
