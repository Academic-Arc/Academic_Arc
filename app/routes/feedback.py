from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from email.message import EmailMessage
import smtplib

from app.database import settings
from app.limiter import limiter


router = APIRouter(
    prefix="/feedback",
    tags=["Feedback"]
)


class FeedbackRequest(BaseModel):
    feedback: str = Field(..., min_length=1, max_length=2000)


@router.post("")
@limiter.limit("5/minute")
def submit_feedback(request: Request, data: FeedbackRequest):

    message = EmailMessage()

    message["Subject"] = "New Academic Arc Feedback"
    message["From"] = settings.EMAIL_ADDRESS
    message["To"] = settings.EMAIL_ADDRESS

    message.set_content(
        f"""New feedback has been submitted through the Academic Arc website.

Feedback:
{data.feedback}
"""
    )

    try:
        with smtplib.SMTP_SSL("smtp.hostinger.com", 465) as smtp:
            smtp.login(
                settings.EMAIL_ADDRESS,
                settings.EMAIL_PASSWORD
            )

            smtp.send_message(message)

    except Exception as e:
        print(f"Feedback email error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Unable to send feedback."
        )

    return {
        "success": True,
        "message": "Feedback submitted successfully."
    }