import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal

from fastapi import Depends, FastAPI, File, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import auth
from .access import get_doc_for, role_for
from .auth import current_user
from .db import Base, SessionLocal, engine, get_db
from .importers import MAX_BYTES, FileImportError, file_to_html, title_from_filename
from .models import Document, Share, User
from .seed import seed

DEFAULT_TITLE = "Untitled document"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # engine / SessionLocal are module globals so tests can monkeypatch main.engine etc.
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="Ajaia Docs API", lifespan=lifespan)

_origins = [o.strip().rstrip("/") for o in os.getenv("FRONTEND_ORIGIN", "").split(",") if o.strip()]
_origins += ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas ----------

class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    display_name: str


class DocSummary(BaseModel):
    id: int
    title: str
    owner: UserOut
    role: Literal["owner", "editor", "viewer"]
    updated_at: datetime


class DocOut(DocSummary):
    content_html: str


class DocCreate(BaseModel):
    title: str = Field(default="", max_length=200)


class DocUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content_html: str | None = Field(default=None, max_length=1_000_000)


class ShareIn(BaseModel):
    username: str
    role: Literal["viewer", "editor"] = "viewer"


class ShareOut(BaseModel):
    user: UserOut
    role: Literal["viewer", "editor"]


def _summary(doc: Document, role: str) -> DocSummary:
    updated = doc.updated_at
    if updated.tzinfo is None:  # SQLite drops tzinfo; values are stored as UTC
        updated = updated.replace(tzinfo=timezone.utc)
    return DocSummary(
        id=doc.id, title=doc.title, owner=UserOut.model_validate(doc.owner),
        role=role, updated_at=updated,
    )


def _out(doc: Document, role: str) -> DocOut:
    return DocOut(**_summary(doc, role).model_dump(), content_html=doc.content_html)


def _share_out(share: Share) -> ShareOut:
    return ShareOut(user=UserOut.model_validate(share.user), role=share.role)


def _user_by_name(db: Session, username: str) -> User:
    name = username.strip().lower()
    user = db.scalar(select(User).where(User.username == name))
    if user is None:
        raise HTTPException(status_code=404, detail=f"No user named '{name}'")
    return user


# ---------- Routes ----------

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = auth.login(db, body.username, body.password)
    return {"token": user.token, "user": UserOut.model_validate(user)}


@app.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@app.get("/users", response_model=list[UserOut])
def list_users(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.username)).all()


@app.get("/documents")
def list_documents(user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned = db.scalars(
        select(Document).where(Document.owner_id == user.id).order_by(Document.updated_at.desc())
    ).all()
    shared_rows = db.execute(
        select(Document, Share.role)
        .join(Share, Share.document_id == Document.id)
        .where(Share.user_id == user.id)
        .order_by(Document.updated_at.desc())
    ).all()
    return {
        "owned": [_summary(d, "owner") for d in owned],
        "shared": [_summary(d, role) for d, role in shared_rows],
    }


@app.post("/documents", response_model=DocOut, status_code=status.HTTP_201_CREATED)
def create_document(
    body: DocCreate, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    doc = Document(title=body.title.strip() or DEFAULT_TITLE, content_html="<p></p>", owner=user)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _out(doc, "owner")


@app.post("/documents/import", response_model=DocOut, status_code=status.HTTP_201_CREATED)
async def import_document(
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    # Read one byte past the limit so oversize files are detected without reading it all.
    data = await file.read(MAX_BYTES + 1)
    try:
        content = file_to_html(file.filename or "", data)
    except FileImportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    doc = Document(title=title_from_filename(file.filename or ""), content_html=content, owner=user)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _out(doc, "owner")


@app.get("/documents/{doc_id}", response_model=DocOut)
def get_document(doc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    doc, role = get_doc_for(db, doc_id, user, "view")
    return _out(doc, role)


@app.patch("/documents/{doc_id}", response_model=DocOut)
def update_document(
    doc_id: int, body: DocUpdate,
    user: User = Depends(current_user), db: Session = Depends(get_db),
):
    doc, role = get_doc_for(db, doc_id, user, "edit")
    if body.title is not None:
        title = body.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        doc.title = title
    if body.content_html is not None:
        doc.content_html = body.content_html
    db.commit()
    db.refresh(doc)
    return _out(doc, role)


@app.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(doc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    doc, _ = get_doc_for(db, doc_id, user, "own")
    db.delete(doc)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/documents/{doc_id}/shares", response_model=list[ShareOut])
def list_shares(doc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    doc, _ = get_doc_for(db, doc_id, user, "view")
    return [_share_out(s) for s in doc.shares]


@app.post("/documents/{doc_id}/shares", response_model=ShareOut, status_code=status.HTTP_201_CREATED)
def add_share(
    doc_id: int, body: ShareIn, response: Response,
    user: User = Depends(current_user), db: Session = Depends(get_db),
):
    doc, _ = get_doc_for(db, doc_id, user, "own")
    target = _user_by_name(db, body.username)
    if target.id == doc.owner_id:
        raise HTTPException(status_code=400, detail="The owner already has full access")
    existing = next((s for s in doc.shares if s.user_id == target.id), None)
    if existing:
        existing.role = body.role
        response.status_code = status.HTTP_200_OK
        share = existing
    else:
        share = Share(user=target, role=body.role)
        doc.shares.append(share)
    db.commit()
    return _share_out(share)


@app.delete("/documents/{doc_id}/shares/{username}", status_code=status.HTTP_204_NO_CONTENT)
def remove_share(
    doc_id: int, username: str,
    user: User = Depends(current_user), db: Session = Depends(get_db),
):
    doc, _ = get_doc_for(db, doc_id, user, "own")
    target = _user_by_name(db, username)
    share = next((s for s in doc.shares if s.user_id == target.id), None)
    if share is None:
        raise HTTPException(status_code=404, detail=f"Document is not shared with '{target.username}'")
    doc.shares.remove(share)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
