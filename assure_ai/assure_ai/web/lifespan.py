from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from assure_ai.agents.qdrant_retriever import QdrantRetriever
from assure_ai.settings import settings


@asynccontextmanager
async def lifespan_setup(app: FastAPI) -> AsyncGenerator[None]:
    """
    Actions to run on application startup.

    This function uses fastAPI app to store data
    in the state, such as db_engine.

    :param app: the fastAPI application.
    :return: function that actually performs actions.
    """

    app.state.chat_history = {}
    app.state.guided_chat_history = {}
    app.state.qdrant_retriever = QdrantRetriever(
        collection_prefix=settings.qdrant_collection_prefix,
        embedding_model=settings.qdrant_embedding_model,
        local_qdrant_path=str(settings.qdrant_local_path),
        qdrant_url=settings.qdrant_url,
        qdrant_api_key=settings.qdrant_api_key,
    )

    yield
