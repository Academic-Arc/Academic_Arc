import uuid
import secrets
import asyncio
import io

from PIL import Image
from playwright.async_api import async_playwright
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from sqlalchemy import func
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import Response

from app.supabase import supabase

from app.database import get_db
from app.models.submission import Submission
from app.schemas.submission import SubmissionCreate, SubmissionUpdate

from app.models.user import User
from app.models.like import PostLike
from app.models.comment import PostComment
from app.models.notification import Notification
from app.models.student import Student
from app.schemas.comment import CommentCreate

from app.services.auth import get_current_user, decode_access_token

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from urllib.parse import urlparse

router = APIRouter(
    prefix="/submissions",
    tags=["Submissions"]
)

from app.services.facebook import (
    resolve_facebook_embed_url,
    validate_facebook_url,
    get_facebook_browser,
)

security = HTTPBearer()

ALLOWED_EXTERNAL_DOMAINS = {
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
    "facebook.com",
    "www.facebook.com",
    "fb.watch",
    "drive.google.com",
}

def validate_external_url(url: str) -> bool:
    try:
        parsed = urlparse(url)

        if parsed.scheme not in {"http", "https"}:
            return False

        hostname = parsed.hostname

        if not hostname:
            return False

        hostname = hostname.lower()

        return hostname in ALLOWED_EXTERNAL_DOMAINS

    except Exception:
        return False

@router.post("/")
def create_submission(
    submission_data: SubmissionCreate,
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

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.is_student:
        if not submission_data.student_class or not submission_data.student_class.strip():
            raise HTTPException(
                status_code=400,
                detail="Class is required for students."
            )
        final_student_class = submission_data.student_class.strip()
    else:
        final_student_class = None

    if submission_data.media_url:
        if not validate_external_url(submission_data.media_url):
            raise HTTPException(
                status_code=400,
                detail="Only YouTube, Facebook, and Google Drive links are allowed."
            )

        allowed_media_types = {"video", "image", "audio"}

        if submission_data.media_type not in allowed_media_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid external media type."
            )

    new_submission = Submission(
        content_type=submission_data.content_type,
        user_id=user_id,
        student_class=final_student_class,
        heading=submission_data.heading,
        description=submission_data.description,
        written_content=submission_data.written_content,
        media_url=submission_data.media_url,
        media_type=submission_data.media_type,
        share_token=secrets.token_urlsafe(16)
    )

    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    return {
        "message": "Submission created successfully",
        "submission_id": new_submission.id
    }


@router.post("/upload")
async def upload_submission_file(
    submission_id: int,
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

    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.user_id == user_id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found"
        )

    old_media_url = submission.media_url

    # Get file extension
    extension_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
        "audio/mp4": "m4a",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/ogg": "ogv"
    }

    file_extension = extension_map[file.content_type]

    # Generate unique filename
    file_name = f"{uuid.uuid4()}.{file_extension}"

    # Read file
    file_bytes = await file.read()

    # File Size Limiter
    MAX_IMAGE_SIZE = 5 * 1024 * 1024
    MAX_AUDIO_SIZE = 20 * 1024 * 1024
    MAX_VIDEO_SIZE = 50 * 1024 * 1024

    allowed_image_types = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }

    allowed_audio_types = {
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp4"
    }

    allowed_video_types = {
        "video/mp4",
        "video/webm",
        "video/ogg"
    }

    if file.content_type in allowed_image_types:
        if len(file_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Image files must be 5 MB or smaller."
            )

        try:
            image = Image.open(
                io.BytesIO(file_bytes)
            )

            image.verify()

        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid or corrupted image file."
            )

    elif file.content_type in allowed_audio_types:
        if len(file_bytes) > MAX_AUDIO_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Audio files must be 20 MB or smaller."
            )

    elif file.content_type in allowed_video_types:
        if len(file_bytes) > MAX_VIDEO_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Video files must be 50 MB or smaller."
            )

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported media format."
        )

    # Upload to Supabase Storage
    response = supabase.storage.from_("submissions").upload(
        path=file_name,
        file=file_bytes,
        file_options={
            "content-type": file.content_type,
            "upsert": "false"
        }
    )

    # Save the Supabase file URL in the database
    public_url = supabase.storage.from_("submissions").get_public_url(file_name)

    submission.media_url = public_url
    submission.media_type = file.content_type

    # Delete the previous uploaded Supabase file after
    # the new file has been uploaded successfully.
    if (
        old_media_url
        and "/storage/v1/object/public/submissions/" in old_media_url
    ):
        try:
            parsed_url = urlparse(old_media_url)

            old_file_name = parsed_url.path.split(
                "/storage/v1/object/public/submissions/",
                1
            )[1]

            if old_file_name:
                supabase.storage.from_("submissions").remove(
                    [old_file_name]
                )

        except Exception as error:
            print(
                "Old Supabase media deletion error:",
                repr(error)
            )

    db.commit()
    db.refresh(submission)

    return {
        "message": "File uploaded successfully",
        "submission_id": submission.id,
        "file_name": file_name
    }


