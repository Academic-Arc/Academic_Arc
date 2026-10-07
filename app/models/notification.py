from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from datetime import datetime

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    report_id = Column(
        Integer,
        ForeignKey(
            "reports.id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    submission_id = Column(
        Integer,
        ForeignKey(
            "submissions.id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    notification_type = Column(
        String(50),
        nullable=False
    )

    title = Column(
        String(200),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    is_read = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )