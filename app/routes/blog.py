import os
import re
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.limiter import limiter
from app.models.blog import Blog
from app.models.user import User
from app.models.student import Student
from app.schemas.blog import BlogCreate, BlogUpdate, BlogResponse
from app.services.auth import get_current_admin
from app.supabase import supabase


router = APIRouter(
    prefix="/blogs",
    tags=["Blogs"]
)


def make_unique_slug(db: Session, base_text: str, blog_id: Optional[int] = None) -> str:
    cleaned = re.sub(r'[^\w\s-]', '', base_text.lower()).strip()
    slug = re.sub(r'[-\s]+', '-', cleaned)
    if not slug or len(slug) < 2:
        slug = f"blog-{uuid.uuid4().hex[:8]}"

    counter = 1
    candidate = slug
    while True:
        query = db.query(Blog).filter(Blog.slug == candidate)
        if blog_id:
            query = query.filter(Blog.id != blog_id)
        if not query.first():
            return candidate
        counter += 1
        candidate = f"{slug}-{counter}"


# ==========================================
# PUBLIC ENDPOINTS
# ==========================================

@router.get("/")
@limiter.limit("60/minute")
def get_published_blogs(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get editorial blog articles for the home page showcase directly from database.
    Returns the cover story, sidebar articles ('Read More'), and current issue label.
    """
    # 1. Fetch cover story
    cover_story = (
        db.query(Blog)
        .filter(Blog.is_published == True, Blog.is_cover_story == True)
        .order_by(Blog.created_at.desc())
        .first()
    )

    if not cover_story:
        cover_story = (
            db.query(Blog)
            .filter(Blog.is_published == True)
            .order_by(Blog.created_at.desc())
            .first()
        )

    # 2. Fetch sidebar articles
    sidebar_query = db.query(Blog).filter(Blog.is_published == True)
    if cover_story:
        sidebar_query = sidebar_query.filter(Blog.id != cover_story.id)

    articles = (
        sidebar_query
        .order_by(Blog.created_at.desc())
        .limit(6)
        .all()
    )

    issue_label = cover_story.issue_label if cover_story else ""

    def serialize_blog(b: Blog):
        if not b:
            return None
        return {
            "id": b.id,
            "title": b.title,
            "slug": b.slug,
            "excerpt": b.excerpt,
            "category": b.category,
            "cover_image_url": b.cover_image_url,
            "is_cover_story": b.is_cover_story,
            "issue_label": b.issue_label,
            "published_date": b.published_date,
            "read_time": b.read_time,
            "author_name": b.author_name,
            "view_count": b.view_count,
            "created_at": b.created_at.isoformat() if b.created_at else None
        }

    return {
        "issue_label": issue_label,
        "cover_story": serialize_blog(cover_story),
        "articles": [serialize_blog(a) for a in articles]
    }


@router.get("/{id_or_slug}")
@limiter.limit("60/minute")
def get_single_blog(
    id_or_slug: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Fetch full blog article by ID or slug. Increments view count safely.
    """
    query = db.query(Blog)
    if id_or_slug.isdigit():
        blog = query.filter(Blog.id == int(id_or_slug)).first()
    else:
        blog = query.filter(Blog.slug == id_or_slug).first()

    if not blog or not blog.is_published:
        raise HTTPException(status_code=404, detail="Blog post not found.")

    blog.view_count += 1
    db.commit()

    related = (
        db.query(Blog)
        .filter(Blog.is_published == True, Blog.id != blog.id)
        .order_by(Blog.created_at.desc())
        .limit(3)
        .all()
    )

    return {
        "id": blog.id,
        "title": blog.title,
        "slug": blog.slug,
        "excerpt": blog.excerpt,
        "content": blog.content,
        "category": blog.category,
        "cover_image_url": blog.cover_image_url,
        "is_cover_story": blog.is_cover_story,
        "issue_label": blog.issue_label,
        "published_date": blog.published_date,
        "read_time": blog.read_time,
        "author_name": blog.author_name,
        "view_count": blog.view_count,
        "created_at": blog.created_at.isoformat() if blog.created_at else None,
        "related": [
            {
                "id": r.id,
                "title": r.title,
                "slug": r.slug,
                "category": r.category,
                "published_date": r.published_date,
                "cover_image_url": r.cover_image_url
            }
            for r in related
        ]
    }


# ==========================================
# ADMIN SECURED ENDPOINTS
# ==========================================

@router.get("/admin/all")
@limiter.limit("30/minute")
def get_all_blogs_admin(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin list of all blogs from database (including drafts and unpublished articles).
    """
    return db.query(Blog).order_by(Blog.created_at.desc()).all()


@router.post("/admin/upload-image")
@limiter.limit("20/minute")
async def upload_blog_image(
    request: Request,
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin)
):
    """
    Admin: upload cover image file directly to Supabase storage.
    """
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, and GIF images are allowed.")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be 10MB or smaller.")

    file_extension = os.path.splitext(file.filename)[1].lower() or ".jpg"
    file_name = f"blog_{uuid.uuid4().hex}{file_extension}"

    try:
        supabase.storage.from_("submissions").upload(
            path=file_name,
            file=file_bytes,
            file_options={
                "content-type": file.content_type,
                "upsert": "false"
            }
        )
        public_url = supabase.storage.from_("submissions").get_public_url(file_name)
        return {"url": public_url}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(err)}")


@router.post("/admin/")
@limiter.limit("20/minute")
def create_blog_admin(
    payload: BlogCreate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin: upload / publish a new blog article into database.
    """
    slug = payload.slug
    if not slug:
        slug = make_unique_slug(db, payload.title)
    else:
        slug = make_unique_slug(db, slug)

    if payload.is_cover_story:
        db.query(Blog).filter(
            Blog.issue_label == payload.issue_label,
            Blog.is_cover_story == True
        ).update({"is_cover_story": False})

    new_blog = Blog(
        title=payload.title,
        slug=slug,
        excerpt=payload.excerpt,
        content=payload.content,
        category=payload.category,
        cover_image_url=payload.cover_image_url,
        is_cover_story=payload.is_cover_story,
        issue_label=payload.issue_label or "JUNE 2026 • ISSUE 14",
        published_date=payload.published_date or datetime.utcnow().strftime("%B %d, %Y"),
        read_time=payload.read_time or "5 min read",
        author_name=payload.author_name or admin.name,
        is_published=payload.is_published
    )

    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)

    return new_blog


@router.put("/admin/{blog_id}")
@limiter.limit("20/minute")
def update_blog_admin(
    blog_id: int,
    payload: BlogUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin: update existing blog post.
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog post not found.")

    update_data = payload.model_dump(exclude_unset=True)

    if "title" in update_data and "slug" not in update_data and not blog.slug:
        update_data["slug"] = make_unique_slug(db, update_data["title"], blog.id)
    elif "slug" in update_data and update_data["slug"]:
        update_data["slug"] = make_unique_slug(db, update_data["slug"], blog.id)

    if update_data.get("is_cover_story"):
        target_issue = update_data.get("issue_label", blog.issue_label)
        db.query(Blog).filter(
            Blog.issue_label == target_issue,
            Blog.id != blog.id,
            Blog.is_cover_story == True
        ).update({"is_cover_story": False})

    for key, value in update_data.items():
        setattr(blog, key, value)

    blog.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(blog)

    return blog


@router.delete("/admin/{blog_id}")
@limiter.limit("20/minute")
def delete_blog_admin(
    blog_id: int,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin: delete blog post securely.
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog post not found.")

    db.delete(blog)
    db.commit()

    return {"message": "Blog post successfully deleted", "id": blog_id}
