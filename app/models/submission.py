from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime

from app.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)

    share_token = Column(String(32), unique=True, nullable=True, index=True)

    content_type = Column(String(50), nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    student_class = Column(String(50), nullable=False)

    heading = Column(String(200), nullable=False)

    description = Column(Text, nullable=False)

    written_content = Column(Text, nullable=True)

    media_url = Column(Text, nullable=True)

    media_type = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)