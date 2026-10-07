from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.report import Report
from app.models.submission import Submission
from app.services.auth import decode_access_token


router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

security = HTTPBearer()


ALLOWED_REASONS = {
    "Inappropriate or offensive content",
    "Harassment or bullying",
    "Copyright infringement",
    "Spam or misleading content",
    "Sexual or inappropriate content involving minors",
    "Violence or dangerous content",
    "Other",
}


@router.post("/")
def create_report(
    submission_id: int,
    reason: str,
    details: str | None = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    payload = decode_access_token(credentials.credentials)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    reporter_id = payload.get("user_id")

    if not reporter_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    if reason not in ALLOWED_REASONS:
        raise HTTPException(
            status_code=400,
            detail="Invalid report reason"
        )

    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id)
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found"
        )

    if submission.user_id == reporter_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot report your own post"
        )

    existing_report = (
        db.query(Report)
        .filter(
            Report.submission_id == submission_id,
            Report.reporter_id == reporter_id
        )
        .first()
    )

    if existing_report:
        raise HTTPException(
            status_code=400,
            detail="You have already reported this post"
        )

    new_report = Report(
        submission_id=submission_id,
        reporter_id=reporter_id,
        reason=reason,
        details=details.strip() if details else None,
        status="pending"
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return {
        "message": "Report submitted successfully",
        "report_id": new_report.id
    }