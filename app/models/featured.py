from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer

from app.database import Base


class SpecialFeature(Base):
    __tablename__ = "special_features"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    submission_id = Column(
        Integer,
        ForeignKey(
            "submissions.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        unique=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )