from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from app.database import get_db
from app.models.user import User
from app.models.like import PostLike
from app.models.student import Student
from app.models.submission import Submission
from app.models.featured import SpecialFeature


router = APIRouter(
    prefix="/featured",
    tags=["Featured"]
)


@router.get("/")
def get_public_featured(db: Session = Depends(get_db)):

    # --------------------------------------------------
    # 1. Calculate previous month's automatic winners
    # --------------------------------------------------

    today = datetime.utcnow()

    first_day_current_month = today.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0
    )

    if first_day_current_month.month == 1:
        first_day_previous_month = first_day_current_month.replace(
            year=first_day_current_month.year - 1,
            month=12
        )
    else:
        first_day_previous_month = first_day_current_month.replace(
            month=first_day_current_month.month - 1
        )

    previous_month = first_day_previous_month.strftime("%B %Y")

    posts = (
        db.query(
            Submission,
            func.count(PostLike.id).label("like_count")
        )
        .outerjoin(
            PostLike,
            PostLike.submission_id == Submission.id
        )
        .filter(
            Submission.created_at >= first_day_previous_month,
            Submission.created_at < first_day_current_month
        )
        .group_by(Submission.id)
        .order_by(
            Submission.content_type,
            func.count(PostLike.id).desc(),
            Submission.created_at.desc()
        )
        .all()
    )

    auto_winners = {}

    for submission, like_count in posts:

        if like_count == 0:
            continue

        if submission.content_type not in auto_winners:
            auto_winners[submission.content_type] = (
                submission,
                like_count
            )

    auto_winner_ids = {
        submission.id
        for submission, like_count in auto_winners.values()
    }

    # --------------------------------------------------
    # 2. Get admin-selected Special Mentions
    # --------------------------------------------------

    special_features = (
        db.query(SpecialFeature, Submission, User, Student)
        .join(Submission, SpecialFeature.submission_id == Submission.id)
        .join(User, Submission.user_id == User.id)
        .outerjoin(Student, Student.user_id == User.id)
        .order_by(SpecialFeature.created_at.desc())
        .all()
    )

    results = []

    special_submission_ids = set()

    for special_feature, submission, user, student in special_features:

        special_submission_ids.add(submission.id)

        results.append({
            "id": submission.id,
            "user_id": submission.user_id,
            "share_token": submission.share_token,
            "content_type": submission.content_type,
            "student_name": user.name,
            "student_class": submission.student_class,
            "school": student.school if student else None,
            "profile_picture": user.profile_picture,
            "heading": submission.heading,
            "description": submission.description,
            "written_content": submission.written_content,
            "media_url": submission.media_url,
            "media_type": submission.media_type,
            "created_at": submission.created_at,
            "featured_at": special_feature.created_at,
            "feature_type": "special",

            # True only when this Special Mention
            # is also the automatic monthly winner.
            "also_top_post": submission.id in auto_winner_ids,
            "featured_month": (
                previous_month
                if submission.id in auto_winner_ids
                else None
            )
        })

    # --------------------------------------------------
    # 3. Add automatic winners
    # --------------------------------------------------

    for submission, like_count in auto_winners.values():

        # Don't show the same post twice if it is
        # already a Special Mention.
        if submission.id in special_submission_ids:
            continue

        user = (
            db.query(User)
            .filter(User.id == submission.user_id)
            .first()
        )

        student = (
            db.query(Student)
            .filter(Student.user_id == user.id)
            .first()
        )

        results.append({
            "id": submission.id,
            "user_id": submission.user_id,
            "share_token": submission.share_token,
            "content_type": submission.content_type,
            "student_name": user.name,
            "student_class": submission.student_class,
            "school": student.school if student else None,
            "profile_picture": user.profile_picture,
            "heading": submission.heading,
            "description": submission.description,
            "written_content": submission.written_content,
            "media_url": submission.media_url,
            "media_type": submission.media_type,
            "created_at": submission.created_at,
            "featured_at": None,
            "feature_type": "automatic",
            "also_top_post": False,
            "featured_month": previous_month,
            "like_count": like_count
        })

    return results