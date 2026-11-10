import secrets

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import User


def login(db: Session, username: str, password: str) -> User:
    user = db.scalar(select(User).where(User.username == username.strip().lower()))
    # compare_digest on bytes: constant-time and safe for non-ASCII input.
    if user is None or not secrets.compare_digest(
        user.password.encode(), password.encode()
    ):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.token:
        user.token = secrets.token_hex(32)
        db.commit()
    return user


def current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not logged in")
    token = authorization[7:].strip()
    user = db.scalar(select(User).where(User.token == token)) if token else None
    if user is None:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    return user
