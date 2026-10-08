from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session
from email.message import EmailMessage

import smtplib

from app.database import get_db, settings
from app.limiter import limiter
from app.models.feedback import Feedback
from app.models.user import User
from app.services.auth import decode_access_token


router = APIRouter(
    prefix="/feedback",
    tags=["Feedback"]
)

security = HTTPBearer(auto_error=False)


class FeedbackRequest(BaseModel):
    feedback: str = Field(
        ...,
        min_length=1,
        max_length=2000
    )

    email: EmailStr | None = None


@router.post("")
@limiter.limit("5/minute")
def submit_feedback(
    request: Request,
    data: FeedbackRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db)
):

    user = None

    # Identify logged-in user if a valid token is provided
    if credentials:

        payload = decode_access_token(
            credentials.credentials
        )

        if payload:

            user_id = payload.get("user_id")

            if user_id:
                user = (
                    db.query(User)
                    .filter(User.id == user_id)
                    .first()
                )

    # Logged-in user
    if user:

        feedback = Feedback(
            user_id=user.id,
            name=user.name,
            email=user.email,
            message=data.feedback.strip(),
            is_anonymous=False,
            status="new"
        )

        sender_email = user.email
        sender_name = user.name

    # Guest user
    else:

        feedback = Feedback(
            user_id=None,
            name=None,
            email=data.email,
            message=data.feedback.strip(),
            is_anonymous=True,
            status="new"
        )

        sender_email = data.email
        sender_name = "Anonymous visitor"

    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    # Create notification email
    message = EmailMessage()

    message["Subject"] = "New Academic Arc Feedback"
    message["From"] = settings.EMAIL_ADDRESS
    message["To"] = settings.EMAIL_ADDRESS

    if sender_email:
        message["Reply-To"] = sender_email

    message.set_content(
        f"""New feedback has been submitted through the Academic Arc website.

Submitted by:
{sender_name}

Email:
{sender_email or "Not provided"}

Feedback:
{feedback.message}

Submission ID:
{feedback.id}
"""
    )

    try:

        with smtplib.SMTP_SSL(
            "smtp.hostinger.com",
            465
        ) as smtp:

            smtp.login(
                settings.EMAIL_ADDRESS,
                settings.EMAIL_PASSWORD
            )

            smtp.send_message(message)

    except Exception as e:

        print(
            f"Feedback email error: {e}"
        )

        # Keep the database record even if email fails
        raise HTTPException(
            status_code=500,
            detail="Feedback was saved but the notification email could not be sent."
        )

    return {
        "success": True,
        "message": "Feedback submitted successfully.",
        "feedback_id": feedback.id
    }