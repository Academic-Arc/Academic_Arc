import secrets

from app.database import SessionLocal
from app.models.submission import Submission
from app.models.user import User
from app.models.student import Student


db = SessionLocal()

try:
    submissions = db.query(Submission).filter(
        Submission.share_token == None
    ).all()

    for submission in submissions:
        submission.share_token = secrets.token_urlsafe(16)

    db.commit()

    print(
        f"Generated share tokens for "
        f"{len(submissions)} submissions."
    )

finally:
    db.close()