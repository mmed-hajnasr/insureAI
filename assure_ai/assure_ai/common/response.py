import re
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator
from pydantic_ai.exceptions import ModelRetry

from assure_ai.tracing import get_logger

logger = get_logger(__name__)


class ValidationError(BaseModel):
    """Response from step1 validator agent."""

    status: Literal["unclear_request", "not_feasible_request"]
    explanation: str


class SingleField(BaseModel):
    """Represents a single field in a database table."""

    name: str = Field(description="The snake_case name of the field.")
    description: str = Field(
        description="a brief description of the field's purpose and contents."
    )
    field_type: Literal["number", "boolean", "date", "datetime", "text"] = Field(
        description="The data type of the field."
    )

    @field_validator("name")
    @classmethod
    def validate_snake_case(cls, v: str) -> str:
        """Validate that the name is in lowercase snake_case format."""
        if not re.match(r"^[a-z][a-z0-9]*(_[a-z0-9]+)*$", v):
            logger.warn(
                "Agent failed to output valid snake_case name",
                agent_output=v,
            )
            raise ModelRetry(
                f"Name must be lowercase snake_case (got: '{v}'). "
                "Valid format: lowercase letters, numbers, and underscores, "
                "starting with a letter, no consecutive underscores. "
                "Examples: 'user', 'user_profile', 'order_items'"
            )
        return v


class CompleteType(BaseModel):
    """Represents a complete type definition with fields."""

    fields: list[SingleField] = Field(
        description="A list of fields that belong to this type."
    )
    name: str = Field(description="The name of the type.")
    description: str = Field(description="A brief description of the type.")


class Step2Setup(BaseModel):
    """feature suggetions."""

    question: str = Field(..., description="Question asking about desired features")
    options: list[str] = Field(
        ..., description="List of atomic feature options the user can select"
    )


class Step3Setup(BaseModel):
    """complete data model graph and entitys."""

    types: list[tuple[str, str]] = Field(
        ...,
        description="List of entitys in the format (entity_name, entity_description)",
    )
    graph: str = Field(..., description="Mermaid graph definition in graph LR format")
    description: str = Field(
        ..., description="Plain language explanation of the data model"
    )


class Step5Setup(BaseModel):
    """feature suggetions."""

    question: str = Field(
        ..., description="Question asking about desired relationships between types"
    )
    options: list[str] = Field(
        ..., description="List of relationship options the user can select"
    )


class Step3Response(BaseModel):
    """Successful step3 response."""

    type: Literal["multiple_choice_field"]
    payload: list[str | CompleteType]
    next: bool
    tokens_used: int


class Step4Request(BaseModel):
    """Request model for step4 endpoint."""

    project_id: str
    tokens_limit: int
    type: Literal["multiple_choice_field"]
    payload: CompleteType


class Step4MultipleChoiceFieldResponse(BaseModel):
    """Response for step4 with next type available."""

    type: Literal["multiple_choice_field"]
    payload: dict[str, str | CompleteType]
    next: bool
    tokens_used: int


class Step4MultipleChoiceResponse(BaseModel):
    """Response for step4 when no more types, returning step5 options."""

    type: Literal["multiple_choice"]
    payload: dict[str, str | list[str]]
    next: bool
    tokens_used: int


class ContextError(BaseModel):
    """context error response."""

    tokens_used: int
    error: Literal["unclear_request", "not_feasible_request"]
    message: str

    def __init__(self, **data: object) -> None:
        super().__init__(**data)
        logger.info(
            "context_error",
            error=self.error,
            message=self.message,
            tokens_limit=self.tokens_used,
        )


class TokenExceededError(BaseModel):
    """Response when token limit is exceeded."""

    tokens_limit: int
    error: str = "token_limit_exceeded"

    def __init__(self, **data: object) -> None:
        super().__init__(**data)
        logger.info(
            "token_limit_exceeded",
            tokens_limit=self.tokens_limit,
        )


ErrorResponse = ContextError | TokenExceededError


class LoggedHTTPException(HTTPException):
    """HTTPException that automatically logs errors when raised."""

    def __init__(self, exc: Exception) -> None:
        """Initialize and log the HTTP exception."""
        logger.error(
            "Returning HTTP error response",
            error=str(exc),
            error_type=type(exc).__name__,
        )
        if isinstance(exc, HTTPException):
            headers = dict(exc.headers) if exc.headers else None
            super().__init__(
                status_code=exc.status_code,
                detail=exc.detail,
                headers=headers,
            )
        else:
            super().__init__(status_code=500, detail=exc.__class__.__name__)