@router.get("/")
def get_submissions(
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

    user = db.query(User).filter(User.id == user_id).first()
    profile_picture = user.profile_picture if user else None
    student_name = user.name if user else None

    submissions = db.query(Submission).filter(
        Submission.user_id == user_id
    ).all()

    results = []

    for submission in submissions:

        results.append({
            "id": submission.id,
            "content_type": submission.content_type,
            "user_id": submission.user_id,
            "student_name": student_name,
            "profile_picture": profile_picture,
            "share_token": submission.share_token,
            "student_class": submission.student_class,
            "heading": submission.heading,
            "description": submission.description,
            "written_content": submission.written_content,
            "media_url": submission.media_url,
            "media_type": submission.media_type,
            "created_at": submission.created_at
        })

    return results

@router.patch("/{submission_id}")
def update_submission(
    submission_id: int,
    submission_data: SubmissionUpdate,
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

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.user_id == user_id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found or you do not have permission to edit it."
        )

    if user.is_student:
        if not submission_data.student_class or not submission_data.student_class.strip():
            raise HTTPException(
                status_code=400,
                detail="Class is required for students."
            )
        updated_student_class = submission_data.student_class.strip()
    else:
        updated_student_class = None

    # Validate external media URL if one is supplied.
    # Supabase-hosted media URLs are also valid because they
    # represent files already stored in our own storage.
    if submission_data.media_url:

        is_supabase_media = (
            "/storage/v1/object/public/submissions/"
            in submission_data.media_url
        )

        if not is_supabase_media:

            if not validate_external_url(
                submission_data.media_url
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Only YouTube, Facebook, and Google Drive links are allowed."
                )

            allowed_media_types = {
                "video",
                "image",
                "audio"
            }

            if submission_data.media_type not in allowed_media_types:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid external media type."
                )

    # Save old media URL before changing it
    old_media_url = submission.media_url

    # Update normal fields
    submission.content_type = submission_data.content_type
    submission.student_class = updated_student_class
    submission.heading = submission_data.heading
    submission.description = submission_data.description
    submission.written_content = submission_data.written_content

    # Update media information
    submission.media_url = submission_data.media_url
    submission.media_type = submission_data.media_type

    # If old media was a Supabase uploaded file and is being replaced/removed,
    # delete the old file from Supabase Storage.
    if (
        old_media_url
        and old_media_url != submission_data.media_url
        and "/storage/v1/object/public/submissions/" in old_media_url
    ):
        try:
            parsed_url = urlparse(old_media_url)

            file_name = parsed_url.path.split(
                "/storage/v1/object/public/submissions/",
                1
            )[1]

            if file_name:
                supabase.storage.from_("submissions").remove(
                    [file_name]
                )

        except Exception as error:
            print(
                "Old Supabase media deletion error:",
                repr(error)
            )

    db.commit()
    db.refresh(submission)

    return {
        "message": "Submission updated successfully",
        "submission_id": submission.id,
        "content_type": submission.content_type,
        "student_class": submission.student_class,
        "heading": submission.heading,
        "description": submission.description,
        "written_content": submission.written_content,
        "media_url": submission.media_url,
        "media_type": submission.media_type,
    }

@router.delete("/{submission_id}")
def delete_submission(
    submission_id: int,
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

    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.user_id == user_id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found or you do not have permission to delete it."
        )

    # Delete uploaded media from Supabase Storage
    if submission.media_url:
        try:
            parsed_url = urlparse(submission.media_url)

            # Only attempt deletion for files stored in our
            # Supabase submissions bucket.
            if "/storage/v1/object/public/submissions/" in parsed_url.path:

                file_name = parsed_url.path.split(
                    "/storage/v1/object/public/submissions/",
                    1
                )[1]

                if file_name:
                    supabase.storage.from_("submissions").remove(
                        [file_name]
                    )

        except Exception as error:
            print(
                "Supabase media deletion error:",
                repr(error)
            )

    db.delete(submission)
    db.commit()

    return {
        "message": "Submission deleted successfully",
        "submission_id": submission_id
    }

