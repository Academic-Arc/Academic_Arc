from pydantic import BaseModel, EmailStr, Field
from datetime import date


class UserSignup(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100
    )

    email: EmailStr | None = None

    phone: str | None = Field(
        default=None,
        min_length=10,
        max_length=15
    )

    password: str = Field(
        min_length=8,
        max_length=100
    )

    is_student: bool

    dob: date

    school: str | None = Field(
        default=None,
        min_length=2,
        max_length=200
    )

    student_class: str | None = Field(
        default=None,
        min_length=1,
        max_length=50
    )

class UserLogin(BaseModel):
    identifier: str
    password: str

class UserProfileUpdate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100
    )

    district: str | None = Field(
        default=None,
        max_length=100
    )

    village_locality: str | None = Field(
        default=None,
        max_length=200
    )