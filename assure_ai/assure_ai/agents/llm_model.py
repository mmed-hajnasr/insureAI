
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from assure_ai.settings import settings

small_model = GoogleModel(
    "gemini-2.5-flash",
    provider=GoogleProvider(api_key=settings.google_api_key),
)
