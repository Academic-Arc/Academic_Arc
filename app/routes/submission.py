import uuid
import asyncio
from playwright.async_api import async_playwright

from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import Response

from app.supabase import supabase

from app.database import get_db
from app.models.submission import Submission
from app.schemas.submission import SubmissionCreate, SubmissionUpdate

from app.models.user import User
from app.models.like import PostLike
from app.models.student import Student

from app.services.auth import get_current_user, decode_access_token

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from urllib.parse import urlparse

router = APIRouter(
    prefix="/submissions",
    tags=["Submissions"]
)

facebook_playwright = None
facebook_browser = None
facebook_browser_lock = asyncio.Lock()

async def get_facebook_browser():
    global facebook_playwright
    global facebook_browser

    if facebook_browser:
        return facebook_browser

    async with facebook_browser_lock:

        if facebook_browser:
            return facebook_browser

        facebook_playwright = await async_playwright().start()

        facebook_browser = await facebook_playwright.chromium.launch(
            headless=True
        )

        print("FACEBOOK PLAYWRIGHT BROWSER STARTED")

        return facebook_browser

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
        student_class=submission_data.student_class,
        heading=submission_data.heading,
        description=submission_data.description,
        written_content=submission_data.written_content,
        media_url=submission_data.media_url,
        media_type=submission_data.media_type
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
    file_extension = file.filename.split(".")[-1]

    # Generate unique filename
    file_name = f"{uuid.uuid4()}.{file_extension}"

    # Read file
    file_bytes = await file.read()

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

    submissions = db.query(Submission).filter(
        Submission.user_id == user_id
    ).all()

    results = []

    for submission in submissions:

        results.append({
            "id": submission.id,
            "content_type": submission.content_type,
            "user_id": submission.user_id,
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

    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.user_id == user_id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found or you do not have permission to edit it."
        )

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
    submission.student_class = submission_data.student_class
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
        db.query(Submission, Student)
        .join(Student, Student.user_id == Submission.user_id)
        .all()
    )

    results = []

    for submission, student in submissions:
        results.append({
            "id": submission.id,
            "content_type": submission.content_type,
            "user_id": submission.user_id,
            "student_name": student.user.name,
            "student_class": submission.student_class,
            "school": student.school,
            "profile_picture": student.user.profile_picture,
            "heading": submission.heading,
            "description": submission.description,
            "written_content": submission.written_content,
            "media_url": submission.media_url,
            "media_type": submission.media_type,
            "created_at": submission.created_at,
        })

    return results


@router.get("/facebook-embed")
async def get_facebook_embed(
    url: str
):
    if not validate_external_url(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid Facebook URL."
        )

    if "facebook.com" not in url and "fb.watch" not in url:
        raise HTTPException(
            status_code=400,
            detail="Only Facebook URLs are supported."
        )

    context = None
    page = None

    try:
        browser = await get_facebook_browser()

        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/140.0.0.0 Safari/537.36"
            )
        )

        page = await context.new_page()

        await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=30000
        )

        # Facebook may perform the redirect with JavaScript.
        # Only wait if we are still on the share URL.
        if "/share/" in page.url:

            for _ in range(50):
                await page.wait_for_timeout(100)

                if "/share/" not in page.url:
                    break

        final_url = page.url

        print("FACEBOOK ORIGINAL URL:", url)
        print("FACEBOOK FINAL URL:", final_url)

        if "/share/" in final_url:
            raise HTTPException(
                status_code=400,
                detail="Facebook did not resolve the share link."
            )

        return {
            "url": final_url
        }

    except HTTPException:
        raise

    except Exception as e:
        print("Facebook Playwright error:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Failed to resolve Facebook video."
        )

    finally:
        if page:
            await page.close()

        if context:
            await context.close()

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