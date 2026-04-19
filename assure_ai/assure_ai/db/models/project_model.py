from pydantic import BaseModel


class ProjectModel(BaseModel):
    """Project model for database."""

    title: str
    description: str | None
    objectives: list[str]
    remarks: str | None