@router.get("/public")
def get_public_submissions(
    db: Session = Depends(get_db)
):
    submissions = (
        db.query(Submission, User, Student)
        .join(User, User.id == Submission.user_id)
        .outerjoin(Student, Student.user_id == Submission.user_id)
        .all()
    )

    like_counts = dict(
        db.query(PostLike.submission_id, func.count(PostLike.id))
        .group_by(PostLike.submission_id)
        .all()
    )

    comment_counts = dict(
        db.query(PostComment.submission_id, func.count(PostComment.id))
        .group_by(PostComment.submission_id)
        .all()
    )

    results = []

    for submission, user, student in submissions:
        results.append({
            "id": submission.id,
            "content_type": submission.content_type,
            "user_id": submission.user_id,
            "share_token": submission.share_token,

            "student_name": user.name,

            "student_class": (
                submission.student_class
                if submission.student_class
                else (student.student_class if student else None)
            ),

            "school": (
                student.school
                if student
                else None
            ),

            "profile_picture": user.profile_picture,

            "heading": submission.heading,
            "description": submission.description,
            "written_content": submission.written_content,
            "media_url": submission.media_url,
            "media_type": submission.media_type,
            "created_at": submission.created_at,
            "like_count": like_counts.get(submission.id, 0),
            "comment_count": comment_counts.get(submission.id, 0),
        })

    return results

@router.get("/shared/{share_token}")
def get_shared_submission(
    share_token: str,
    db: Session = Depends(get_db)
):
    result = (
        db.query(Submission, User, Student)
        .join(
            User,
            User.id == Submission.user_id
        )
        .outerjoin(
            Student,
            Student.user_id == Submission.user_id
        )
        .filter(
            Submission.share_token == share_token
        )
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Submission not found"
        )

    submission, user, student = result

    return {
        "id": submission.id,
        "share_token": submission.share_token,
        "content_type": submission.content_type,
        "user_id": submission.user_id,
        "student_name": user.name,
        "student_class": submission.student_class if submission.student_class else (student.student_class if student else None),
        "school": student.school if student else None,
        "profile_picture": user.profile_picture,
        "heading": submission.heading,
        "description": submission.description,
        "written_content": submission.written_content,
        "media_url": submission.media_url,
        "media_type": submission.media_type,
        "created_at": submission.created_at,
    }


@router.get("/facebook-embed")
async def get_facebook_embed(
    url: str
):
    if not validate_external_url(url) or not validate_facebook_url(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid Facebook URL."
        )

    if "facebook.com" not in url and "fb.watch" not in url:
        raise HTTPException(
            status_code=400,
            detail="Only Facebook URLs are supported."
        )

    try:
        resolved_url, _ = await resolve_facebook_embed_url(url)
        return {
            "url": resolved_url
        }
    except (ValueError, RuntimeError) as e:
        if "did not resolve" in str(e).lower() or isinstance(e, RuntimeError):
            raise HTTPException(
                status_code=400,
                detail="Facebook did not resolve the share link."
            )
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        print("Facebook resolution error:", repr(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to resolve Facebook video."
        )

@router.get("/{submission_id}/media")
def get_submission_media(
    submission_id: int,
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

    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.user_id == user_id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found"
        )

    if not submission.media_url:
        raise HTTPException(
            status_code=404,
            detail="No media found for this submission"
        )

    if submission.media_type == "external":
        raise HTTPException(
            status_code=400,
            detail="This submission uses an external media link."
        )

    file_name = submission.media_url.split("/")[-1]

    file_bytes = supabase.storage.from_("submissions").download(file_name)

    return Response(
        content=file_bytes,
        media_type=submission.media_type
    )

@router.post("/{submission_id}/like")
def like_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
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
            detail="Submission not found"
        )

    existing_like = (
        db.query(PostLike)
        .filter(
            PostLike.submission_id == submission_id,
            PostLike.user_id == current_user.id
        )
        .first()
    )

    if existing_like:
        raise HTTPException(
            status_code=400,
            detail="You have already liked this post"
        )

    new_like = PostLike(
        submission_id=submission_id,
        user_id=current_user.id
    )

    db.add(new_like)
    db.commit()

    like_count = (
        db.query(PostLike)
        .filter(PostLike.submission_id == submission_id)
        .count()
    )

    return {
        "message": "Post liked successfully",
        "submission_id": submission_id,
        "like_count": like_count
    }


