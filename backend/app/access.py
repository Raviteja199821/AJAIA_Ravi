"""All document permission rules live here.

Roles, lowest to highest: viewer < editor < owner.
- No access (or missing doc) -> 404, so we never reveal that a document exists.
- Access but role too low   -> 403.
"""

from typing import Literal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import Document, User

Role = Literal["owner", "editor", "viewer"]
Need = Literal["view", "edit", "own"]

_RANK = {"viewer": 1, "editor": 2, "owner": 3}
_REQUIRED = {"view": 1, "edit": 2, "own": 3}


def role_for(doc: Document, user: User) -> Role | None:
    if doc.owner_id == user.id:
        return "owner"
    for share in doc.shares:
        if share.user_id == user.id:
            return share.role  # type: ignore[return-value]
    return None


def get_doc_for(db: Session, doc_id: int, user: User, need: Need = "view") -> tuple[Document, Role]:
    doc = db.get(Document, doc_id)
    role = role_for(doc, user) if doc else None
    if doc is None or role is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if _RANK[role] < _REQUIRED[need]:
        raise HTTPException(status_code=403, detail=f"You need {need} access for this action")
    return doc, role
