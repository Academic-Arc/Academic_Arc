from datetime import datetime
from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    category: str = Field(..., description="Category of comment: positive, satisfactory, or motivating")
    comment_text: str = Field(..., description="Exact text of the chosen preset comment")


class CommentItem(BaseModel):
    id: int
    submission_id: int
    user_id: int
    user_name: str
    profile_picture: str | None = None
    category: str
    comment_text: str
    created_at: datetime

    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    submission_id: int
    count: int
    comments: list[CommentItem]