@router.delete("/{submission_id}/like")
def unlike_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    like = (
        db.query(PostLike)
        .filter(
            PostLike.submission_id == submission_id,
            PostLike.user_id == current_user.id
        )
        .first()
    )

    if not like:
        raise HTTPException(
            status_code=400,
            detail="You have not liked this post"
        )

    db.delete(like)
    db.commit()

    like_count = (
        db.query(PostLike)
        .filter(PostLike.submission_id == submission_id)
        .count()
    )

    return {
        "message": "Post unliked successfully",
        "submission_id": submission_id,
        "like_count": like_count
    }

@router.get("/{submission_id}/likes")
def get_submission_likes(
    submission_id: int,
    credentials: HTTPAuthorizationCredentials | None = Depends(
        HTTPBearer(auto_error=False)
    ),
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
            detail="Submission not found"
        )

    like_count = (
        db.query(PostLike)
        .filter(
            PostLike.submission_id == submission_id
        )
        .count()
    )

    user_id = None

    if credentials:
        payload = decode_access_token(credentials.credentials)

        if payload:
            user_id = payload.get("user_id")

    user_like = None

    if user_id:
        user_like = (
            db.query(PostLike)
            .filter(
                PostLike.submission_id == submission_id,
                PostLike.user_id == user_id
            )
            .first()
        )

    return {
        "submission_id": submission_id,
        "like_count": like_count,
        "liked_by_user": user_like is not None
    }


COMMENT_PRESETS = {
    "positive": [
        "Amazing work! Loved the creativity here.",
        "Brilliant effort, keep up the fantastic work!",
        "So inspiring! Truly exceptional talent.",
        "Beautifully done, this really made my day!",
        "Outstanding presentation and great attention to detail!",
        "Amazing work! Keep shining!",
        "Fantastic creativity and brilliant execution!",
        "Outstanding effort, absolutely loved this!",
        "Super talented! This is truly wonderful.",
        "Exceptionally beautiful and well thought out!",
        "Masterpiece! Really proud of your work!",
    ],
    "satisfactory": [
        "Good effort, keep practicing!",
        "Nice attempt, you are definitely on the right track.",
        "Well done! Looking forward to seeing your next piece.",
        "Good work! Practice will make it even better.",
        "Good effort! Keep it up!",
        "Nicely done! Shows good potential.",
        "Great attempt, nicely presented!",
        "Neat work! You are on the right track.",
        "Well executed, good attention to detail.",
    ],
    "motivating": [
        "Good attempt, keep practicing and you will get better!",
        "Every mistake is a stepping stone to mastery. Keep pushing!",
        "Unique idea! With a little more polish, it will shine.",
        "Keep trying, persistence leads to greatness!",
        "Never give up, you learn something new with every attempt!",
        "Great start! Keep practicing and you will get even better.",
        "Good attempt! Focus on the finer details next time.",
        "Don't stop here, every practice makes you stronger!",
    ],
}


def normalize_preset_category(category: str) -> str | None:
    cat = (category or "").strip().lower()
    if cat in ("positive",):
        return "positive"
    if cat in ("satisfactory",):
        return "satisfactory"
    if cat in ("motivating", "negetive(motivating)", "negative", "negative(motivating)", "negetive"):
        return "motivating"
    return None


@router.get("/comment-presets")
def get_comment_presets():
    return {
        "presets": COMMENT_PRESETS,
        "categories": [
            {
                "id": "positive",
                "label": "Positive",
                "icon": "🌟",
                "description": "Appreciative and inspiring feedback",
                "options": COMMENT_PRESETS["positive"]
            },
            {
                "id": "satisfactory",
                "label": "Satisfactory",
                "icon": "👍",
                "description": "Constructive and acknowledging feedback",
                "options": COMMENT_PRESETS["satisfactory"]
            },
            {
                "id": "motivating",
                "label": "Negative (Motivating)",
                "icon": "💪",
                "description": "Encouraging persistence and growth",
                "options": COMMENT_PRESETS["motivating"]
            }
        ]
    }


