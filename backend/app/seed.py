from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Document, Share, User

DEMO_PASSWORD = "demo123"
DEMO_USERS = [
    ("alice", "Alice Owner"),
    ("bob", "Bob Builder"),
    ("carol", "Carol Chen"),
]

WELCOME_HTML = (
    "<h1>Welcome to Ajaia Docs</h1>"
    "<p>This is a <strong>shared</strong> document. Try <em>editing</em> it, "
    "<u>formatting</u> text, and sharing it with others.</p>"
    "<ul><li>Changes save automatically.</li>"
    "<li>Use the Share button to invite a viewer or editor.</li></ul>"
)


def seed(db: Session) -> None:
    """Insert demo users and a welcome doc, only into an empty database."""
    if db.scalar(select(User.id).limit(1)) is not None:
        return

    users = {
        username: User(username=username, display_name=name, password=DEMO_PASSWORD)
        for username, name in DEMO_USERS
    }
    db.add_all(users.values())
    db.flush()

    welcome = Document(
        title="Welcome to Ajaia Docs", content_html=WELCOME_HTML, owner=users["alice"]
    )
    welcome.shares.append(Share(user=users["bob"], role="editor"))
    db.add(welcome)
    db.commit()
