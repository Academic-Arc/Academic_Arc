from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.user import User
from app.models.like import PostLike
from app.models.student import Student
from app.models.submission import Submission
from app.models.featured import SpecialFeature
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.student import router as student_router
from app.routes.featured import router as featured_router
from app.routes.submission import router as submission_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Academic Arc API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
                   "https://academicarc.in",
                   "https://www.academicarc.in"
                   ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(student_router)
app.include_router(featured_router)
app.include_router(submission_router)


@app.get("/")
def root():
    return {
        "message": "Academic Arc API is running"
    }