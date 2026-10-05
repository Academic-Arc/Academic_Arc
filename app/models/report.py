from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint
)
from datetime import datetime

from app.database import Base


class Report(Base):
    __tablename__ = "reports"

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
        index=True
    )

    reporter_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    reason = Column(
        String(100),
        nullable=False
    )

    details = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(20),
        nullable=False,
        default="pending"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "submission_id",
            "reporter_id",
            name="uq_report_submission_reporter"
        ),
    )