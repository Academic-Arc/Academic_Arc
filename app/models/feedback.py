from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime

from app.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)

    message = Column(Text, nullable=False)

    is_anonymous = Column(Boolean, default=True, nullable=False)

    status = Column(String, default="new", nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )