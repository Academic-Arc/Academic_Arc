from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from starlette.middleware.base import BaseHTTPMiddleware

from app.database import Base, engine
from app.models.user import User
from app.models.like import PostLike
from app.models.report import Report
from app.models.student import Student
from app.models.submission import Submission
from app.models.featured import SpecialFeature
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.report import router as report_router
from app.routes.student import router as student_router
from app.routes.featured import router as featured_router
from app.routes.submission import router as submission_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Academic Arc API"
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response


app.add_middleware(SecurityHeadersMiddleware)

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
                   "https://academicarc.in",
                   "https://www.academicarc.in"
                   ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(report_router)
app.include_router(student_router)
app.include_router(featured_router)
app.include_router(submission_router)


@app.get("/")
def root():
    return {
        "message": "Academic Arc API is running"
    }

@app.get("/health")
def health():
    return {
        "status": "ok"
    }