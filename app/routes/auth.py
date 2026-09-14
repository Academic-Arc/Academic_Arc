from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

import uuid
from app.supabase import supabase

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserSignup, UserLogin, UserProfileUpdate, PasswordChange

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.student import Student
from app.services.auth import decode_access_token

from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

security = HTTPBearer()

@router.post("/signup")
def signup(
    user_data: UserSignup,
    db: Session = Depends(get_db)
):

    if not user_data.email and not user_data.phone:
        raise HTTPException(
            status_code=400,
            detail="Please provide either an email address or phone number"
        )

    if user_data.email:
        existing_user = (
            db.query(User)
            .filter(User.email == user_data.email)
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

    if user_data.phone:
        existing_user = (
            db.query(User)
            .filter(User.phone == user_data.phone)
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Phone number already registered"
            )

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        is_student=user_data.is_student,
        dob=user_data.dob,
        password_hash=hash_password(
            user_data.password
        )
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_student = None

    if user_data.is_student:
        new_student = Student(
            user_id=new_user.id,
            school=user_data.school,
            student_class=user_data.student_class
        )

        db.add(new_student)
        db.commit()
        db.refresh(new_student)

    access_token = create_access_token(
        new_user.id,
        new_user.role
    )

    return {
        "message": "User created successfully",
        "user_id": new_user.id,
        "student_id": new_student.id if new_student else None,
        "access_token": access_token
    }

@router.post("/login")
def login(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(
            (User.email == user_data.identifier) |
            (User.phone == user_data.identifier)
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email/phone or password"
        )

    if not verify_password(
        user_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email/phone or password"
        )

    student = (
        db.query(Student)
        .filter(Student.user_id == user.id)
        .first()
    )

    access_token = create_access_token(
        user.id,
        user.role
    )

    return {
    "message": "Login successful",
    "user_id": user.id,
    "student_id": student.id if student else None,
    "role": user.role,
    "access_token": access_token
}

@router.get("/me")
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    payload = decode_access_token(credentials.credentials)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    student = (
        db.query(Student)
        .filter(Student.user_id == user.id)
        .first()
    )

    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "is_student": user.is_student,
        "profile_picture": user.profile_picture,
        "district": user.district,
        "village_locality": user.village_locality,
        "created_at": user.created_at,
        "dob": user.dob,
        "student": {
            "student_id": student.id,
            "school": student.school,
            "student_class": student.student_class
        } if student else None
    }

@router.put("/profile")
def update_profile(
    profile_data: UserProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    payload = decode_access_token(credentials.credentials)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if not profile_data.email and not profile_data.phone:
        raise HTTPException(
            status_code=400,
            detail="Either email or phone number is required"
        )

    if profile_data.email:
        existing_email = (
            db.query(User)
            .filter(
                User.email == profile_data.email,
                User.id != user.id
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

    if profile_data.phone:
        existing_phone = (
            db.query(User)
            .filter(
                User.phone == profile_data.phone,
                User.id != user.id
            )
            .first()
        )

        if existing_phone:
            raise HTTPException(
                status_code=400,
                detail="Phone number already registered"
            )

    user.name = profile_data.name
    user.email = profile_data.email
    user.phone = profile_data.phone
    user.district = profile_data.district
    user.village_locality = profile_data.village_locality

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated successfully"
    }

@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    payload = decode_access_token(credentials.credentials)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WebP images are allowed."
        )

    file_extension = file.filename.split(".")[-1].lower()
    file_name = f"{user_id}_{uuid.uuid4()}.{file_extension}"

    file_bytes = await file.read()

    supabase.storage.from_("profile-pictures").upload(
        path=file_name,
        file=file_bytes,
        file_options={
            "content-type": file.content_type,
            "upsert": "true"
        }
    )

    public_url = supabase.storage.from_(
        "profile-pictures"
    ).get_public_url(file_name)

    user.profile_picture = public_url

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile picture uploaded successfully",
        "profile_picture": public_url
    }

@router.put("/change-password")
def change_password(
    password_data: PasswordChange,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    payload = decode_access_token(credentials.credentials)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user_id = payload.get("user_id")

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if not verify_password(
        password_data.current_password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    user.password_hash = hash_password(
        password_data.new_password
    )

    db.commit()

    return {
        "message": "Password changed successfully"
    }