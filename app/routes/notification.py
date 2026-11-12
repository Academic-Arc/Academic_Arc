from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notification import Notification
from app.services.auth import decode_access_token


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

security = HTTPBearer()


def cleanup_expired_read_notifications(db: Session, days: int = 30) -> int:
    """
    Checks for read notifications and deletes any notification
    where is_read is True and read_at is older than the specified number of days (default 30).
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    deleted = (
        db.query(Notification)
        .filter(
            Notification.is_read == True,
            Notification.read_at.isnot(None),
            Notification.read_at < cutoff
        )
        .delete(synchronize_session=False)
    )
    if deleted > 0:
        db.commit()
    return deleted


@router.get("/")
def get_notifications(
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

    # Automatically purge read notifications older than 30 days from read date
    cleanup_expired_read_notifications(db, days=30)

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    return [
        {
            "id": notification.id,
            "notification_type": notification.notification_type,
            "title": notification.title,
            "message": notification.message,
            "submission_id": notification.submission_id,
            "report_id": notification.report_id,
            "is_read": notification.is_read,
            "read_at": notification.read_at,
            "created_at": notification.created_at
        }
        for notification in notifications
    ]


@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
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

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    # If unread, mark as read and record the read date
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)

    # Also clean up any expired read notifications
    cleanup_expired_read_notifications(db, days=30)

    return {
        "message": "Notification marked as read",
        "notification_id": notification.id,
        "is_read": notification.is_read,
        "read_at": notification.read_at
    }


@router.patch("/read-all")
def mark_all_notifications_as_read(
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

    now = datetime.utcnow()
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
        .update(
            {"is_read": True, "read_at": now},
            synchronize_session=False
        )
    )

    db.commit()
    cleanup_expired_read_notifications(db, days=30)

    return {
        "message": "All notifications marked as read",
        "updated_count": updated_count
    }