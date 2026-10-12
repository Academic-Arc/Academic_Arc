from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import uuid
import secrets
import hashlib
import io
import traceback

from PIL import Image
from datetime import datetime, timedelta, date
from app.supabase import supabase

from authlib.integrations.starlette_client import OAuth
from app.models.oauth_account import OAuthAccount

from app.database import get_db, settings
from app.limiter import limiter
from app.models.user import User
from app.models.security_question import SecurityQuestion
from app.models.password_recovery import PasswordRecoverySession
from app.schemas.user import (UserSignup, UserLogin, UserProfileUpdate, PasswordChange, 
                              ForgotPasswordRequest, VerifySecurityAnswers, ResetPassword,
                              OAuthSetupRequest)

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.student import Student
from app.services.auth import decode_access_token

from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token
)

security = HTTPBearer()

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    },
)

@router.get("/google")
async def google_login(request: Request):
    if settings.FRONTEND_URL.startswith("https://"):
        redirect_uri = "https://api.academicarc.in/auth/google/callback"
    else:
        redirect_uri = str(request.url_for("google_callback"))
        
    return await oauth.google.authorize_redirect(
        request,
        redirect_uri
    )

@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        token = await oauth.google.authorize_access_token(request)
        print("GOOGLE TOKEN RECEIVED")
        userinfo = token.get("userinfo")
        print("GOOGLE USERINFO:", userinfo)

    except Exception:
        print("GOOGLE OAUTH ERROR:")
        traceback.print_exc()

        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?oauth_error=google_auth_failed"
        )

    userinfo = token.get("userinfo")

    if not userinfo:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?oauth_error=google_userinfo_failed"
        )

    google_user_id = userinfo.get("sub")
    email = userinfo.get("email")
    email_verified = userinfo.get("email_verified", False)

    if not google_user_id or not email:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?oauth_error=google_missing_data"
        )

    if not email_verified:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?oauth_error=google_email_not_verified"
        )

    # Check whether this Google account is already connected
    oauth_account = (
        db.query(OAuthAccount)
        .filter(
            OAuthAccount.provider == "google",
            OAuthAccount.provider_user_id == google_user_id
        )
        .first()
    )

    if oauth_account:
        user = (
            db.query(User)
            .filter(User.id == oauth_account.user_id)
            .first()
        )

        if not user:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/login?oauth_error=account_not_found"
            )

        access_token = create_access_token(
            user.id,
            user.role,
            user.token_version
        )

        return RedirectResponse(
            url=(
                f"{settings.FRONTEND_URL}/oauth/callback"
                f"#access_token={access_token}"
                f"&setup_required=false"
            )
        )

    # Do NOT automatically connect Google to an existing
    # Academic Arc account just because the email matches.
    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    print(
        "GOOGLE EXISTING EMAIL MATCH:",
        existing_user.email if existing_user else None
    )

    if existing_user:
        return RedirectResponse(
            url=(
                f"{settings.FRONTEND_URL}/login"
                f"?oauth_error=account_exists"
            )
        )

    # Create a brand-new Academic Arc account.
    # A random password is stored temporarily because
    # User.password_hash is currently non-nullable.
    temporary_password = secrets.token_urlsafe(32)

    new_user = User(
        name=userinfo.get("name") or "Academic Arc User",
        email=email,
        is_student=False,
        password_hash=hash_password(temporary_password),
        profile_picture=userinfo.get("picture")
    )

    db.add(new_user)
    db.flush()

    new_oauth_account = OAuthAccount(
        user_id=new_user.id,
        provider="google",
        provider_user_id=google_user_id,
        provider_email=email
    )

    db.add(new_oauth_account)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(
        new_user.id,
        new_user.role,
        new_user.token_version
    )

    print("GOOGLE OAUTH SUCCESS - REDIRECTING TO FRONTEND")

    return RedirectResponse(
        url=(
            f"{settings.FRONTEND_URL}/oauth/callback"
            f"#access_token={access_token}"
            f"&setup_required=true"
        )
    )

@router.post("/oauth/setup")
def oauth_setup(
    setup_data: OAuthSetupRequest,
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

    if payload.get("token_version") != user.token_version:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    # Make sure this is an OAuth-linked account
    oauth_account = (
        db.query(OAuthAccount)
        .filter(OAuthAccount.user_id == user.id)
        .first()
    )

    if not oauth_account:
        raise HTTPException(
            status_code=403,
            detail="OAuth setup is only available for OAuth accounts"
        )

    # Validate password
    if len(setup_data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long."
        )

    # Validate student-specific information
    if setup_data.is_student:
        if not setup_data.school or not setup_data.student_class:
            raise HTTPException(
                status_code=400,
                detail="School and class are required for students."
            )

    # Update the existing user
    user.is_student = setup_data.is_student
    user.dob = setup_data.dob
    user.password_hash = hash_password(
        setup_data.password
    )

    # Create or update Student record
    if setup_data.is_student:
        student = (
            db.query(Student)
            .filter(Student.user_id == user.id)
            .first()
        )

        if student:
            student.school = setup_data.school
            student.student_class = setup_data.student_class
        else:
            student = Student(
                user_id=user.id,
                school=setup_data.school,
                student_class=setup_data.student_class
            )

            db.add(student)

    # Invalidate the temporary OAuth token
    user.token_version += 1

    db.commit()
    db.refresh(user)

    # Issue a fresh token
    access_token = create_access_token(
        user.id,
        user.role,
        user.token_version
    )

    return {
        "message": "OAuth account setup completed successfully",
        "access_token": access_token
    }

SECURITY_QUESTIONS = {
    "childhood_friend": "What was the name of your childhood best friend?",
    "first_school": "What was the name of your first school?",
    "favorite_teacher": "What was the name of your favorite teacher?",
    "favorite_book": "What was the title of your favorite book as a child?",
    "birth_city": "What city were you born in?",
    "first_pet": "What was the name of your first pet?",
    "favorite_subject": "What was your favorite subject in school?",
    "dream_job": "What did you want to be when you grew up?"
}

def hash_recovery_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

@router.post("/signup")
@limiter.limit("5/15minutes")
def signup(
    request: Request,
    user_data: UserSignup,
    db: Session = Depends(get_db)
):

    if not user_data.email and not user_data.phone:
        raise HTTPException(
            status_code=400,
            detail="Please provide either an email address or phone number"
        )

    if len(user_data.security_questions) != 3:
        raise HTTPException(
            status_code=400,
            detail="Exactly 3 security questions are required"
        )

    question_keys = [
        question.question_key
        for question in user_data.security_questions
    ]

    if len(set(question_keys)) != 3:
        raise HTTPException(
            status_code=400,
            detail="Security questions must be different"
        )

    for question in user_data.security_questions:
        if question.question_key not in SECURITY_QUESTIONS:
            raise HTTPException(
                status_code=400,
                detail="Invalid security question"
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

    for security_question in user_data.security_questions:
        new_security_question = SecurityQuestion(
            user_id=new_user.id,
            question_key=security_question.question_key,
            answer_hash=hash_password(
                security_question.answer.strip().lower()
            )
        )

        db.add(new_security_question)

    db.commit()

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
        new_user.role,
        new_user.token_version
    )

    return {
        "message": "User created successfully",
        "user_id": new_user.id,
        "student_id": new_student.id if new_student else None,
        "access_token": access_token
    }

@router.post("/login")
@limiter.limit("10/10minutes")
def login(
    request: Request,
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
        user.role,
        user.token_version
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

    if payload.get("token_version") != user.token_version:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
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

    MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024

    if len(file_bytes) > MAX_PROFILE_PICTURE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Profile picture must be 5 MB or smaller."
        )

    try:
        image = Image.open(
            io.BytesIO(file_bytes)
        )

        image.verify()

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted profile picture."
        )

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

    user.token_version += 1

    db.commit()

    return {
        "message": "Password changed successfully"
    }

@router.post("/forgot-password")
@limiter.limit("5/15minutes")
def forgot_password(
    request: Request,
    forgot_request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(
            (User.email == forgot_request.identifier) |
            (User.phone == forgot_request.identifier)
        )
        .first()
    ) 

    if not user:
        fake_questions = secrets.SystemRandom().sample(
            list(SECURITY_QUESTIONS.items()),
            2
        )

        fake_recovery_token = secrets.token_urlsafe(32)

        return {
            "recovery_token": fake_recovery_token,
            "questions": [
                {
                    "id": -(index + 1),
                    "question_key": question_key,
                    "question": question_text
                }
                for index, (question_key, question_text)
                in enumerate(fake_questions)
            ]
        }

    questions = (
        db.query(SecurityQuestion)
        .filter(
            SecurityQuestion.user_id == user.id
        )
        .all()
    )

    if len(questions) != 3:
        raise HTTPException(
            status_code=400,
            detail="Security questions are not configured for this account"
        )

    db.query(PasswordRecoverySession).filter(
        PasswordRecoverySession.user_id == user.id,
        PasswordRecoverySession.used_at.is_(None)
    ).update(
        {
            PasswordRecoverySession.used_at: datetime.utcnow()
        },
        synchronize_session=False
    )

    db.commit()

    selected_questions = secrets.SystemRandom().sample(
        questions,
        2
    )

    recovery_token = secrets.token_urlsafe(32)

    recovery_session = PasswordRecoverySession(
        user_id=user.id,
        token_hash=hash_recovery_token(
            recovery_token
        ),
        question_1_id=selected_questions[0].id,
        question_2_id=selected_questions[1].id,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        attempts=0
    )

    db.add(recovery_session)
    db.commit()

    return {
        "recovery_token": recovery_token,
        "questions": [
            {
                "id": question.id,
                "question_key": question.question_key,
                "question": SECURITY_QUESTIONS[
                    question.question_key
                ]
            }
            for question in selected_questions
        ]
    }

@router.post("/verify-security-answers")
def verify_security_answers(
    request: VerifySecurityAnswers,
    db: Session = Depends(get_db)
):
    recovery_session = (
        db.query(PasswordRecoverySession)
        .filter(
            PasswordRecoverySession.token_hash
            == hash_recovery_token(request.recovery_token)
        )
        .first()
    )

    if not recovery_session:
        raise HTTPException(
            status_code=400,
            detail="Invalid recovery token"
        )

    if recovery_session.used_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Recovery session has already been used"
        )

    if recovery_session.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Recovery session has expired"
        )

    if (
        recovery_session.question_1_id not in request.answers
        or recovery_session.question_2_id not in request.answers
    ):
        raise HTTPException(
            status_code=400,
            detail="Answers for both security questions are required"
        )

    questions = (
        db.query(SecurityQuestion)
        .filter(
            SecurityQuestion.id.in_([
                recovery_session.question_1_id,
                recovery_session.question_2_id
            ])
        )
        .all()
    )

    questions_by_id = {
        question.id: question
        for question in questions
    }

    for question_id in [
        recovery_session.question_1_id,
        recovery_session.question_2_id
    ]:
        question = questions_by_id.get(question_id)

        if not question:
            raise HTTPException(
                status_code=400,
                detail="Security question configuration is invalid"
            )

        answer = request.answers[question_id].strip().lower()

        if not verify_password(
            answer,
            question.answer_hash
        ):
            recovery_session.attempts += 1
            db.commit()

            if recovery_session.attempts >= 3:
                recovery_session.used_at = datetime.utcnow()
                db.commit()

                raise HTTPException(
                    status_code=400,
                    detail="Too many incorrect attempts"
                )

            raise HTTPException(
                status_code=400,
                detail="Incorrect security answers"
            )

    reset_token = secrets.token_urlsafe(32)

    recovery_session.token_hash = hash_recovery_token(
        reset_token
    )

    db.commit()

    return {
        "reset_token": reset_token
    }

@router.post("/reset-password")
def reset_password(
    request: ResetPassword,
    db: Session = Depends(get_db)
):
    recovery_session = (
        db.query(PasswordRecoverySession)
        .filter(
            PasswordRecoverySession.token_hash
            == hash_recovery_token(request.reset_token)
        )
        .first()
    )

    if not recovery_session:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset token"
        )

    if recovery_session.used_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Reset token has already been used"
        )

    if recovery_session.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Reset token has expired"
        )

    if recovery_session.attempts >= 3:
        raise HTTPException(
            status_code=400,
            detail="Too many incorrect attempts"
        )

    user = (
        db.query(User)
        .filter(User.id == recovery_session.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.password_hash = hash_password(
        request.new_password
    )

    user.token_version += 1

    recovery_session.used_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Password reset successfully"
    }