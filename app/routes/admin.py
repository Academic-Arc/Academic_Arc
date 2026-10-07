from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from fastapi import APIRouter, Depends, HTTPException

from app.models.user import User
from app.models.report import Report
from app.models.student import Student
from app.models.submission import Submission
from app.models.featured import SpecialFeature
from app.models.notification import Notification

from app.services.auth import get_current_admin

from app.supabase import supabase


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/me")
def admin_me(
    admin: User = Depends(get_current_admin)
):
    return {
        "message": "Admin access verified",
        "admin_id": admin.id,
        "name": admin.name,
        "email": admin.email
    }

@router.get("/posts")
def get_admin_posts(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    posts = (
        db.query(Submission, User, Student)
        .join(User, Submission.user_id == User.id)
        .outerjoin(Student, Student.user_id == User.id)
        .order_by(Submission.created_at.desc())
        .all()
    )

    results = []

    for submission, user, student in posts:
        results.append({
            "id": submission.id,
            "content_type": submission.content_type,
            "heading": submission.heading,
            "description": submission.description,
            "written_content": submission.written_content,
            "media_url": submission.media_url,
            "media_type": submission.media_type,
            "created_at": submission.created_at,

            "user_id": user.id,
            "user_name": user.name,
            "user_email": user.email,
            "is_student": user.is_student,

            "school": student.school if student else None,
            "student_class": submission.student_class
        })

    return results

@router.get("/posts/{submission_id}")
def get_admin_post(
    submission_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    result = (
        db.query(Submission, User, Student)
        .join(User, Submission.user_id == User.id)
        .outerjoin(Student, Student.user_id == User.id)
        .filter(Submission.id == submission_id)
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    submission, user, student = result

    return {
        "id": submission.id,
        "content_type": submission.content_type,
        "heading": submission.heading,
        "description": submission.description,
        "written_content": submission.written_content,
        "media_url": submission.media_url,
        "media_type": submission.media_type,
        "created_at": submission.created_at,

        "user_id": user.id,
        "user_name": user.name,
        "user_email": user.email,
        "is_student": user.is_student,

        "school": student.school if student else None,
        "student_class": submission.student_class
    }

@router.delete("/posts/{submission_id}")
def delete_admin_post(
    submission_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id)
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    # Delete uploaded media from Supabase Storage
    if submission.media_url:
        if "supabase" in submission.media_url:
            file_name = submission.media_url.split("/")[-1]

            try:
                supabase.storage.from_("submissions").remove(
                    [file_name]
                )
            except Exception as error:
                print(
                    f"Could not delete media file: {error}"
                )

    db.delete(submission)
    db.commit()

    return {
        "message": "Post deleted successfully",
        "submission_id": submission_id
    }

@router.get("/categories")
def get_admin_categories(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    categories = (
        db.query(
            Submission.content_type,
            func.count(Submission.id).label("post_count")
        )
        .group_by(Submission.content_type)
        .order_by(Submission.content_type)
        .all()
    )

    return [
        {
            "name": category,
            "post_count": post_count
        }
        for category, post_count in categories
    ]

@router.get("/featured")
def get_admin_featured(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    special_features = (
        db.query(SpecialFeature, Submission, User, Student)
        .join(
            Submission,
            SpecialFeature.submission_id == Submission.id
        )
        .join(
            User,
            Submission.user_id == User.id
        )
        .outerjoin(
            Student,
            Student.user_id == User.id
        )
        .order_by(SpecialFeature.created_at.desc())
        .all()
    )

    results = []

    for special_feature, submission, user, student in special_features:
        results.append({
            "id": special_feature.id,
            "submission_id": submission.id,
            "heading": submission.heading,
            "description": submission.description,
            "content_type": submission.content_type,
            "media_url": submission.media_url,
            "media_type": submission.media_type,
            "created_at": submission.created_at,

            "user_id": user.id,
            "user_name": user.name,
            "is_student": user.is_student,

            "school": student.school if student else None,
            "student_class": submission.student_class,

            "featured_at": special_feature.created_at
        })

    return results

@router.post("/featured/{submission_id}")
def add_special_feature(
    submission_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id)
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    existing_feature = (
        db.query(SpecialFeature)
        .filter(
            SpecialFeature.submission_id == submission_id
        )
        .first()
    )

    if existing_feature:
        raise HTTPException(
            status_code=400,
            detail="Post is already a special mention"
        )

    special_feature = SpecialFeature(
        submission_id=submission_id
    )

    db.add(special_feature)
    db.commit()
    db.refresh(special_feature)

    return {
        "message": "Post added to special mentions",
        "submission_id": submission_id
    }

@router.delete("/featured/{submission_id}")
def remove_special_feature(
    submission_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    special_feature = (
        db.query(SpecialFeature)
        .filter(
            SpecialFeature.submission_id == submission_id
        )
        .first()
    )

    if not special_feature:
        raise HTTPException(
            status_code=404,
            detail="Post is not a special mention"
        )

    db.delete(special_feature)
    db.commit()

    return {
        "message": "Post removed from special mentions",
        "submission_id": submission_id
    }

@router.get("/users")
def get_admin_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    users = (
        db.query(
            User,
            Student,
            func.count(Submission.id).label("submission_count")
        )
        .outerjoin(Student, Student.user_id == User.id)
        .outerjoin(Submission, Submission.user_id == User.id)
        .group_by(User.id, Student.id)
        .order_by(User.created_at.desc())
        .all()
    )

    results = []

    for user, student, submission_count in users:
        results.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "is_student": user.is_student,
            "profile_picture": user.profile_picture,
            "district": user.district,
            "village_locality": user.village_locality,
            "dob": user.dob,
            "created_at": user.created_at,

            "school": student.school if student else None,
            "student_class": student.student_class if student else None,

            "submission_count": submission_count
        })

    return results

@router.get("/users/{user_id}")
def get_admin_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
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

    submission_count = (
        db.query(func.count(Submission.id))
        .filter(Submission.user_id == user.id)
        .scalar()
    )

    submissions = (
        db.query(Submission)
        .filter(Submission.user_id == user.id)
        .order_by(Submission.created_at.desc())
        .all()
    )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "is_student": user.is_student,
        "profile_picture": user.profile_picture,
        "district": user.district,
        "village_locality": user.village_locality,
        "dob": user.dob,
        "created_at": user.created_at,

        "school": student.school if student else None,
        "student_class": student.student_class if student else None,

        "submission_count": submission_count,

        "submissions": [
            {
                "id": submission.id,
                "content_type": submission.content_type,
                "heading": submission.heading,
                "description": submission.description,
                "written_content": submission.written_content,
                "media_url": submission.media_url,
                "media_type": submission.media_type,
                "created_at": submission.created_at
            }
            for submission in submissions
        ]
    }

@router.get("/reports")
def get_admin_reports(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    reports = (
        db.query(Report, Submission, User)
        .join(
            Submission,
            Report.submission_id == Submission.id
        )
        .join(
            User,
            Submission.user_id == User.id
        )
        .order_by(Report.created_at.desc())
        .all()
    )

    results = []

    for report, submission, post_author in reports:

        reporter = (
            db.query(User)
            .filter(User.id == report.reporter_id)
            .first()
        )

        results.append({
            "id": report.id,

            "submission_id": submission.id,
            "submission_heading": submission.heading,
            "submission_content_type": submission.content_type,

            "post_author_id": post_author.id,
            "post_author_name": post_author.name,

            "reporter_id": reporter.id if reporter else None,
            "reporter_name": reporter.name if reporter else "Unknown",

            "reason": report.reason,
            "details": report.details,
            "status": report.status,
            "created_at": report.created_at
        })

    return results

@router.patch("/reports/{report_id}")
def update_report_status(
    report_id: int,
    status: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    allowed_statuses = {
        "pending",
        "changes_requested",
        "resolved",
        "dismissed"
    }

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid report status"
        )

    report = (
        db.query(Report)
        .filter(Report.id == report_id)
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    report.status = status

    db.commit()
    db.refresh(report)

    return {
        "message": "Report status updated successfully",
        "report_id": report.id,
        "status": report.status
    }

@router.patch("/reports/{report_id}/request-changes")
def request_report_changes(
    report_id: int,
    message: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    report = (
        db.query(Report)
        .filter(Report.id == report_id)
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    submission = (
        db.query(Submission)
        .filter(Submission.id == report.submission_id)
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found"
        )

    message = message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    notification = Notification(
        user_id=submission.user_id,
        report_id=report.id,
        submission_id=submission.id,
        notification_type="changes_requested",
        title="Changes requested for your post",
        message=message,
        is_read=False
    )

    db.add(notification)

    report.status = "changes_requested"

    db.commit()

    return {
        "message": "Change request sent successfully",
        "report_id": report.id,
        "status": report.status
    }