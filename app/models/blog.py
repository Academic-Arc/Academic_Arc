from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.database import Base


class Blog(Base):
    __tablename__ = "blogs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(300),
        nullable=False
    )

    slug = Column(
        String(350),
        unique=True,
        index=True,
        nullable=False
    )

    excerpt = Column(
        Text,
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False
    )

    cover_image_url = Column(
        String(1000),
        nullable=True
    )

    is_cover_story = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )

    issue_label = Column(
        String(100),
        default="জুন ২০২৬ • সংখ্যা ১৪",
        nullable=False
    )

    published_date = Column(
        String(100),
        nullable=True
    )

    read_time = Column(
        String(50),
        default="৫ মিনিট পাঠ",
        nullable=True
    )

    author_name = Column(
        String(150),
        default="Academic Arc Editorial",
        nullable=True
    )

    is_published = Column(
        Boolean,
        default=True,
        nullable=False,
        index=True
    )

    view_count = Column(
        Integer,
        default=0,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

