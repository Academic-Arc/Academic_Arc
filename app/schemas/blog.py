from typing import Optional
from pydantic import BaseModel, Field, field_validator


class BlogBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    slug: Optional[str] = Field(None, max_length=350)
    excerpt: str = Field(..., min_length=10, max_length=2000)
    content: str = Field(..., min_length=10, max_length=50000)
    category: str = Field(..., min_length=1, max_length=100)
    cover_image_url: Optional[str] = Field(None, max_length=1000)
    is_cover_story: bool = False
    issue_label: Optional[str] = "জুন ২০২৬ • সংখ্যা ১৪"
    published_date: Optional[str] = None
    read_time: Optional[str] = "৫ মিনিট পাঠ"
    author_name: Optional[str] = "Academic Arc Editorial"
    is_published: bool = True

    @field_validator("cover_image_url")
    @classmethod
    def validate_cover_image_url(cls, v):
        if not v:
            return v
        v = v.strip()
        # Security: Prevent javascript: or unsafe data URIs
        if not (v.startswith("http://") or v.startswith("https://") or v.startswith("/")):
            raise ValueError("cover_image_url must start with http://, https://, or /")
        return v

    @field_validator("title", "category", "issue_label", "author_name")
    @classmethod
    def sanitize_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v


class BlogCreate(BlogBase):
    pass


class BlogUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=300)
    slug: Optional[str] = Field(None, max_length=350)
    excerpt: Optional[str] = Field(None, min_length=10, max_length=2000)
    content: Optional[str] = Field(None, min_length=10, max_length=50000)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    cover_image_url: Optional[str] = Field(None, max_length=1000)
    is_cover_story: Optional[bool] = None
    issue_label: Optional[str] = None
    published_date: Optional[str] = None
    read_time: Optional[str] = None
    author_name: Optional[str] = None
    is_published: Optional[bool] = None

    @field_validator("cover_image_url")
    @classmethod
    def validate_cover_image_url(cls, v):
        if not v:
            return v
        v = v.strip()
        if not (v.startswith("http://") or v.startswith("https://") or v.startswith("/")):
            raise ValueError("cover_image_url must start with http://, https://, or /")
        return v


class BlogResponse(BlogBase):
    id: int
    view_count: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

