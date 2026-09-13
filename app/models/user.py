from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True
    )

    phone: Mapped[str] = mapped_column(
        String(15),
        unique=True,
        index=True,
        nullable=True
    )

    is_student: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="user"
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    profile_picture: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    district: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    village_locality: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True
    )

    dob: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    student = relationship(
        "Student",
        back_populates="user",
        uselist=False
    )