@router.get("/{submission_id}/comments")
def get_submission_comments(
    submission_id: int,
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
            detail="Submission not found"
        )

    comments = (
        db.query(PostComment, User)
        .join(User, User.id == PostComment.user_id)
        .filter(PostComment.submission_id == submission_id)
        .order_by(PostComment.created_at.desc())
        .all()
    )

    results = []
    for comment, user in comments:
        results.append({
            "id": comment.id,
            "submission_id": comment.submission_id,
            "user_id": comment.user_id,
            "user_name": user.name,
            "profile_picture": user.profile_picture,
            "category": comment.category,
            "comment_text": comment.comment_text,
            "created_at": (
                comment.created_at.strftime("%Y-%m-%dT%H:%M:%SZ")
                if comment.created_at
                else None
            ),
        })

    return {
        "submission_id": submission_id,
        "count": len(results),
        "comments": results
    }


@router.post("/{submission_id}/comments")
def add_submission_comment(
    submission_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
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
            detail="Submission not found"
        )

    normalized_cat = normalize_preset_category(comment_data.category)
    if not normalized_cat or normalized_cat not in COMMENT_PRESETS:
        raise HTTPException(
            status_code=400,
            detail="Invalid comment category. Allowed: positive, satisfactory, or negetive(motivating)."
        )

    clean_text = comment_data.comment_text.strip()
    allowed_list = COMMENT_PRESETS[normalized_cat]

    # Look for matching preset in the target category (normalized comparison)
    matched_preset = next((p for p in allowed_list if p.strip().lower() == clean_text.lower()), None)

    # If not found in target category, search all categories
    if not matched_preset:
        for cat_key, preset_list in COMMENT_PRESETS.items():
            matched = next((p for p in preset_list if p.strip().lower() == clean_text.lower()), None)
            if matched:
                matched_preset = matched
                normalized_cat = cat_key
                break

    if not matched_preset:
        raise HTTPException(
            status_code=400,
            detail="Only fixed preset comments can be used."
        )

    new_comment = PostComment(
        submission_id=submission_id,
        user_id=current_user.id,
        category=normalized_cat,
        comment_text=matched_preset
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    # Notify author if not commenting on own submission
    if submission.user_id != current_user.id:
        try:
            notification = Notification(
                user_id=submission.user_id,
                submission_id=submission.id,
                notification_type="new_comment",
                title="New comment on your post",
                message=f'{current_user.name} commented on your post: "{matched_preset}"'
            )
            db.add(notification)
            db.commit()
        except Exception as e:
            print("Failed to dispatch comment notification:", e)

    count = (
        db.query(PostComment)
        .filter(PostComment.submission_id == submission_id)
        .count()
    )

    return {
        "message": "Comment posted successfully",
        "comment": {
            "id": new_comment.id,
            "submission_id": new_comment.submission_id,
            "user_id": new_comment.user_id,
            "user_name": current_user.name,
            "profile_picture": current_user.profile_picture,
            "category": new_comment.category,
            "comment_text": new_comment.comment_text,
            "created_at": (
                new_comment.created_at.strftime("%Y-%m-%dT%H:%M:%SZ")
                if new_comment.created_at
                else None
            ),
        },
        "count": count
    }


@router.delete("/{submission_id}/comments/{comment_id}")
def delete_submission_comment(
    submission_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = (
        db.query(PostComment)
        .filter(
            PostComment.id == comment_id,
            PostComment.submission_id == submission_id
        )
        .first()
    )

    if not comment:
        raise HTTPException(
            status_code=404,
            detail="Comment not found"
        )

    if comment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own comment"
        )

    # Remove corresponding notification if present
    try:
        orphan_notification = (
            db.query(Notification)
            .filter(
                Notification.submission_id == submission_id,
                Notification.notification_type == "new_comment",
                Notification.message.like(f'%"{comment.comment_text}"%')
            )
            .first()
        )
        if orphan_notification:
            db.delete(orphan_notification)
    except Exception as e:
        print("Failed to remove comment notification:", e)

    db.delete(comment)
    db.commit()

    count = (
        db.query(PostComment)
        .filter(PostComment.submission_id == submission_id)
        .count()
    )

    return {
        "message": "Comment deleted successfully",
        "submission_id": submission_id,
        "count": count
    }
