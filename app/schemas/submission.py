from pydantic import BaseModel, Field


class SubmissionCreate(BaseModel):
    content_type: str
    student_class: str
    heading: str = Field(max_length=200)
    description: str
    written_content: str | None = None
    media_url: str | None = None
    media_type: str | None = None

class SubmissionUpdate(BaseModel):
    content_type: str
    student_class: str
    heading: str = Field(max_length=200)
    description: str
    written_content: str | None = None
    media_url: str | None = None
    media_type: str | None = None